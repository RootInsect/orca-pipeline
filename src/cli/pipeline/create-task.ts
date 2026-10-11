import { classifyTaskType, templateIdForType } from './classify'
import { parseTaskTypeOrNull } from './parse-helpers'
import { loadPipelineTemplate } from './templates'
import { createTaskId, saveTask, touchTask } from './task-store'
import type { PipelineConfig, PipelineTask } from './types'

export async function publishPipelineTask(input: {
  config: PipelineConfig
  title: string
  body?: string
  repo?: string
  projectId?: string
  typeHint?: string
  domainTags?: string[]
  baseRef?: string
  developAgent?: string
  reviewAgent?: string
}): Promise<{ task: PipelineTask; path: string }> {
  const type = classifyTaskType({
    typeHint: input.typeHint,
    title: input.title,
    body: input.body || '',
    labels: input.domainTags
  })
  const templateId = templateIdForType(type)
  const template = await loadPipelineTemplate(templateId)
  const now = new Date().toISOString()
  const repo = input.repo?.trim() || null
  const projectId = input.projectId?.trim() || (repo ? repo.replace(/\//g, '__') : null)
  const task: PipelineTask = {
    id: createTaskId(),
    source: 'manual',
    type,
    type_hint: parseTaskTypeOrNull(input.typeHint) || type,
    template_id: templateId,
    title: input.title.trim(),
    body: (input.body || '').trim(),
    repo,
    project_id: projectId,
    base_ref: input.baseRef?.trim() || 'main',
    domain_tags: input.domainTags ?? [],
    priority: 'normal',
    status: 'queued',
    stage: 'setup_env',
    ci_loops: 0,
    max_ci_loops: template.max_ci_loops,
    pr_url: null,
    orca: {
      worktree_id: null,
      run_id: null,
      gate_ids: [],
      develop_agent: input.developAgent?.trim() || input.config.agents.Developer,
      review_agent: input.reviewAgent?.trim() || input.config.agents.Reviewer,
      last_dispatch_id: null,
      last_orch_task_id: null
    },
    runner: {
      phase: 'idle',
      role: 'Orchestrator',
      agent: null,
      blocker: null,
      last_error: null
    },
    agent_overrides: {},
    notes: [`classified as ${type} → ${templateId}`],
    artifacts: [],
    experience: {
      root_env: 'PIPELINE_EXPERIENCE_ROOT',
      written: []
    },
    created_at: now,
    updated_at: now
  }
  const active = touchTask(task, { status: 'active' })
  const filePath = await saveTask(input.config.tasks_dir, active)
  return { task: active, path: filePath }
}
