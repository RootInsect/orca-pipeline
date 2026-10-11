import type { PipelineConfig, PipelineRole, PipelineTask, TemplateStage } from './types'

export function resolveAgentForStage(
  task: PipelineTask,
  stage: TemplateStage,
  config: PipelineConfig
): string {
  const override = task.agent_overrides[stage.role]
  if (override && override.trim()) {
    return override.trim()
  }

  if (stage.role === 'Developer' && task.orca.develop_agent) {
    return task.orca.develop_agent
  }
  if (stage.role === 'Reviewer' && task.orca.review_agent) {
    return task.orca.review_agent
  }

  return config.agents[stage.role] || config.agents.Developer
}

export function rememberRoleAgents(
  task: PipelineTask,
  role: PipelineRole,
  agent: string
): PipelineTask['orca'] {
  const orca = { ...task.orca }
  if (role === 'Developer') {
    orca.develop_agent = agent
  }
  if (role === 'Reviewer') {
    orca.review_agent = agent
  }
  return orca
}

export function buildWorkerSpec(task: PipelineTask, stage: TemplateStage): string {
  const lines = [
    `Pipeline task ${task.id} · stage ${stage.name} · role ${stage.role}`,
    `Type: ${task.type} (${task.template_id})`,
    `Title: ${task.title}`,
    '',
    'Body:',
    task.body || '(empty)',
    '',
    `Exit when: ${stage.exit_when}`,
    `Skills: ${stage.skills.join(', ') || '(none)'}`,
    '',
    'Constraints:',
    '- Stay inside the task worktree.',
    '- Do not skip hard gates from the template.',
    '- Report concrete evidence in worker_done.',
    stage.name === 'open_pr'
      ? '- Open a PR with gh when ready and include the PR URL in the worker_done body.'
      : '',
    stage.name === 'review'
      ? '- You are the Reviewer. Prefer finding issues over rubber-stamping.'
      : '',
    stage.name === 'experience'
      ? '- Summarize lessons for the shared experience store (no secrets).'
      : ''
  ]
  return lines.filter((line) => line !== undefined).join('\n')
}
