import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { PipelineCreateDialog } from './PipelineCreateDialog'
import { PipelineFiltersBar } from './PipelineFilters'
import { PipelinePageHeader } from './PipelinePageHeader'
import { PipelineRunnerPanel } from './PipelineRunnerPanel'
import { PipelineTaskDetail } from './PipelineTaskDetail'
import { PipelineTaskList } from './PipelineTaskList'
import { usePipelinePage } from './use-pipeline-page'

export default function PipelinePage(): React.JSX.Element {
  const closePipelinePage = useAppStore((s) => s.closePipelinePage)
  const page = usePipelinePage()
  const [createOpen, setCreateOpen] = useState(false)

  const selectedTaskId = page.selectedTaskId
  const setSelectedTaskId = page.setSelectedTaskId

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return
      }
      const target = event.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        event.preventDefault()
        target.blur()
        return
      }
      if (selectedTaskId) {
        event.preventDefault()
        setSelectedTaskId(null)
        return
      }
      event.preventDefault()
      closePipelinePage()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closePipelinePage, selectedTaskId, setSelectedTaskId])

  return (
    <div className="flex h-full min-h-0 flex-col bg-background" data-testid="pipeline-page">
      <PipelinePageHeader
        taskCount={page.tasks.length}
        onClose={closePipelinePage}
        onCreate={() => setCreateOpen(true)}
      />
      <PipelineRunnerPanel
        scheduler={page.scheduler}
        config={page.config}
        configPath={page.configPath}
        availableAgents={page.availableAgents}
        onStart={page.startScheduler}
        onStop={page.stopScheduler}
        onTick={page.tickOnce}
        onSaveAgents={page.updateAgents}
      />
      <PipelineFiltersBar
        groupBy={page.groupBy}
        onGroupBy={page.setGroupBy}
        filters={page.filters}
        onFilters={page.setFilters}
        options={page.filterOptions}
      />
      {page.error ? (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {page.error}
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1">
        {page.loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {translate('auto.components.pipeline.loading', '加载中…')}
          </div>
        ) : (
          <PipelineTaskList
            groups={page.groups}
            selectedTaskId={page.selectedTaskId}
            onSelect={page.setSelectedTaskId}
          />
        )}
        {page.selectedTask ? (
          <PipelineTaskDetail
            task={page.selectedTask}
            onClose={() => page.setSelectedTaskId(null)}
            onUnblock={(note) => page.unblockTask(page.selectedTask!.id, note)}
          />
        ) : null}
      </div>
      <PipelineCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={async (input) => {
          await page.createTask(input)
        }}
      />
    </div>
  )
}
