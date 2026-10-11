import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  PipelineConfigDto,
  PipelineCreateInput,
  PipelineSchedulerState,
  PipelineSnapshot,
  PipelineTaskDto
} from '../../../../shared/pipeline-ui-types'
import { readIpcErrorDetail } from '@/lib/ipc-error'
import {
  filterPipelineTasks,
  groupPipelineTasks,
  uniqueFilterValues,
  type PipelineFilters,
  type PipelineGroupBy
} from './pipeline-grouping'

const EMPTY_FILTERS: PipelineFilters = {
  project: 'all',
  agent: 'all',
  type: 'all',
  stage: 'all',
  onlyNeedsMe: false
}

export function usePipelinePage(): {
  loading: boolean
  error: string | null
  tasks: PipelineTaskDto[]
  config: PipelineConfigDto | null
  configPath: string | null
  availableAgents: string[]
  scheduler: PipelineSchedulerState | null
  groupBy: PipelineGroupBy
  setGroupBy: (value: PipelineGroupBy) => void
  filters: PipelineFilters
  setFilters: (patch: Partial<PipelineFilters>) => void
  filterOptions: ReturnType<typeof uniqueFilterValues>
  groups: { key: string; tasks: PipelineTaskDto[] }[]
  selectedTaskId: string | null
  selectedTask: PipelineTaskDto | null
  setSelectedTaskId: (id: string | null) => void
  refresh: () => Promise<void>
  createTask: (input: PipelineCreateInput) => Promise<PipelineTaskDto>
  unblockTask: (taskId: string, note: string) => Promise<void>
  updateAgents: (agents: PipelineConfigDto['agents']) => Promise<void>
  startScheduler: () => Promise<void>
  stopScheduler: () => Promise<void>
  tickOnce: () => Promise<void>
} {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snapshot, setSnapshot] = useState<PipelineSnapshot | null>(null)
  const [groupBy, setGroupBy] = useState<PipelineGroupBy>('project')
  const [filters, setFiltersState] = useState<PipelineFilters>(EMPTY_FILTERS)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const next = await window.api.pipeline.getSnapshot()
      setSnapshot(next)
      setError(null)
    } catch (err) {
      setError(readIpcErrorDetail(err) ?? String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const offChanged = window.api.pipeline.onChanged(() => {
      void refresh()
    })
    const offScheduler = window.api.pipeline.onScheduler((state) => {
      setSnapshot((prev) => (prev ? { ...prev, scheduler: state } : prev))
    })
    return () => {
      offChanged()
      offScheduler()
    }
  }, [refresh])

  const tasks = useMemo(() => snapshot?.tasks ?? [], [snapshot?.tasks])
  const filtered = useMemo(() => filterPipelineTasks(tasks, filters), [tasks, filters])
  const groups = useMemo(() => groupPipelineTasks(filtered, groupBy), [filtered, groupBy])
  const filterOptions = useMemo(() => uniqueFilterValues(tasks), [tasks])
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  )

  useEffect(() => {
    if (selectedTaskId && !tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null)
    }
  }, [selectedTaskId, tasks])

  const setFilters = useCallback((patch: Partial<PipelineFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }))
  }, [])

  const createTask = useCallback(
    async (input: PipelineCreateInput) => {
      const task = await window.api.pipeline.createTask(input)
      await refresh()
      setSelectedTaskId(task.id)
      return task
    },
    [refresh]
  )

  const unblockTask = useCallback(
    async (taskId: string, note: string) => {
      await window.api.pipeline.unblockTask({ taskId, note })
      await refresh()
    },
    [refresh]
  )

  const updateAgents = useCallback(
    async (agents: PipelineConfigDto['agents']) => {
      await window.api.pipeline.updateAgents({ agents })
      await refresh()
    },
    [refresh]
  )

  const startScheduler = useCallback(async () => {
    await window.api.pipeline.startScheduler()
    await refresh()
  }, [refresh])

  const stopScheduler = useCallback(async () => {
    await window.api.pipeline.stopScheduler()
    await refresh()
  }, [refresh])

  const tickOnce = useCallback(async () => {
    await window.api.pipeline.tickOnce()
    await refresh()
  }, [refresh])

  return {
    loading,
    error,
    tasks,
    config: snapshot?.config ?? null,
    configPath: snapshot?.configPath ?? null,
    availableAgents: snapshot?.availableAgents ?? ['cursor-agent'],
    scheduler: snapshot?.scheduler ?? null,
    groupBy,
    setGroupBy,
    filters,
    setFilters,
    filterOptions,
    groups,
    selectedTaskId,
    selectedTask,
    setSelectedTaskId,
    refresh,
    createTask,
    unblockTask,
    updateAgents,
    startScheduler,
    stopScheduler,
    tickOnce
  }
}
