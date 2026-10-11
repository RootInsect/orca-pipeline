import type {
  PipelineConfigAgentsPatch,
  PipelineConfigDto,
  PipelineCreateInput,
  PipelineSchedulerState,
  PipelineSnapshot,
  PipelineTaskDto,
  PipelineUnblockInput
} from '../../shared/pipeline-ui-types'

export type PipelineApi = {
  getSnapshot: () => Promise<PipelineSnapshot>
  createTask: (input: PipelineCreateInput) => Promise<PipelineTaskDto>
  unblockTask: (input: PipelineUnblockInput) => Promise<PipelineTaskDto>
  updateAgents: (patch: PipelineConfigAgentsPatch) => Promise<PipelineConfigDto>
  getSchedulerState: () => Promise<PipelineSchedulerState>
  startScheduler: () => Promise<PipelineSchedulerState>
  stopScheduler: () => Promise<PipelineSchedulerState>
  tickOnce: () => Promise<PipelineSchedulerState>
  listAvailableAgents: () => Promise<string[]>
  onChanged: (callback: () => void) => () => void
  onScheduler: (callback: (state: PipelineSchedulerState) => void) => () => void
}
