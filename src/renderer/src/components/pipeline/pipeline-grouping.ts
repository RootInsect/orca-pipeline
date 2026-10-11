import type { PipelineTaskDto } from '../../../../shared/pipeline-ui-types'
import { pipelineTaskStatusDot } from '../../../../shared/pipeline-ui-types'
import { projectKey } from './pipeline-display'

export type PipelineGroupBy = 'project' | 'agent' | 'status'
export type PipelineFilters = {
  project: string
  agent: string
  type: string
  stage: string
  onlyNeedsMe: boolean
}

export function filterPipelineTasks(
  tasks: readonly PipelineTaskDto[],
  filters: PipelineFilters
): PipelineTaskDto[] {
  return tasks.filter((task) => {
    if (filters.onlyNeedsMe && pipelineTaskStatusDot(task) !== 'waiting_on_me') {
      return false
    }
    if (filters.project !== 'all' && projectKey(task) !== filters.project) {
      return false
    }
    const agent = task.runner.agent || task.orca.develop_agent || ''
    if (filters.agent !== 'all' && agent !== filters.agent) {
      return false
    }
    if (filters.type !== 'all' && task.type !== filters.type) {
      return false
    }
    if (filters.stage !== 'all' && task.stage !== filters.stage) {
      return false
    }
    return true
  })
}

export function groupPipelineTasks(
  tasks: readonly PipelineTaskDto[],
  groupBy: PipelineGroupBy
): { key: string; tasks: PipelineTaskDto[] }[] {
  const map = new Map<string, PipelineTaskDto[]>()
  for (const task of tasks) {
    let key = projectKey(task)
    if (groupBy === 'agent') {
      key = task.runner.agent || task.orca.develop_agent || '—'
    } else if (groupBy === 'status') {
      key = pipelineTaskStatusDot(task)
    }
    const list = map.get(key)
    if (list) {
      list.push(task)
    } else {
      map.set(key, [task])
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, groupTasks]) => ({
      key,
      tasks: groupTasks.sort((left, right) => right.updated_at.localeCompare(left.updated_at))
    }))
}

export function uniqueFilterValues(tasks: readonly PipelineTaskDto[]): {
  projects: string[]
  agents: string[]
  types: string[]
  stages: string[]
} {
  const projects = new Set<string>()
  const agents = new Set<string>()
  const types = new Set<string>()
  const stages = new Set<string>()
  for (const task of tasks) {
    projects.add(projectKey(task))
    const agent = task.runner.agent || task.orca.develop_agent
    if (agent) {
      agents.add(agent)
    }
    types.add(task.type)
    stages.add(task.stage)
  }
  return {
    projects: [...projects].sort(),
    agents: [...agents].sort(),
    types: [...types].sort(),
    stages: [...stages].sort()
  }
}
