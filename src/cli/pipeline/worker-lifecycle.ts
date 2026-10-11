import { resolveAgentForStage, rememberRoleAgents, buildWorkerSpec } from './agents'
import { extractPrUrl } from './ci'
import { readJsonField, type OrcaExec } from './orca-exec'
import { isRecord, parseStage } from './parse-helpers'
import { touchTask } from './task-store'
import { nextTemplateStage, stageDefinition } from './templates'
import type { PipelineConfig, PipelineStage, PipelineTask, PipelineTemplate } from './types'

export function advanceTo(
  task: PipelineTask,
  template: PipelineTemplate,
  stage: PipelineStage,
  note?: string
): PipelineTask {
  const notes = note ? [...task.notes, note] : task.notes
  if (stage === 'done') {
    return touchTask(task, {
      stage: 'done',
      status: 'done',
      notes,
      runner: { phase: 'idle', role: null, agent: null, blocker: null, last_error: null }
    })
  }
  const def = stageDefinition(template, stage)
  return touchTask(task, {
    stage,
    status: 'active',
    notes,
    runner: {
      phase: 'idle',
      role: def?.role ?? null,
      agent: null,
      blocker: null,
      last_error: null
    }
  })
}

export function gotoFromOnFail(
  task: PipelineTask,
  template: PipelineTemplate,
  onFail: string
): PipelineTask {
  if (onFail.startsWith('goto:')) {
    const targetName = onFail.slice('goto:'.length)
    const target = parseStage(targetName, task.stage)
    if (target !== targetName) {
      return touchTask(task, {
        runner: {
          ...task.runner,
          phase: 'idle',
          last_error: `invalid on_fail target ${targetName}`
        }
      })
    }
    return advanceTo(task, template, target, `on_fail → ${target}`)
  }
  if (onFail === 'escalate') {
    return touchTask(task, {
      status: 'blocked',
      runner: {
        ...task.runner,
        phase: 'blocked_human',
        blocker: 'escalated by template on_fail'
      }
    })
  }
  return touchTask(task, {
    runner: { ...task.runner, phase: 'idle', last_error: `retry after fail (${onFail})` }
  })
}

async function ensureRun(
  task: PipelineTask,
  orca: OrcaExec,
  events: string[]
): Promise<PipelineTask> {
  if (task.orca.run_id) {
    return task
  }
  const result = await orca([
    'orchestration',
    'run-create',
    '--objective',
    `pipeline:${task.id} ${task.title}`,
    '--json'
  ])
  const runId = readJsonField(result.json, 'id') || readJsonField(result.json, 'runId')
  if (!result.ok || !runId) {
    throw new Error(`run-create failed: ${result.stderr || result.stdout}`)
  }
  events.push(`run-create ${runId}`)
  return touchTask(task, { orca: { ...task.orca, run_id: runId } })
}

export async function startWorker(input: {
  task: PipelineTask
  template: PipelineTemplate
  config: PipelineConfig
  orca: OrcaExec
  events: string[]
}): Promise<PipelineTask> {
  const { template, config, orca, events } = input
  let task = input.task
  const stage = stageDefinition(template, task.stage)
  if (!stage) {
    throw new Error(`No template stage for ${task.stage}`)
  }
  task = await ensureRun(task, orca, events)
  const agent = resolveAgentForStage(task, stage, config)
  const spec = buildWorkerSpec(task, stage)
  const args = [
    'orchestration',
    'worker-start',
    '--spec',
    spec,
    '--worktree',
    task.orca.worktree_id ? task.orca.worktree_id : 'current',
    '--agent',
    agent,
    ...(task.orca.run_id ? ['--run', task.orca.run_id] : []),
    '--json'
  ]
  const result = await orca(args)
  const dispatchId =
    readJsonField(result.json, 'dispatchId') ||
    readJsonField(result.json, 'dispatch_id') ||
    readJsonField(result.json, 'id')
  const orchTaskId = readJsonField(result.json, 'taskId') || readJsonField(result.json, 'task_id')
  if (!result.ok || !dispatchId) {
    throw new Error(`worker-start failed: ${result.stderr || result.stdout}`)
  }
  events.push(`worker-start ${stage.name} agent=${agent} dispatch=${dispatchId}`)
  return touchTask(task, {
    orca: {
      ...rememberRoleAgents(task, stage.role, agent),
      last_dispatch_id: dispatchId,
      last_orch_task_id: orchTaskId
    },
    runner: {
      phase: 'awaiting_worker',
      role: stage.role,
      agent,
      blocker: null,
      last_error: null
    }
  })
}

function workerSucceeded(json: unknown): boolean | null {
  if (!isRecord(json)) {
    return null
  }
  const outcome = json.outcome
  if (outcome === 'succeeded' || outcome === 'success') {
    return true
  }
  if (outcome === 'failed' || outcome === 'failure') {
    return false
  }
  const report = json.report
  if (isRecord(report)) {
    if (report.outcome === 'succeeded') {
      return true
    }
    if (report.outcome === 'failed') {
      return false
    }
  }
  const liveness =
    readJsonField(json, 'projection', 'liveness', 'verdict') ||
    readJsonField(json, 'observation', 'status')
  if (liveness === 'live' || liveness === 'unverifiable') {
    return null
  }
  if (liveness === 'exited') {
    return outcome !== 'failed'
  }
  return null
}

export async function pollWorker(input: {
  task: PipelineTask
  template: PipelineTemplate
  orca: OrcaExec
  events: string[]
}): Promise<PipelineTask> {
  const { template, orca, events } = input
  let task = input.task
  const dispatchId = task.orca.last_dispatch_id
  if (!dispatchId) {
    return touchTask(task, { runner: { ...task.runner, phase: 'idle' } })
  }
  const result = await orca(['orchestration', 'worker-show', '--dispatch', dispatchId, '--json'])
  const verdict = workerSucceeded(result.json)
  if (verdict === null) {
    events.push(`worker still running (${dispatchId})`)
    return task
  }
  const stage = stageDefinition(template, task.stage)
  if (verdict) {
    events.push(`worker succeeded (${dispatchId})`)
    if (task.stage === 'open_pr') {
      const body =
        readJsonField(result.json, 'report', 'body') ||
        readJsonField(result.json, 'body') ||
        result.stdout
      const prUrl = extractPrUrl(body || '')
      if (prUrl) {
        task = touchTask(task, { pr_url: prUrl })
        events.push(`pr_url ${prUrl}`)
      } else if (!task.pr_url) {
        return touchTask(task, {
          status: 'blocked',
          runner: {
            ...task.runner,
            phase: 'blocked_human',
            blocker: 'open_pr worker finished without pr_url'
          }
        })
      }
    }
    const next = nextTemplateStage(template, task.stage)
    return advanceTo(task, template, next?.name ?? 'done', `completed ${task.stage}`)
  }
  events.push(`worker failed (${dispatchId})`)
  return gotoFromOnFail(task, template, stage?.on_fail || 'retry')
}
