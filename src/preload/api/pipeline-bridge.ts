import { ipcRenderer } from 'electron'
import type { PipelineApi } from './pipeline-api'
import type {
  PipelineConfigAgentsPatch,
  PipelineCreateInput,
  PipelineSchedulerState,
  PipelineUnblockInput
} from '../../shared/pipeline-ui-types'

export const pipelineApi: PipelineApi = {
  getSnapshot: () => ipcRenderer.invoke('pipeline:getSnapshot'),
  createTask: (input: PipelineCreateInput) => ipcRenderer.invoke('pipeline:createTask', input),
  unblockTask: (input: PipelineUnblockInput) => ipcRenderer.invoke('pipeline:unblockTask', input),
  updateAgents: (patch: PipelineConfigAgentsPatch) =>
    ipcRenderer.invoke('pipeline:updateAgents', patch),
  getSchedulerState: () => ipcRenderer.invoke('pipeline:getSchedulerState'),
  startScheduler: () => ipcRenderer.invoke('pipeline:startScheduler'),
  stopScheduler: () => ipcRenderer.invoke('pipeline:stopScheduler'),
  tickOnce: () => ipcRenderer.invoke('pipeline:tickOnce'),
  listAvailableAgents: () => ipcRenderer.invoke('pipeline:listAvailableAgents'),
  onChanged: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on('pipeline:changed', listener)
    return () => ipcRenderer.removeListener('pipeline:changed', listener)
  },
  onScheduler: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, state: PipelineSchedulerState): void =>
      callback(state)
    ipcRenderer.on('pipeline:scheduler', listener)
    return () => ipcRenderer.removeListener('pipeline:scheduler', listener)
  }
}
