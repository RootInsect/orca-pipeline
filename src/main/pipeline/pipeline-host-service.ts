import { watch, type FSWatcher } from 'node:fs'
import { BrowserWindow } from 'electron'
import {
  listPipelineAgentsOnPath,
  PIPELINE_AGENT_OPTIONS
} from '../../cli/pipeline/agent-availability'
import { loadPipelineConfig, writePipelineConfig } from '../../cli/pipeline/config'
import { publishPipelineTask } from '../../cli/pipeline/create-task'
import { defaultConfigPath } from '../../cli/pipeline/paths'
import { runSchedulerOnce } from '../../cli/pipeline/scheduler'
import { listTasks, loadTask, saveTask, touchTask } from '../../cli/pipeline/task-store'
import { loadPipelineTemplate, nextTemplateStage } from '../../cli/pipeline/templates'
import type { PipelineConfig, PipelineRole, PipelineTask } from '../../cli/pipeline/types'
import type {
  PipelineConfigAgentsPatch,
  PipelineConfigDto,
  PipelineCreateInput,
  PipelineSchedulerState,
  PipelineSnapshot,
  PipelineTaskDto,
  PipelineUnblockInput
} from '../../shared/pipeline-ui-types'

function toTaskDto(task: PipelineTask): PipelineTaskDto {
  return task
}

function toConfigDto(config: PipelineConfig): PipelineConfigDto {
  return config
}

export class PipelineHostService {
  private watcher: FSWatcher | null = null
  private watchTimer: ReturnType<typeof setTimeout> | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private schedulerAbort: AbortController | null = null
  private schedulerLoop: Promise<void> | null = null
  private schedulerState: PipelineSchedulerState = {
    running: false,
    lastTickAt: null,
    lastSummary: null,
    lastError: null
  }
  private watchedDir: string | null = null

  async getSnapshot(): Promise<PipelineSnapshot> {
    const config = await loadPipelineConfig()
    await this.ensureWatch(config.tasks_dir)
    const tasks = await listTasks(config.tasks_dir)
    return {
      tasks: tasks.map(toTaskDto),
      config: toConfigDto(config),
      configPath: defaultConfigPath(),
      availableAgents: this.availableAgents(),
      scheduler: { ...this.schedulerState }
    }
  }

  availableAgents(): string[] {
    const onPath = listPipelineAgentsOnPath()
    // Always advertise cursor-agent so role selects stay usable on this user's box.
    const merged = new Set<string>([...PIPELINE_AGENT_OPTIONS, ...onPath, 'cursor-agent'])
    return [...merged]
  }

  async createTask(input: PipelineCreateInput): Promise<PipelineTaskDto> {
    const config = await loadPipelineConfig()
    const { task } = await publishPipelineTask({
      config,
      title: input.title,
      body: input.body,
      repo: input.repo,
      projectId: input.projectId,
      typeHint: input.typeHint,
      domainTags: input.domainTags,
      baseRef: input.baseRef
    })
    this.broadcastChanged()
    return toTaskDto(task)
  }

  async unblockTask(input: PipelineUnblockInput): Promise<PipelineTaskDto> {
    const config = await loadPipelineConfig()
    const task = await loadTask(config.tasks_dir, input.taskId)
    const template = await loadPipelineTemplate(task.template_id)
    const nextStage =
      task.stage === 'clarify'
        ? (nextTemplateStage(template, 'clarify')?.name ?? 'plan')
        : task.stage === 'plan' && task.runner.phase === 'blocked_human'
          ? (nextTemplateStage(template, 'plan')?.name ?? 'develop')
          : task.stage
    const note = input.note?.trim()
    const next = touchTask(task, {
      status: 'active',
      stage: nextStage,
      notes: note ? [...task.notes, note] : [...task.notes, 'unblocked from Pipeline UI'],
      body:
        note && task.stage === 'clarify' ? `${task.body}\n\n[human]\n${note}`.trim() : task.body,
      runner: {
        phase: 'idle',
        role: null,
        agent: null,
        blocker: null,
        last_error: null
      }
    })
    await saveTask(config.tasks_dir, next)
    this.broadcastChanged()
    return toTaskDto(next)
  }

  async updateAgents(patch: PipelineConfigAgentsPatch): Promise<PipelineConfigDto> {
    const config = await loadPipelineConfig()
    const next: PipelineConfig = {
      ...config,
      agents: { ...config.agents }
    }
    const roles: PipelineRole[] = ['Orchestrator', 'Planner', 'Developer', 'Reviewer', 'Writer']
    for (const role of roles) {
      const value = patch.agents[role]
      if (typeof value === 'string' && value.trim()) {
        next.agents[role] = value.trim()
      }
    }
    await writePipelineConfig(next)
    this.broadcastChanged()
    return toConfigDto(next)
  }

  getSchedulerState(): PipelineSchedulerState {
    return { ...this.schedulerState }
  }

  async startScheduler(): Promise<PipelineSchedulerState> {
    if (this.schedulerAbort) {
      return this.getSchedulerState()
    }
    this.schedulerAbort = new AbortController()
    this.schedulerState = {
      ...this.schedulerState,
      running: true,
      lastError: null
    }
    this.broadcastChanged()
    const signal = this.schedulerAbort.signal
    this.schedulerLoop = (async () => {
      while (!signal.aborted) {
        try {
          const config = await loadPipelineConfig()
          const summary = await runSchedulerOnce(config)
          this.schedulerState = {
            running: true,
            lastTickAt: new Date().toISOString(),
            lastSummary: summary,
            lastError: null
          }
          if (summary.changed > 0) {
            this.broadcastChanged()
          } else {
            this.broadcastScheduler()
          }
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, config.poll_interval_ms)
            signal.addEventListener(
              'abort',
              () => {
                clearTimeout(timer)
                resolve()
              },
              { once: true }
            )
          })
        } catch (error) {
          this.schedulerState = {
            ...this.schedulerState,
            running: true,
            lastError: error instanceof Error ? error.message : String(error)
          }
          this.broadcastScheduler()
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 5000)
            signal.addEventListener(
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
    })()
    return this.getSchedulerState()
  }

  async stopScheduler(): Promise<PipelineSchedulerState> {
    const abort = this.schedulerAbort
    this.schedulerAbort = null
    abort?.abort()
    if (this.schedulerLoop) {
      try {
        await this.schedulerLoop
      } catch {
        // loop exits on abort
      }
      this.schedulerLoop = null
    }
    this.schedulerState = {
      ...this.schedulerState,
      running: false
    }
    this.broadcastChanged()
    return this.getSchedulerState()
  }

  async tickOnce(): Promise<PipelineSchedulerState> {
    try {
      const config = await loadPipelineConfig()
      const summary = await runSchedulerOnce(config)
      this.schedulerState = {
        ...this.schedulerState,
        lastTickAt: new Date().toISOString(),
        lastSummary: summary,
        lastError: null
      }
      this.broadcastChanged()
    } catch (error) {
      this.schedulerState = {
        ...this.schedulerState,
        lastError: error instanceof Error ? error.message : String(error)
      }
      this.broadcastScheduler()
    }
    return this.getSchedulerState()
  }

  dispose(): void {
    void this.stopScheduler()
    this.watcher?.close()
    this.watcher = null
    if (this.watchTimer) {
      clearTimeout(this.watchTimer)
      this.watchTimer = null
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  private async ensureWatch(tasksDir: string): Promise<void> {
    if (this.watchedDir === tasksDir && this.watcher) {
      return
    }
    this.watcher?.close()
    this.watchedDir = tasksDir
    try {
      const { mkdir } = await import('node:fs/promises')
      await mkdir(tasksDir, { recursive: true })
      this.watcher = watch(tasksDir, () => this.scheduleBroadcast())
    } catch {
      // fall back to poll below
    }
    if (!this.pollTimer) {
      this.pollTimer = setInterval(() => this.broadcastChanged(), 4000)
    }
  }

  private scheduleBroadcast(): void {
    if (this.watchTimer) {
      clearTimeout(this.watchTimer)
    }
    this.watchTimer = setTimeout(() => {
      this.watchTimer = null
      this.broadcastChanged()
    }, 150)
  }

  private broadcastChanged(): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send('pipeline:changed')
      }
    }
  }

  private broadcastScheduler(): void {
    for (const window of BrowserWindow.getAllWindows()) {
      if (!window.isDestroyed()) {
        window.webContents.send('pipeline:scheduler', this.getSchedulerState())
      }
    }
  }
}

let sharedService: PipelineHostService | null = null

export function getPipelineHostService(): PipelineHostService {
  if (!sharedService) {
    sharedService = new PipelineHostService()
  }
  return sharedService
}
