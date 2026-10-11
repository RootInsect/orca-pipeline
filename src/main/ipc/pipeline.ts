import { ipcMain } from 'electron'
import { getPipelineHostService } from '../pipeline/pipeline-host-service'
import type {
  PipelineConfigAgentsPatch,
  PipelineCreateInput,
  PipelineUnblockInput
} from '../../shared/pipeline-ui-types'

export function registerPipelineHandlers(): void {
  const service = getPipelineHostService()

  ipcMain.handle('pipeline:getSnapshot', () => service.getSnapshot())
  ipcMain.handle('pipeline:createTask', (_event, input: PipelineCreateInput) =>
    service.createTask(input)
  )
  ipcMain.handle('pipeline:unblockTask', (_event, input: PipelineUnblockInput) =>
    service.unblockTask(input)
  )
  ipcMain.handle('pipeline:updateAgents', (_event, patch: PipelineConfigAgentsPatch) =>
    service.updateAgents(patch)
  )
  ipcMain.handle('pipeline:getSchedulerState', () => service.getSchedulerState())
  ipcMain.handle('pipeline:startScheduler', () => service.startScheduler())
  ipcMain.handle('pipeline:stopScheduler', () => service.stopScheduler())
  ipcMain.handle('pipeline:tickOnce', () => service.tickOnce())
  ipcMain.handle('pipeline:listAvailableAgents', () => service.availableAgents())
}
