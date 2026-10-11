import { accessSync, constants } from 'node:fs'
import path from 'node:path'
import type { PipelineRole } from './types'

/** Agents the UI/config accept for every pipeline role. */
export const PIPELINE_AGENT_OPTIONS = [
  'cursor-agent',
  'claude',
  'codex',
  'opencode',
  'gemini'
] as const

export type PipelineAgentOption = (typeof PIPELINE_AGENT_OPTIONS)[number]

const ROLE_LIST: PipelineRole[] = ['Orchestrator', 'Planner', 'Developer', 'Reviewer', 'Writer']

function pathEntries(pathEnv: string | undefined): string[] {
  const delimiter = process.platform === 'win32' ? ';' : ':'
  return [...new Set((pathEnv ?? '').split(delimiter).filter(Boolean))]
}

function candidateNames(command: string): string[] {
  if (process.platform !== 'win32') {
    return [command]
  }
  const exts = (process.env.PATHEXT ?? '.EXE;.CMD;.BAT;.COM')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
  if (path.extname(command)) {
    return [command]
  }
  return [command, ...exts.map((ext) => `${command}${ext}`)]
}

export function isCommandOnPath(
  command: string,
  pathEnv: string | undefined = process.env.PATH
): boolean {
  for (const dir of pathEntries(pathEnv)) {
    for (const name of candidateNames(command)) {
      const full = path.join(dir, name)
      try {
        accessSync(full, constants.X_OK)
        return true
      } catch {
        try {
          accessSync(full, constants.F_OK)
          return true
        } catch {
          // keep scanning
        }
      }
    }
  }
  return false
}

export function listPipelineAgentsOnPath(
  pathEnv: string | undefined = process.env.PATH
): PipelineAgentOption[] {
  return PIPELINE_AGENT_OPTIONS.filter((agent) => isCommandOnPath(agent, pathEnv))
}

/** When cursor-agent is the only known agent on PATH, prefer it for every role. */
export function defaultAgentsForAvailable(
  available: readonly string[]
): Record<PipelineRole, string> {
  const known = available.filter((agent): agent is PipelineAgentOption =>
    PIPELINE_AGENT_OPTIONS.some((option) => option === agent)
  )
  if (known.length === 1 && known[0] === 'cursor-agent') {
    return {
      Orchestrator: 'cursor-agent',
      Planner: 'cursor-agent',
      Developer: 'cursor-agent',
      Reviewer: 'cursor-agent',
      Writer: 'cursor-agent'
    }
  }

  const pick = (...prefs: PipelineAgentOption[]): string => {
    for (const pref of prefs) {
      if (known.includes(pref)) {
        return pref
      }
    }
    return prefs[0] ?? 'cursor-agent'
  }

  // Mixed PATH: keep classic role prefs; cursor-agent remains selectable in the UI.
  return {
    Orchestrator: pick('claude', 'cursor-agent', 'codex'),
    Planner: pick('claude', 'cursor-agent', 'codex'),
    Developer: pick('codex', 'cursor-agent', 'claude'),
    Reviewer: pick('claude', 'cursor-agent', 'codex'),
    Writer: pick('claude', 'cursor-agent', 'codex')
  }
}

export function ensureCursorAgentAllowed(
  agents: Record<PipelineRole, string>
): Record<PipelineRole, string> {
  const next = { ...agents }
  for (const role of ROLE_LIST) {
    if (!next[role]?.trim()) {
      next[role] = 'cursor-agent'
    }
  }
  return next
}
