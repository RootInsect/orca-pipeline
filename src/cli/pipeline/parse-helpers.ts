import type { PipelineRole, PipelineStage, RunnerPhase, TaskStatus, TaskType } from './types'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function asNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }
  return typeof value === 'string' ? value : null
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

const TASK_TYPES = ['bug_fix', 'new_feature', 'debug', 'small_change'] as const
const STAGES = [
  'classify',
  'setup_env',
  'clarify',
  'plan',
  'develop',
  'test',
  'review',
  'open_pr',
  'cicd',
  'experience',
  'done'
] as const
const STATUSES = ['queued', 'active', 'blocked', 'done', 'failed'] as const
const PHASES = ['idle', 'awaiting_worker', 'awaiting_gate', 'awaiting_ci', 'blocked_human'] as const
const ROLES = ['Orchestrator', 'Planner', 'Developer', 'Reviewer', 'Writer'] as const

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && allowed.some((item) => item === value)
}

export function parseTaskType(value: unknown, fallback: TaskType = 'bug_fix'): TaskType {
  return isOneOf(value, TASK_TYPES) ? value : fallback
}

export function parseTaskTypeOrNull(value: unknown): TaskType | null {
  return isOneOf(value, TASK_TYPES) ? value : null
}

export function parseStage(value: unknown, fallback: PipelineStage = 'setup_env'): PipelineStage {
  return isOneOf(value, STAGES) ? value : fallback
}

export function parseStatus(value: unknown, fallback: TaskStatus = 'active'): TaskStatus {
  return isOneOf(value, STATUSES) ? value : fallback
}

export function parsePhase(value: unknown, fallback: RunnerPhase = 'idle'): RunnerPhase {
  return isOneOf(value, PHASES) ? value : fallback
}

export function parseRole(value: unknown, fallback: PipelineRole = 'Orchestrator'): PipelineRole {
  return isOneOf(value, ROLES) ? value : fallback
}

export function parseRoleOrNull(value: unknown): PipelineRole | null {
  return isOneOf(value, ROLES) ? value : null
}

export function parseAgentOverrides(value: unknown): Partial<Record<PipelineRole, string>> {
  if (!isRecord(value)) {
    return {}
  }
  const out: Partial<Record<PipelineRole, string>> = {}
  for (const role of ROLES) {
    const agent = value[role]
    if (typeof agent === 'string' && agent.trim()) {
      out[role] = agent.trim()
    }
  }
  return out
}

export function errnoCode(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined
  }
  return typeof error.code === 'string' ? error.code : undefined
}
