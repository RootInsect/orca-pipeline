import { createGhExec, createOrcaExec, dryRunExec } from './orca-exec'
import { tickTask } from './stage-runner'
import { listTasks, saveTask } from './task-store'
import { loadPipelineTemplate } from './templates'
import type { GhExec, OrcaExec, PipelineConfig, PipelineTask } from './types'

export type SchedulerDeps = {
  orca?: OrcaExec
  gh?: GhExec
}

export type SchedulerTickSummary = {
  scanned: number
  changed: number
  results: { id: string; stage: string; status: string; events: string[] }[]
}

function buildExec(config: PipelineConfig, deps: SchedulerDeps): { orca: OrcaExec; gh: GhExec } {
  if (deps.orca && deps.gh) {
    return { orca: deps.orca, gh: deps.gh }
  }
  if (config.dry_run) {
    return { orca: dryRunExec('pipeline'), gh: dryRunExec('gh') }
  }
  return {
    orca: deps.orca ?? createOrcaExec(config.orca_command),
    gh: deps.gh ?? createGhExec()
  }
}

export async function runSchedulerOnce(
  config: PipelineConfig,
  deps: SchedulerDeps = {}
): Promise<SchedulerTickSummary> {
  const { orca, gh } = buildExec(config, deps)
  const tasks = await listTasks(config.tasks_dir)
  const results: SchedulerTickSummary['results'] = []
  let changed = 0
  for (const task of tasks) {
    if (task.status === 'done' || task.status === 'failed') {
      results.push({
        id: task.id,
        stage: task.stage,
        status: task.status,
        events: []
      })
      continue
    }
    const template = await loadPipelineTemplate(task.template_id)
    const before = JSON.stringify(task)
    const { task: next, events } = await tickTask({ task, template, config, orca, gh })
    if (JSON.stringify(next) !== before) {
      await saveTask(config.tasks_dir, next)
      changed += 1
    }
    results.push({
      id: next.id,
      stage: next.stage,
      status: next.status,
      events
    })
  }
  return { scanned: tasks.length, changed, results }
}

export async function runSchedulerLoop(
  config: PipelineConfig,
  options: { intervalMs?: number; signal?: AbortSignal; deps?: SchedulerDeps } = {}
): Promise<void> {
  const intervalMs = options.intervalMs ?? config.poll_interval_ms
  while (!options.signal?.aborted) {
    await runSchedulerOnce(config, options.deps)
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => resolve(), intervalMs)
      options.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timer)
          resolve()
        },
        { once: true }
      )
    })
  }
}

export function pickActiveTasks(tasks: PipelineTask[]): PipelineTask[] {
  return tasks.filter(
    (task) => task.status === 'active' || task.status === 'queued' || task.status === 'blocked'
  )
}
