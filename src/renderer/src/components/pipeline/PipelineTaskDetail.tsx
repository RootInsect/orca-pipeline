import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import type { PipelineStage, PipelineTaskDto } from '../../../../shared/pipeline-ui-types'
import { PIPELINE_TIMELINE_STAGES } from '../../../../shared/pipeline-ui-types'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { needsHuman, taskTypeLabel } from './pipeline-display'

function timelineIndex(stage: PipelineStage): number {
  return PIPELINE_TIMELINE_STAGES.indexOf(stage)
}

function stageState(task: PipelineTaskDto, stage: PipelineStage): 'done' | 'current' | 'pending' {
  if (task.stage === 'done' || task.status === 'done') {
    return 'done'
  }
  const currentIdx = timelineIndex(task.stage)
  const stageIdx = timelineIndex(stage)
  if (stageIdx === -1 || currentIdx === -1) {
    return stage === task.stage ? 'current' : 'pending'
  }
  if (stageIdx < currentIdx) {
    return 'done'
  }
  if (stageIdx === currentIdx) {
    return 'current'
  }
  return 'pending'
}

export function PipelineTaskDetail({
  task,
  onClose,
  onUnblock
}: {
  task: PipelineTaskDto
  onClose: () => void
  onUnblock: (note: string) => Promise<void>
}): React.JSX.Element {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const waiting = needsHuman(task)

  return (
    <aside className="flex h-full w-full max-w-md flex-col border-l border-border bg-background">
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{task.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {taskTypeLabel(task.type)} · {task.id}
          </p>
        </div>
        <Button type="button" size="xs" variant="ghost" onClick={onClose}>
          {translate('auto.components.pipeline.detail.close', '关闭')}
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto scrollbar-sleek px-4 py-3">
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {translate('auto.components.pipeline.detail.timeline', '阶段时间线')}
          </h3>
          <ol className="space-y-1.5">
            {PIPELINE_TIMELINE_STAGES.map((stage) => {
              const state = stageState(task, stage)
              return (
                <li key={stage} className="flex items-center gap-2 text-sm">
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      state === 'done' && 'bg-muted-foreground/40',
                      state === 'current' && 'bg-chart-2',
                      state === 'pending' && 'bg-border'
                    )}
                  />
                  <span className={cn(state === 'pending' && 'text-muted-foreground')}>
                    {stage}
                  </span>
                  {state === 'current' && task.runner.role ? (
                    <span className="text-xs text-muted-foreground">
                      {task.runner.role}
                      {task.runner.agent ? ` · ${task.runner.agent}` : ''}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ol>
        </section>

        {waiting ? (
          <section className="rounded-md border border-border bg-muted/40 p-3">
            <h3 className="text-sm font-medium">
              {translate('auto.components.pipeline.detail.gate', '等待你的回复')}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {task.runner.blocker ||
                translate(
                  'auto.components.pipeline.detail.gateHint',
                  '回答后将解除编排门禁并继续。'
                )}
            </p>
            <Textarea
              className="mt-2 min-h-20"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={translate(
                'auto.components.pipeline.detail.replyPlaceholder',
                '验收标准 / 补充说明…'
              )}
            />
            <Button
              type="button"
              size="sm"
              className="mt-2"
              disabled={busy || !note.trim()}
              onClick={() => {
                setBusy(true)
                void onUnblock(note.trim()).finally(() => setBusy(false))
              }}
            >
              {translate('auto.components.pipeline.detail.reply', '提交并继续')}
            </Button>
          </section>
        ) : null}

        <section className="space-y-1 text-sm">
          <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {translate('auto.components.pipeline.detail.links', '链接')}
          </h3>
          <p>
            <span className="text-muted-foreground">worktree: </span>
            {task.orca.worktree_id || '—'}
          </p>
          <p>
            <span className="text-muted-foreground">run: </span>
            {task.orca.run_id || '—'}
          </p>
          <p>
            <span className="text-muted-foreground">PR: </span>
            {task.pr_url ? (
              <a
                href={task.pr_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                {task.pr_url}
                <ExternalLink className="size-3" />
              </a>
            ) : (
              '—'
            )}
          </p>
          <p>
            <span className="text-muted-foreground">CI loops: </span>
            {task.ci_loops}/{task.max_ci_loops}
          </p>
          <p>
            <span className="text-muted-foreground">
              {translate('auto.components.pipeline.detail.experience', '经验笔记')}:{' '}
            </span>
            {task.experience.written.length > 0 ? task.experience.written.join(', ') : '—'}
          </p>
        </section>

        {task.notes.length > 0 ? (
          <section>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Notes
            </h3>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {task.notes.map((entry) => (
                <li key={entry}>· {entry}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {task.body ? (
          <section>
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {translate('auto.components.pipeline.detail.body', '描述')}
            </h3>
            <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs">
              {task.body}
            </pre>
          </section>
        ) : null}
      </div>
    </aside>
  )
}
