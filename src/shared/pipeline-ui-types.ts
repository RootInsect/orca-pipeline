/** Wire types for the desktop Pipeline page (mirrors src/cli/pipeline/types). */

export type PipelineTaskType = 'bug_fix' | 'new_feature' | 'debug' | 'small_change'

export type PipelineStage =
  | 'classify'
  | 'setup_env'
  | 'clarify'
  | 'plan'
  | 'develop'
  | 'test'
  | 'review'
  | 'open_pr'
  | 'cicd'
  | 'experience'
  | 'done'

export type PipelineTaskStatus = 'queued' | 'active' | 'blocked' | 'done' | 'failed'

export type PipelineRole = 'Orchestrator' | 'Planner' | 'Developer' | 'Reviewer' | 'Writer'

export type PipelineRunnerPhase =
  | 'idle'
  | 'awaiting_worker'
  | 'awaiting_gate'
  | 'awaiting_ci'
  | 'blocked_human'

export type PipelineTaskDto = {
  id: string
  source: string
  type: PipelineTaskType
  type_hint: PipelineTaskType | null
  template_id: string
  title: string
  body: string
  repo: string | null
  project_id: string | null
  base_ref: string
  domain_tags: string[]
  priority: string
  status: PipelineTaskStatus
  stage: PipelineStage
  ci_loops: number
  max_ci_loops: number
  pr_url: string | null
  orca: {
    worktree_id: string | null
    run_id: string | null
    gate_ids: string[]
    develop_agent: string | null
    review_agent: string | null
    last_dispatch_id: string | null
    last_orch_task_id: string | null
  }
  runner: {
    phase: PipelineRunnerPhase
    role: PipelineRole | null
    agent: string | null
    blocker: string | null
    last_error: string | null
  }
  agent_overrides: Partial<Record<PipelineRole, string>>
  notes: string[]
  artifacts: { kind: string; uri: string }[]
  experience: {
    root_env: string
    written: string[]
  }
  created_at: string
  updated_at: string
}

export type PipelineConfigDto = {
  tasks_dir: string
  experience_root: string
  orca_command: string
  dry_run: boolean
  poll_interval_ms: number
  worker_wait_timeout_ms: number
  agents: Record<PipelineRole, string>
  auto_skip_clarify_keywords: string[]
}

export type PipelineSchedulerState = {
  running: boolean
  lastTickAt: string | null
  lastSummary: {
    scanned: number
    changed: number
    results: { id: string; stage: string; status: string; events: string[] }[]
  } | null
  lastError: string | null
}

export type PipelineSnapshot = {
  tasks: PipelineTaskDto[]
  config: PipelineConfigDto
  configPath: string
  availableAgents: string[]
  scheduler: PipelineSchedulerState
}

export type PipelineCreateInput = {
  title: string
  body?: string
  repo?: string
  projectId?: string
  typeHint?: string
  domainTags?: string[]
  baseRef?: string
}

export type PipelineUnblockInput = {
  taskId: string
  note?: string
}

export type PipelineConfigAgentsPatch = {
  agents: Partial<Record<PipelineRole, string>>
}

export const PIPELINE_TIMELINE_STAGES: PipelineStage[] = [
  'setup_env',
  'clarify',
  'plan',
  'develop',
  'test',
  'review',
  'open_pr',
  'cicd',
  'experience'
]

export type PipelineUiStatusDot = 'running' | 'waiting_on_me' | 'blocked' | 'done'

export function pipelineTaskStatusDot(task: PipelineTaskDto): PipelineUiStatusDot {
  if (task.status === 'done') {
    return 'done'
  }
  if (task.status === 'failed') {
    return 'blocked'
  }
  if (task.status === 'blocked' || task.runner.phase === 'blocked_human') {
    return 'waiting_on_me'
  }
  if (task.runner.phase === 'awaiting_gate') {
    return 'waiting_on_me'
  }
  if (task.status === 'active' || task.status === 'queued') {
    return 'running'
  }
  return 'blocked'
}
