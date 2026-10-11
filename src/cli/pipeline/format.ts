import type { PipelineConfig, PipelineTask } from './types'

export function formatTaskRow(task: PipelineTask): string {
  const project = task.project_id || task.repo || '-'
  const role = task.runner.role || '-'
  const agent = task.runner.agent || task.orca.develop_agent || '-'
  const blocker = task.runner.blocker || task.runner.last_error || ''
  const cols = [task.id, project, task.type, task.stage, task.status, role, agent, blocker]
  return cols.map((col) => String(col).replace(/\s+/g, ' ').slice(0, 40)).join('\t')
}

export function formatTaskTable(tasks: PipelineTask[]): string {
  const header = ['ID', 'PROJECT', 'TYPE', 'STAGE', 'STATUS', 'ROLE', 'AGENT', 'BLOCKER'].join('\t')
  return [header, ...tasks.map(formatTaskRow)].join('\n')
}

export function formatTaskStatus(task: PipelineTask, config: PipelineConfig): string {
  return [
    `id: ${task.id}`,
    `title: ${task.title}`,
    `project: ${task.project_id || '-'}`,
    `repo: ${task.repo || '-'}`,
    `type: ${task.type} (${task.template_id})`,
    `status: ${task.status}`,
    `stage: ${task.stage}`,
    `role: ${task.runner.role || '-'}`,
    `agent: ${task.runner.agent || '-'}`,
    `develop_agent: ${task.orca.develop_agent || config.agents.Developer}`,
    `review_agent: ${task.orca.review_agent || config.agents.Reviewer}`,
    `runner.phase: ${task.runner.phase}`,
    `blocker: ${task.runner.blocker || '-'}`,
    `last_error: ${task.runner.last_error || '-'}`,
    `worktree: ${task.orca.worktree_id || '-'}`,
    `run: ${task.orca.run_id || '-'}`,
    `dispatch: ${task.orca.last_dispatch_id || '-'}`,
    `pr_url: ${task.pr_url || '-'}`,
    `ci_loops: ${task.ci_loops}/${task.max_ci_loops}`,
    `experience_root: ${config.experience_root}`,
    `notes:`,
    ...task.notes.map((note) => `  - ${note}`)
  ].join('\n')
}

export function formatConfig(config: PipelineConfig): string {
  return [
    `tasks_dir: ${config.tasks_dir}`,
    `experience_root: ${config.experience_root}`,
    `orca_command: ${config.orca_command}`,
    `dry_run: ${config.dry_run}`,
    `poll_interval_ms: ${config.poll_interval_ms}`,
    `agents.Orchestrator: ${config.agents.Orchestrator}`,
    `agents.Planner: ${config.agents.Planner}`,
    `agents.Developer: ${config.agents.Developer}`,
    `agents.Reviewer: ${config.agents.Reviewer}`,
    `agents.Writer: ${config.agents.Writer}`,
    '',
    'Env overrides: PIPELINE_DEVELOPER_AGENT, PIPELINE_REVIEWER_AGENT, PIPELINE_PLANNER_AGENT,',
    'PIPELINE_TASKS_DIR, PIPELINE_EXPERIENCE_ROOT, PIPELINE_ORCA_COMMAND, PIPELINE_DRY_RUN=1'
  ].join('\n')
}
