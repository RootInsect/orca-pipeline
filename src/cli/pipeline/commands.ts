import { loadPipelineConfig, writePipelineConfig } from './config'
import { publishPipelineTask } from './create-task'
import { ensureExperienceRoot } from './experience'
import { formatConfig, formatTaskStatus, formatTaskTable } from './format'
import { defaultConfigPath } from './paths'
import { runSchedulerLoop, runSchedulerOnce } from './scheduler'
import { listTasks, loadTask, saveTask, touchTask } from './task-store'
import { nextTemplateStage, loadPipelineTemplate } from './templates'
import type { PipelineConfig } from './types'

export type CommandIo = {
  write: (text: string) => void
  writeError: (text: string) => void
  json: boolean
}

function emit(io: CommandIo, value: unknown, text: string): void {
  if (io.json) {
    io.write(`${JSON.stringify(value, null, 2)}\n`)
    return
  }
  io.write(text.endsWith('\n') ? text : `${text}\n`)
}

export async function cmdInit(io: CommandIo): Promise<void> {
  const config = await loadPipelineConfig()
  await writePipelineConfig(config)
  await ensureExperienceRoot(config.experience_root)
  emit(
    io,
    { configPath: defaultConfigPath(), config },
    `Initialized\nconfig: ${defaultConfigPath()}\ntasks: ${config.tasks_dir}\nexperience: ${config.experience_root}\n`
  )
}

export async function cmdCreate(
  io: CommandIo,
  flags: {
    title: string
    body?: string
    repo?: string
    projectId?: string
    typeHint?: string
    domainTags?: string[]
    developAgent?: string
    reviewAgent?: string
  }
): Promise<void> {
  const config = await loadPipelineConfig()
  const { task, path } = await publishPipelineTask({ config, ...flags })
  emit(
    io,
    { path, task },
    `created ${task.id}\npath: ${path}\ntype: ${task.type}\ntemplate: ${task.template_id}\nstage: ${task.stage}\n`
  )
}

export async function cmdList(io: CommandIo, statusFilter?: string): Promise<void> {
  const config = await loadPipelineConfig()
  let tasks = await listTasks(config.tasks_dir)
  if (statusFilter) {
    tasks = tasks.filter((task) => task.status === statusFilter)
  }
  emit(io, { tasks }, formatTaskTable(tasks))
}

export async function cmdStatus(io: CommandIo, taskId?: string): Promise<void> {
  const config = await loadPipelineConfig()
  if (!taskId) {
    await cmdList(io)
    return
  }
  const task = await loadTask(config.tasks_dir, taskId)
  emit(io, { task, config }, formatTaskStatus(task, config))
}

export async function cmdConfigShow(io: CommandIo): Promise<void> {
  const config = await loadPipelineConfig()
  emit(io, { configPath: defaultConfigPath(), config }, formatConfig(config))
}

export async function cmdConfigSet(io: CommandIo, key: string, value: string): Promise<void> {
  const config = await loadPipelineConfig()
  const next: PipelineConfig = {
    ...config,
    agents: { ...config.agents }
  }
  switch (key) {
    case 'tasks_dir':
      next.tasks_dir = value
      break
    case 'experience_root':
      next.experience_root = value
      break
    case 'orca_command':
      next.orca_command = value
      break
    case 'dry_run':
      next.dry_run = value === '1' || value === 'true'
      break
    case 'agents.Developer':
    case 'Developer':
      next.agents.Developer = value
      break
    case 'agents.Reviewer':
    case 'Reviewer':
      next.agents.Reviewer = value
      break
    case 'agents.Planner':
    case 'Planner':
      next.agents.Planner = value
      break
    case 'agents.Orchestrator':
    case 'Orchestrator':
      next.agents.Orchestrator = value
      break
    case 'agents.Writer':
    case 'Writer':
      next.agents.Writer = value
      break
    default:
      throw new Error(`Unsupported config key: ${key}`)
  }
  await writePipelineConfig(next)
  emit(io, { config: next }, formatConfig(next))
}

export async function cmdOnce(io: CommandIo): Promise<void> {
  const config = await loadPipelineConfig()
  const summary = await runSchedulerOnce(config)
  emit(
    io,
    summary,
    `scanned=${summary.scanned} changed=${summary.changed}\n${summary.results
      .map((row) => `${row.id}\t${row.status}\t${row.stage}\t${row.events.join(' | ')}`)
      .join('\n')}\n`
  )
}

export async function cmdRun(io: CommandIo, intervalMs?: number): Promise<void> {
  const config = await loadPipelineConfig()
  io.writeError(
    `pipeline run loop starting (interval=${intervalMs ?? config.poll_interval_ms}ms, dry_run=${config.dry_run})\n`
  )
  const controller = new AbortController()
  const onSig = () => controller.abort()
  process.once('SIGINT', onSig)
  process.once('SIGTERM', onSig)
  try {
    while (!controller.signal.aborted) {
      const summary = await runSchedulerOnce(config)
      emit(
        io,
        summary,
        `${new Date().toISOString()} scanned=${summary.scanned} changed=${summary.changed}\n${summary.results
          .filter((row) => row.events.length > 0)
          .map((row) => `${row.id}: ${row.events.join(' | ')}`)
          .join('\n')}${summary.results.some((row) => row.events.length > 0) ? '\n' : ''}`
      )
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, intervalMs ?? config.poll_interval_ms)
        controller.signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer)
            resolve()
          },
          { once: true }
        )
      })
    }
  } finally {
    process.off('SIGINT', onSig)
    process.off('SIGTERM', onSig)
  }
  // Keep export referenced for tests that prefer the helper.
  void runSchedulerLoop
}

export async function cmdUnblock(io: CommandIo, taskId: string, note?: string): Promise<void> {
  const config = await loadPipelineConfig()
  const task = await loadTask(config.tasks_dir, taskId)
  const template = await loadPipelineTemplate(task.template_id)
  const nextStage =
    task.stage === 'clarify' ? (nextTemplateStage(template, 'clarify')?.name ?? 'plan') : task.stage
  const next = touchTask(task, {
    status: 'active',
    stage: nextStage,
    notes: note ? [...task.notes, note] : [...task.notes, 'unblocked by operator'],
    runner: {
      phase: 'idle',
      role: null,
      agent: null,
      blocker: null,
      last_error: null
    }
  })
  await saveTask(config.tasks_dir, next)
  emit(io, { task: next }, formatTaskStatus(next, config))
}
