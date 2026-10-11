import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { taskTypeLabel } from './pipeline-display'
import type { PipelineFilters, PipelineGroupBy } from './pipeline-grouping'

function Chip({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-2 py-1 text-xs transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
    >
      {children}
    </button>
  )
}

export function PipelineFiltersBar({
  groupBy,
  onGroupBy,
  filters,
  onFilters,
  options
}: {
  groupBy: PipelineGroupBy
  onGroupBy: (value: PipelineGroupBy) => void
  filters: PipelineFilters
  onFilters: (patch: Partial<PipelineFilters>) => void
  options: {
    projects: string[]
    agents: string[]
    types: string[]
    stages: string[]
  }
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {translate('auto.components.pipeline.groupBy', '分组')}
        </span>
        {(
          [
            ['project', translate('auto.components.pipeline.group.project', '项目')],
            ['agent', translate('auto.components.pipeline.group.agent', 'Agent')],
            ['status', translate('auto.components.pipeline.group.status', '状态')]
          ] as const
        ).map(([value, label]) => (
          <Chip key={value} active={groupBy === value} onClick={() => onGroupBy(value)}>
            {label}
          </Chip>
        ))}
        <div className="mx-1 h-4 w-px bg-border" />
        <Button
          type="button"
          size="xs"
          variant={filters.onlyNeedsMe ? 'default' : 'outline'}
          onClick={() => onFilters({ onlyNeedsMe: !filters.onlyNeedsMe })}
        >
          {translate('auto.components.pipeline.onlyNeedsMe', '只看需要我')}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-7 rounded-md border border-border bg-background px-2 text-xs"
          value={filters.project}
          onChange={(event) => onFilters({ project: event.target.value })}
        >
          <option value="all">
            {translate('auto.components.pipeline.filter.allProjects', '全部项目')}
          </option>
          {options.projects.map((project) => (
            <option key={project} value={project}>
              {project}
            </option>
          ))}
        </select>
        <select
          className="h-7 rounded-md border border-border bg-background px-2 text-xs"
          value={filters.agent}
          onChange={(event) => onFilters({ agent: event.target.value })}
        >
          <option value="all">
            {translate('auto.components.pipeline.filter.allAgents', '全部 Agent')}
          </option>
          {options.agents.map((agent) => (
            <option key={agent} value={agent}>
              {agent}
            </option>
          ))}
        </select>
        <select
          className="h-7 rounded-md border border-border bg-background px-2 text-xs"
          value={filters.type}
          onChange={(event) => onFilters({ type: event.target.value })}
        >
          <option value="all">
            {translate('auto.components.pipeline.filter.allTypes', '全部类型')}
          </option>
          {options.types.map((type) => (
            <option key={type} value={type}>
              {taskTypeLabel(type)}
            </option>
          ))}
        </select>
        <select
          className="h-7 rounded-md border border-border bg-background px-2 text-xs"
          value={filters.stage}
          onChange={(event) => onFilters({ stage: event.target.value })}
        >
          <option value="all">
            {translate('auto.components.pipeline.filter.allStages', '全部阶段')}
          </option>
          {options.stages.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
