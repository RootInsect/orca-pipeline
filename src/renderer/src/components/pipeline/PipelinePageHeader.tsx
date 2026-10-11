import { GitBranch, Plus, X } from 'lucide-react'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export function PipelinePageHeader({
  taskCount,
  onClose,
  onCreate
}: {
  taskCount: number
  onClose: () => void
  onCreate: () => void
}): React.JSX.Element {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            onClick={onClose}
            aria-label={translate('auto.components.pipeline.close', '关闭流水线')}
          >
            <X className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6}>
          {translate('auto.components.pipeline.closeTooltip', '关闭 · Esc')}
        </TooltipContent>
      </Tooltip>
      <div className="mx-1 h-5 w-px bg-border/50" aria-hidden />
      <GitBranch className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold">
          {translate('auto.components.pipeline.title', '流水线 / Pipeline')}
        </h1>
        <p className="text-xs text-muted-foreground">
          {translate('auto.components.pipeline.taskCount', '{{count}} 个任务', {
            count: taskCount
          })}
        </p>
      </div>
      <Button type="button" size="sm" onClick={onCreate}>
        <Plus className="size-4" />
        {translate('auto.components.pipeline.publish', '发布任务')}
      </Button>
    </header>
  )
}
