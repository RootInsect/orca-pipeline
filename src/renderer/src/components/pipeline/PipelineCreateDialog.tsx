import { useMemo, useState } from 'react'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { taskTypeLabel } from './pipeline-display'
import type { PipelineCreateInput, PipelineTaskType } from '../../../../shared/pipeline-ui-types'

const TYPE_OPTIONS: (PipelineTaskType | 'auto')[] = [
  'auto',
  'bug_fix',
  'new_feature',
  'debug',
  'small_change'
]

export function PipelineCreateDialog({
  open,
  onOpenChange,
  onSubmit
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: PipelineCreateInput) => Promise<void>
}): React.JSX.Element {
  const repos = useAppStore((s) => s.repos)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [repoId, setRepoId] = useState('')
  const [typeHint, setTypeHint] = useState<PipelineTaskType | 'auto'>('auto')
  const [domainTags, setDomainTags] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const repoOptions = useMemo(
    () =>
      [...repos]
        .map((repo) => ({
          id: repo.id,
          label: repo.displayName || repo.path,
          // Prefer displayName (often owner/repo); path is the fallback slug.
          slug: repo.displayName || repo.path
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [repos]
  )

  const reset = (): void => {
    setTitle('')
    setBody('')
    setRepoId('')
    setTypeHint('auto')
    setDomainTags('')
    setError(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset()
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {translate('auto.components.pipeline.create.title', '发布任务')}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span>{translate('auto.components.pipeline.create.fieldTitle', '标题')}</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{translate('auto.components.pipeline.create.fieldBody', '描述')}</span>
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              className="min-h-24"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{translate('auto.components.pipeline.create.fieldRepo', '仓库 / 项目')}</span>
            <select
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              value={repoId}
              onChange={(event) => setRepoId(event.target.value)}
            >
              <option value="">
                {translate('auto.components.pipeline.create.noRepo', '（可选）')}
              </option>
              {repoOptions.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>{translate('auto.components.pipeline.create.fieldType', '类型')}</span>
            <select
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              value={typeHint}
              onChange={(event) => setTypeHint(event.target.value as PipelineTaskType | 'auto')}
            >
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {type === 'auto'
                    ? translate('auto.components.pipeline.create.autoType', '自动分类')
                    : taskTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>
              {translate('auto.components.pipeline.create.fieldTags', '领域标签（逗号分隔）')}
            </span>
            <Input
              value={domainTags}
              onChange={(event) => setDomainTags(event.target.value)}
              placeholder="auth, docker"
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {translate('auto.components.pipeline.create.cancel', '取消')}
          </Button>
          <Button
            type="button"
            disabled={busy || !title.trim()}
            onClick={() => {
              const selected = repoOptions.find((repo) => repo.id === repoId)
              setBusy(true)
              setError(null)
              void onSubmit({
                title: title.trim(),
                body: body.trim() || undefined,
                repo: selected?.slug,
                projectId: selected?.slug?.replace(/\//g, '__'),
                typeHint: typeHint === 'auto' ? undefined : typeHint,
                domainTags: domainTags
                  .split(/[,，\s]+/)
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              })
                .then(() => {
                  reset()
                  onOpenChange(false)
                })
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : String(err))
                })
                .finally(() => setBusy(false))
            }}
          >
            {busy
              ? translate('auto.components.pipeline.create.submitting', '提交中…')
              : translate('auto.components.pipeline.create.submit', '发布')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
