import { ExternalLink } from 'lucide-react'
import type { PipelineTaskDto } from '../../../../shared/pipeline-ui-types'
import { pipelineTaskStatusDot } from '../../../../shared/pipeline-ui-types'
import { cn } from '@/lib/utils'
import { elapsedLabel, statusDotClass, statusDotLabel, taskTypeLabel } from './pipeline-display'

export function PipelineTaskRow({
  task,
  selected,
  onSelect
}: {
  task: PipelineTaskDto
  selected: boolean
  onSelect: () => void
}): React.JSX.Element {
  const dot = pipelineTaskStatusDot(task)
  const role = task.runner.role
  const agent = task.runner.agent || task.orca.develop_agent
  const meta = [role, agent].filter(Boolean).join(' · ')
  const side = elapsedLabel(task)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
        selected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/60'
      )}
    >
      <span
        className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', statusDotClass(dot))}
        title={statusDotLabel(dot)}
        aria-label={statusDotLabel(dot)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-sm font-medium">{task.title}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{taskTypeLabel(task.type)}</span>
        </div>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span>{task.stage}</span>
          {meta ? <span>{meta}</span> : null}
          {task.orca.worktree_id ? <span className="truncate">{task.orca.worktree_id}</span> : null}
          {task.pr_url ? (
            <a
              href={task.pr_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-primary hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              PR
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      </div>
      {side ? (
        <span className="max-w-[10rem] shrink-0 truncate text-right text-xs text-muted-foreground">
          {side}
        </span>
      ) : null}
    </button>
  )
}
