import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse, stringify } from 'yaml'
import {
  defaultConfigPath,
  defaultExperienceRoot,
  defaultPipelineHome,
  defaultTasksDir,
  expandHome
} from './paths'
import { asNumber, asString, asStringArray, errnoCode, isRecord } from './parse-helpers'
import type { PipelineConfig, PipelineRole } from './types'

const DEFAULT_AGENTS: Record<PipelineRole, string> = {
  Orchestrator: 'claude',
  Planner: 'claude',
  Developer: 'codex',
  Reviewer: 'claude',
  Writer: 'claude'
}

const ROLE_LIST: PipelineRole[] = ['Orchestrator', 'Planner', 'Developer', 'Reviewer', 'Writer']

export function defaultPipelineConfig(): PipelineConfig {
  return {
    tasks_dir: process.env.PIPELINE_TASKS_DIR?.trim() || defaultTasksDir(),
    experience_root: defaultExperienceRoot(),
    orca_command:
      process.env.ORCA_CLI_COMMAND?.trim() ||
      process.env.PIPELINE_ORCA_COMMAND?.trim() ||
      (process.env.ORCA_DEV_REPO_ROOT ? 'orca-dev' : 'orca'),
    dry_run: process.env.PIPELINE_DRY_RUN === '1',
    poll_interval_ms: 5000,
    worker_wait_timeout_ms: 900_000,
    agents: { ...DEFAULT_AGENTS },
    auto_skip_clarify_keywords: ['repro', 'reproduce', '复现', 'steps to reproduce', 'typeerror']
  }
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizePipelineConfig(raw: unknown): PipelineConfig {
  const base = defaultPipelineConfig()
  if (!isRecord(raw)) {
    return base
  }
  const agentsRaw = isRecord(raw.agents) ? raw.agents : {}
  const agents = { ...base.agents }
  for (const role of ROLE_LIST) {
    const value = agentsRaw[role]
    if (typeof value === 'string' && value.trim()) {
      agents[role] = value.trim()
    }
  }
  if (process.env.PIPELINE_DEVELOPER_AGENT?.trim()) {
    agents.Developer = process.env.PIPELINE_DEVELOPER_AGENT.trim()
  }
  if (process.env.PIPELINE_REVIEWER_AGENT?.trim()) {
    agents.Reviewer = process.env.PIPELINE_REVIEWER_AGENT.trim()
  }
  if (process.env.PIPELINE_PLANNER_AGENT?.trim()) {
    agents.Planner = process.env.PIPELINE_PLANNER_AGENT.trim()
  }
  return {
    tasks_dir: expandHome(asString(raw.tasks_dir, base.tasks_dir)),
    experience_root: expandHome(asString(raw.experience_root, base.experience_root)),
    orca_command: asString(raw.orca_command, base.orca_command),
    dry_run: asBoolean(raw.dry_run, base.dry_run) || process.env.PIPELINE_DRY_RUN === '1',
    poll_interval_ms: asNumber(raw.poll_interval_ms, base.poll_interval_ms),
    worker_wait_timeout_ms: asNumber(raw.worker_wait_timeout_ms, base.worker_wait_timeout_ms),
    agents,
    auto_skip_clarify_keywords: Array.isArray(raw.auto_skip_clarify_keywords)
      ? asStringArray(raw.auto_skip_clarify_keywords)
      : base.auto_skip_clarify_keywords
  }
}

export async function loadPipelineConfig(
  configPath = defaultConfigPath()
): Promise<PipelineConfig> {
  try {
    const text = await readFile(configPath, 'utf8')
    return normalizePipelineConfig(parse(text))
  } catch (error) {
    if (errnoCode(error) === 'ENOENT') {
      return defaultPipelineConfig()
    }
    throw error
  }
}

export async function writePipelineConfig(
  config: PipelineConfig,
  configPath = defaultConfigPath()
): Promise<void> {
  await mkdir(path.dirname(configPath), { recursive: true })
  await mkdir(defaultPipelineHome(), { recursive: true })
  const body = stringify({
    tasks_dir: config.tasks_dir,
    experience_root: config.experience_root,
    orca_command: config.orca_command,
    dry_run: config.dry_run,
    poll_interval_ms: config.poll_interval_ms,
    worker_wait_timeout_ms: config.worker_wait_timeout_ms,
    agents: config.agents,
    auto_skip_clarify_keywords: config.auto_skip_clarify_keywords
  })
  await writeFile(configPath, body, 'utf8')
}
