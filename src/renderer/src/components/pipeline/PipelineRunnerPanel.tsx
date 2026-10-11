import type {
  PipelineConfigDto,
  PipelineRole,
  PipelineSchedulerState
} from '../../../../shared/pipeline-ui-types'
import { translate } from '@/i18n/i18n'
import { Button } from '@/components/ui/button'

const ROLES: PipelineRole[] = ['Developer', 'Reviewer', 'Planner', 'Orchestrator', 'Writer']

export function PipelineRunnerPanel({
  scheduler,
  config,
  configPath,
  availableAgents,
  onStart,
  onStop,
  onTick,
  onSaveAgents
}: {
  scheduler: PipelineSchedulerState | null
  config: PipelineConfigDto | null
  configPath: string | null
  availableAgents: string[]
  onStart: () => Promise<void>
  onStop: () => Promise<void>
  onTick: () => Promise<void>
  onSaveAgents: (agents: PipelineConfigDto['agents']) => Promise<void>
}): React.JSX.Element {
  const running = scheduler?.running === true
  const agents = config?.agents

  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">
          {translate('auto.components.pipeline.runner.title', '调度器')}
        </span>
        <span className={running ? 'text-xs text-chart-2' : 'text-xs text-muted-foreground'}>
          {running
            ? translate('auto.components.pipeline.runner.running', '运行中')
            : translate('auto.components.pipeline.runner.stopped', '已停止')}
        </span>
        {running ? (
          <Button type="button" size="xs" variant="outline" onClick={() => void onStop()}>
            {translate('auto.components.pipeline.runner.stop', '停止')}
          </Button>
        ) : (
          <Button type="button" size="xs" onClick={() => void onStart()}>
            {translate('auto.components.pipeline.runner.start', '启动')}
          </Button>
        )}
        <Button type="button" size="xs" variant="ghost" onClick={() => void onTick()}>
          {translate('auto.components.pipeline.runner.tick', '单步')}
        </Button>
        {scheduler?.lastTickAt ? (
          <span className="text-xs text-muted-foreground">
            {translate('auto.components.pipeline.runner.lastTick', '上次')}:{' '}
            {new Date(scheduler.lastTickAt).toLocaleTimeString()}
          </span>
        ) : null}
        {scheduler?.lastError ? (
          <span className="text-xs text-destructive">{scheduler.lastError}</span>
        ) : null}
      </div>

      {agents ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((role) => (
            <label key={role} className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">{role}</span>
              <select
                className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                value={agents[role]}
                onChange={(event) => {
                  const next = { ...agents, [role]: event.target.value }
                  void onSaveAgents(next)
                }}
              >
                {availableAgents.map((agent) => (
                  <option key={agent} value={agent}>
                    {agent}
                  </option>
                ))}
                {!availableAgents.includes(agents[role]) ? (
                  <option value={agents[role]}>{agents[role]}</option>
                ) : null}
              </select>
            </label>
          ))}
        </div>
      ) : null}
      {configPath ? (
        <p className="truncate text-[11px] text-muted-foreground">
          {translate('auto.components.pipeline.runner.configPath', '配置')}: {configPath}
        </p>
      ) : null}
    </div>
  )
}
