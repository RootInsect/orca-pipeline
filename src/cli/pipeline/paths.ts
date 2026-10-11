import { homedir } from 'node:os'
import path from 'node:path'

export function expandHome(input: string): string {
  if (input === '~') {
    return homedir()
  }
  if (input.startsWith('~/') || input.startsWith('~\\')) {
    return path.join(homedir(), input.slice(2))
  }
  return input
}

export function defaultPipelineHome(): string {
  return path.join(homedir(), '.pipeline')
}

export function defaultTasksDir(): string {
  return path.join(defaultPipelineHome(), 'tasks')
}

export function defaultExperienceRoot(): string {
  return (
    process.env.PIPELINE_EXPERIENCE_ROOT?.trim() || path.join(defaultPipelineHome(), 'experience')
  )
}

export function defaultConfigPath(): string {
  return process.env.PIPELINE_CONFIG?.trim() || path.join(defaultPipelineHome(), 'config.yaml')
}

/** skill-guides/dev-pipeline when running from a checkout; null if not found. */
export function resolveSkillGuideRoot(cwd = process.cwd()): string | null {
  // Why: CLI emits CommonJS, so avoid import.meta; __dirname works in tsc output.
  const moduleDir = __dirname
  const candidates = [
    process.env.PIPELINE_SKILL_ROOT?.trim(),
    process.env.ORCA_DEV_REPO_ROOT
      ? path.join(process.env.ORCA_DEV_REPO_ROOT, 'skill-guides', 'dev-pipeline')
      : null,
    path.resolve(cwd, 'skill-guides', 'dev-pipeline'),
    path.resolve(moduleDir, '../../../skill-guides/dev-pipeline'),
    path.resolve(moduleDir, '../../../../skill-guides/dev-pipeline')
  ]
  for (const candidate of candidates) {
    if (candidate && candidate.length > 0) {
      return candidate
    }
  }
  return null
}
