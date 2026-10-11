import type {
  PipelineStage,
  PipelineTaskDto,
  PipelineTaskType,
  PipelineUiStatusDot
} from '../../../../shared/pipeline-ui-types'
import { pipelineTaskStatusDot } from '../../../../shared/pipeline-ui-types'
import { translate } from '@/i18n/i18n'

const TASK_TYPES: readonly PipelineTaskType[] = ['bug_fix', 'new_feature', 'debug', 'small_change']

export function isPipelineTaskType(value: string): value is PipelineTaskType {
  return TASK_TYPES.some((type) => type === value)
}

export function taskTypeLabel(type: string): string {
  if (!isPipelineTaskType(type)) {
    return type
  }
  switch (type) {
    case 'bug_fix':
      return translate('auto.components.pipeline.type.bug_fix', '修 Bug')
    case 'new_feature':
      return translate('auto.components.pipeline.type.new_feature', '新功能')
    case 'debug':
      return translate('auto.components.pipeline.type.debug', '排查')
    case 'small_change':
      return translate('auto.components.pipeline.type.small_change', '小改动')
  }
}

export function stageLabel(stage: PipelineStage): string {
  return stage
}

export function statusDotLabel(dot: PipelineUiStatusDot): string {
  switch (dot) {
    case 'running':
      return translate('auto.components.pipeline.dot.running', '进行中')
    case 'waiting_on_me':
      return translate('auto.components.pipeline.dot.waiting', '需要我')
    case 'blocked':
      return translate('auto.components.pipeline.dot.blocked', '阻塞')
    case 'done':
      return translate('auto.components.pipeline.dot.done', '完成')
  }
}

export function statusDotClass(dot: PipelineUiStatusDot): string {
  switch (dot) {
    case 'running':
      return 'bg-chart-2'
    case 'waiting_on_me':
      return 'bg-chart-4'
    case 'blocked':
      return 'bg-destructive'
    case 'done':
      return 'bg-muted-foreground/40'
  }
}

export function needsHuman(task: PipelineTaskDto): boolean {
  return pipelineTaskStatusDot(task) === 'waiting_on_me'
}

export function elapsedLabel(task: PipelineTaskDto): string {
  const blocker = task.runner.blocker || task.runner.last_error
  if (blocker) {
    return blocker
  }
  const start = Date.parse(task.updated_at || task.created_at)
  if (!Number.isFinite(start)) {
    return ''
  }
  const minutes = Math.max(0, Math.round((Date.now() - start) / 60_000))
  if (minutes < 1) {
    return translate('auto.components.pipeline.elapsed.justNow', '刚刚更新')
  }
  if (minutes < 60) {
    return translate('auto.components.pipeline.elapsed.minutes', '{{n}} 分钟前', { n: minutes })
  }
  const hours = Math.round(minutes / 60)
  return translate('auto.components.pipeline.elapsed.hours', '{{n}} 小时前', { n: hours })
}

export function projectKey(task: PipelineTaskDto): string {
  return task.project_id || task.repo || translate('auto.components.pipeline.ungrouped', '未分组')
}
