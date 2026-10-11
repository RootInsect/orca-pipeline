import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { PipelineTaskDto, PipelineUiStatusDot } from '../../../../shared/pipeline-ui-types'
import { translate } from '@/i18n/i18n'
import { statusDotLabel } from './pipeline-display'
import { PipelineTaskRow } from './PipelineTaskRow'

const STATUS_DOTS: readonly PipelineUiStatusDot[] = ['running', 'waiting_on_me', 'blocked', 'done']

function groupLabel(key: string): string {
  const statusDot = STATUS_DOTS.find((dot) => dot === key)
  if (statusDot) {
    return statusDotLabel(statusDot)
  }
  return key
}

export function PipelineTaskList({
  groups,
  selectedTaskId,
  onSelect
}: {
  groups: { key: string; tasks: PipelineTaskDto[] }[]
  selectedTaskId: string | null
  onSelect: (id: string) => void
}): React.JSX.Element {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  if (groups.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12 text-sm text-muted-foreground">
        {translate('auto.components.pipeline.empty', '还没有流水线任务。点「发布任务」开始。')}
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-sleek px-2 py-2">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.key] === true
        return (
          <section key={group.key} className="mb-2">
            <button
              type="button"
              className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted/50"
              onClick={() => setCollapsed((prev) => ({ ...prev, [group.key]: !isCollapsed }))}
            >
              {isCollapsed ? (
                <ChevronRight className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              <span className="truncate">{groupLabel(group.key)}</span>
              <span className="text-muted-foreground/70">{group.tasks.length}</span>
            </button>
            {isCollapsed
              ? null
              : group.tasks.map((task) => (
                  <PipelineTaskRow
                    key={task.id}
                    task={task}
                    selected={selectedTaskId === task.id}
                    onSelect={() => onSelect(task.id)}
                  />
                ))}
          </section>
        )
      })}
    </div>
  )
}
