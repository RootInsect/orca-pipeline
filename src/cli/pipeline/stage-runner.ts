import { pollPullRequestCi } from './ci'
import { writeTaskExperience } from './experience'
import { readJsonField, type GhExec, type OrcaExec } from './orca-exec'
import { touchTask } from './task-store'
import { nextTemplateStage } from './templates'
import type { PipelineConfig, PipelineTask, PipelineTemplate } from './types'
import { advanceTo, pollWorker, startWorker } from './worker-lifecycle'

export type TickResult = {
  task: PipelineTask
  events: string[]
}

function shouldSkipClarify(task: PipelineTask, config: PipelineConfig): boolean {
  const haystack = `${task.title}\n${task.body}`.toLowerCase()
  return config.auto_skip_clarify_keywords.some((keyword) =>
    haystack.includes(keyword.toLowerCase())
  )
}

async function runSetupEnv(input: {
  task: PipelineTask
  template: PipelineTemplate
  orca: OrcaExec
  events: string[]
}): Promise<PipelineTask> {
  const { template, orca, events } = input
  let task = input.task
  if (!task.orca.worktree_id) {
    const slug = task.id.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 40)
    const result = await orca(['worktree', 'create', '--name', slug, '--no-parent', '--json'])
    const worktreeId = readJsonField(result.json, 'id')
    if (!result.ok || !worktreeId) {
      throw new Error(`worktree create failed: ${result.stderr || result.stdout}`)
    }
    task = touchTask(task, { orca: { ...task.orca, worktree_id: worktreeId } })
    events.push(`worktree ${worktreeId}`)
  }
  const next = nextTemplateStage(template, 'setup_env')
  return advanceTo(task, template, next?.name ?? 'plan', 'setup_env ok')
}

async function handleAwaitingCi(input: {
  task: PipelineTask
  template: PipelineTemplate
  config: PipelineConfig
  gh: GhExec
  events: string[]
}): Promise<PipelineTask> {
  const { template, config, gh, events } = input
  let task = input.task
  const ci = await pollPullRequestCi({ task, gh, dryRun: config.dry_run })
  if (ci.state === 'green') {
    events.push('CI green')
    return advanceTo(task, template, 'experience', 'CI green')
  }
  if (ci.state === 'pending') {
    events.push(`CI pending: ${ci.summary}`)
    return task
  }
  if (ci.state === 'red') {
    const loops = task.ci_loops + 1
    if (loops > task.max_ci_loops) {
      events.push(`CI red; max_ci_loops=${task.max_ci_loops} exceeded`)
      return touchTask(task, {
        ci_loops: loops,
        status: 'failed',
        runner: {
          phase: 'idle',
          role: 'Orchestrator',
          agent: null,
          blocker: null,
          last_error: `CI failed after ${loops} loops: ${ci.summary}`
        }
      })
    }
    events.push(`CI red → develop (loop ${loops})`)
    task = touchTask(task, {
      ci_loops: loops,
      notes: [...task.notes, `CI red: ${ci.summary}`]
    })
    return advanceTo(task, template, 'develop', `ci fix loop ${loops}`)
  }
  events.push(`CI unknown: ${ci.summary}`)
  return task
}

export async function tickTask(input: {
  task: PipelineTask
  template: PipelineTemplate
  config: PipelineConfig
  orca: OrcaExec
  gh: GhExec
}): Promise<TickResult> {
  const { template, config, orca, gh } = input
  const events: string[] = []
  let task = input.task

  if (task.status === 'done' || task.status === 'failed') {
    return { task, events }
  }
  if (task.status === 'blocked' && task.runner.phase === 'blocked_human') {
    events.push(`blocked: ${task.runner.blocker || 'human'}`)
    return { task, events }
  }

  try {
    if (task.runner.phase === 'awaiting_worker') {
      task = await pollWorker({ task, template, orca, events })
      return { task, events }
    }
    if (task.runner.phase === 'awaiting_ci') {
      task = await handleAwaitingCi({ task, template, config, gh, events })
      return { task, events }
    }
    if (task.stage === 'classify') {
      task = advanceTo(task, template, 'setup_env')
      return { task, events }
    }
    if (task.stage === 'setup_env') {
      task = await runSetupEnv({ task, template, orca, events })
      return { task, events }
    }
    if (task.stage === 'clarify') {
      if (shouldSkipClarify(task, config)) {
        const next = nextTemplateStage(template, 'clarify')
        events.push('skip clarify: keywords matched')
        task = advanceTo(task, template, next?.name ?? 'plan', 'skip clarify: keywords matched')
        return { task, events }
      }
      task = touchTask(task, {
        status: 'blocked',
        runner: {
          phase: 'blocked_human',
          role: 'Orchestrator',
          agent: null,
          blocker:
            'clarify required — edit task body / notes then: orca pipeline unblock --task <id>',
          last_error: null
        }
      })
      events.push('blocked on clarify')
      return { task, events }
    }
    if (task.stage === 'cicd') {
      if (!task.pr_url) {
        task = touchTask(task, {
          status: 'blocked',
          runner: {
            phase: 'blocked_human',
            role: 'Orchestrator',
            agent: null,
            blocker: 'cicd needs pr_url',
            last_error: null
          }
        })
        return { task, events }
      }
      task = touchTask(task, {
        runner: {
          phase: 'awaiting_ci',
          role: 'Orchestrator',
          agent: null,
          blocker: null,
          last_error: null
        }
      })
      events.push('awaiting CI')
      return { task, events }
    }
    if (task.stage === 'experience') {
      const written = await writeTaskExperience({ task, config, finalStatus: 'done' })
      events.push(`experience ${written.path}`)
      task = touchTask(task, {
        experience: {
          ...task.experience,
          written: [...task.experience.written, written.path]
        }
      })
      task = advanceTo(task, template, 'done', 'experience written')
      return { task, events }
    }
    if (task.stage === 'done') {
      return { task, events }
    }
    task = await startWorker({ task, template, config, orca, events })
    return { task, events }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    events.push(`error: ${message}`)
    task = touchTask(task, {
      runner: { ...task.runner, last_error: message }
    })
    return { task, events }
  }
}
