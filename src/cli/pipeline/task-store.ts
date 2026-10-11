import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse, stringify } from 'yaml'
import {
  asNullableString,
  asNumber,
  asString,
  asStringArray,
  isRecord,
  parseAgentOverrides,
  parsePhase,
  parseRoleOrNull,
  parseStage,
  parseStatus,
  parseTaskType,
  parseTaskTypeOrNull
} from './parse-helpers'
import type { PipelineTask } from './types'

function parseTask(raw: unknown): PipelineTask {
  if (!isRecord(raw)) {
    throw new Error('task must be an object')
  }
  const orcaRaw = isRecord(raw.orca) ? raw.orca : {}
  const runnerRaw = isRecord(raw.runner) ? raw.runner : {}
  const experienceRaw = isRecord(raw.experience) ? raw.experience : {}
  return {
    id: asString(raw.id),
    source: asString(raw.source, 'manual'),
    type: parseTaskType(raw.type),
    type_hint: parseTaskTypeOrNull(raw.type_hint),
    template_id: asString(raw.template_id),
    title: asString(raw.title),
    body: asString(raw.body),
    repo: asNullableString(raw.repo),
    project_id: asNullableString(raw.project_id),
    base_ref: asString(raw.base_ref, 'main'),
    domain_tags: asStringArray(raw.domain_tags),
    priority: asString(raw.priority, 'normal'),
    status: parseStatus(raw.status),
    stage: parseStage(raw.stage),
    ci_loops: asNumber(raw.ci_loops, 0),
    max_ci_loops: asNumber(raw.max_ci_loops, 2),
    pr_url: asNullableString(raw.pr_url),
    orca: {
      worktree_id: asNullableString(orcaRaw.worktree_id),
      run_id: asNullableString(orcaRaw.run_id),
      gate_ids: asStringArray(orcaRaw.gate_ids),
      develop_agent: asNullableString(orcaRaw.develop_agent),
      review_agent: asNullableString(orcaRaw.review_agent),
      last_dispatch_id: asNullableString(orcaRaw.last_dispatch_id),
      last_orch_task_id: asNullableString(orcaRaw.last_orch_task_id)
    },
    runner: {
      phase: parsePhase(runnerRaw.phase),
      role: parseRoleOrNull(runnerRaw.role),
      agent: asNullableString(runnerRaw.agent),
      blocker: asNullableString(runnerRaw.blocker),
      last_error: asNullableString(runnerRaw.last_error)
    },
    agent_overrides: parseAgentOverrides(raw.agent_overrides),
    notes: asStringArray(raw.notes),
    artifacts: Array.isArray(raw.artifacts)
      ? raw.artifacts.flatMap((item) => {
          if (!isRecord(item)) {
            return []
          }
          if (typeof item.kind !== 'string' || typeof item.uri !== 'string') {
            return []
          }
          return [{ kind: item.kind, uri: item.uri }]
        })
      : [],
    experience: {
      root_env: asString(experienceRaw.root_env, 'PIPELINE_EXPERIENCE_ROOT'),
      written: asStringArray(experienceRaw.written)
    },
    created_at: asString(raw.created_at),
    updated_at: asString(raw.updated_at)
  }
}

export function taskFilePath(tasksDir: string, taskId: string): string {
  return path.join(tasksDir, `${taskId}.yaml`)
}

export async function ensureTasksDir(tasksDir: string): Promise<void> {
  await mkdir(tasksDir, { recursive: true })
}

export async function saveTask(tasksDir: string, task: PipelineTask): Promise<string> {
  await ensureTasksDir(tasksDir)
  const filePath = taskFilePath(tasksDir, task.id)
  await writeFile(filePath, stringify(task), 'utf8')
  return filePath
}

export async function loadTask(tasksDir: string, taskIdOrPath: string): Promise<PipelineTask> {
  const filePath = taskIdOrPath.endsWith('.yaml')
    ? taskIdOrPath
    : taskFilePath(tasksDir, taskIdOrPath)
  return parseTask(parse(await readFile(filePath, 'utf8')))
}

export async function listTasks(tasksDir: string): Promise<PipelineTask[]> {
  await ensureTasksDir(tasksDir)
  const names = (await readdir(tasksDir)).filter((name) => name.endsWith('.yaml')).sort()
  const tasks: PipelineTask[] = []
  for (const name of names) {
    try {
      tasks.push(parseTask(parse(await readFile(path.join(tasksDir, name), 'utf8'))))
    } catch {
      // skip corrupt rows; status view still works for good tasks
    }
  }
  return tasks
}

export function touchTask(task: PipelineTask, patch: Partial<PipelineTask> = {}): PipelineTask {
  return {
    ...task,
    ...patch,
    orca: { ...task.orca, ...patch.orca },
    runner: { ...task.runner, ...patch.runner },
    experience: { ...task.experience, ...patch.experience },
    updated_at: new Date().toISOString()
  }
}

export function createTaskId(): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, '')
    .slice(0, 14)
  return `task_${stamp}_${Math.floor(Math.random() * 1e4)
    .toString()
    .padStart(4, '0')}`
}
