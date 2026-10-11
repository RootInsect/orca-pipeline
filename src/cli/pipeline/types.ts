export type TaskType = 'bug_fix' | 'new_feature' | 'debug' | 'small_change'

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

export type TaskStatus = 'queued' | 'active' | 'blocked' | 'done' | 'failed'

export type PipelineRole = 'Orchestrator' | 'Planner' | 'Developer' | 'Reviewer' | 'Writer'

export type RunnerPhase =
  | 'idle'
  | 'awaiting_worker'
  | 'awaiting_gate'
  | 'awaiting_ci'
  | 'blocked_human'

export type AgentPreference = {
  capability: string
  cost: 'low' | 'mid' | 'high'
}

export type TemplateStage = {
  name: PipelineStage
  role: PipelineRole
  skills: string[]
  human_gate: boolean
  skip_when: string | null
  exit_when: string
  on_fail: string
  agent_preference: AgentPreference
}

export type PipelineTemplate = {
  id: string
  task_types: TaskType[]
  max_ci_loops: number
  summary: string
  stages: TemplateStage[]
}

export type PipelineTask = {
  id: string
  source: string
  type: TaskType
  type_hint: TaskType | null
  template_id: string
  title: string
  body: string
  repo: string | null
  project_id: string | null
  base_ref: string
  domain_tags: string[]
  priority: string
  status: TaskStatus
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
    phase: RunnerPhase
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

export type PipelineConfig = {
  tasks_dir: string
  experience_root: string
  orca_command: string
  dry_run: boolean
  poll_interval_ms: number
  worker_wait_timeout_ms: number
  agents: Record<PipelineRole, string>
  auto_skip_clarify_keywords: string[]
}

export type OrcaExecResult = {
  ok: boolean
  code: number | null
  stdout: string
  stderr: string
  json: unknown
}

export type OrcaExec = (args: string[], options?: { timeoutMs?: number }) => Promise<OrcaExecResult>

export type GhExec = (args: string[], options?: { timeoutMs?: number }) => Promise<OrcaExecResult>
