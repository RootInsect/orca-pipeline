import { isRecord } from './parse-helpers'
import type { GhExec, OrcaExecResult, PipelineTask } from './types'

export type CiPollResult =
  | { state: 'green' }
  | { state: 'red'; summary: string }
  | { state: 'pending'; summary: string }
  | { state: 'unknown'; summary: string }

function summarizeChecks(json: unknown): CiPollResult {
  if (!json || typeof json !== 'object') {
    return { state: 'unknown', summary: 'CI response was not JSON' }
  }
  if (Array.isArray(json)) {
    if (json.length === 0) {
      return { state: 'pending', summary: 'No checks reported yet' }
    }
    const states = json.map((row) => {
      if (!isRecord(row)) {
        return 'UNKNOWN'
      }
      return String(row.state || row.conclusion || row.status || 'UNKNOWN').toUpperCase()
    })
    if (
      states.some((state) =>
        ['FAILURE', 'FAILED', 'ERROR', 'CANCELLED', 'TIMED_OUT'].includes(state)
      )
    ) {
      return {
        state: 'red',
        summary:
          states.filter((state) => state.includes('FAIL') || state === 'ERROR').join(', ') ||
          'failed'
      }
    }
    if (states.every((state) => ['SUCCESS', 'SKIPPED', 'NEUTRAL', 'COMPLETED'].includes(state))) {
      return { state: 'green' }
    }
    return { state: 'pending', summary: states.join(', ') }
  }
  if (!isRecord(json)) {
    return { state: 'unknown', summary: 'Unrecognized CI payload' }
  }
  const rollup = json.statusCheckRollup
  if (Array.isArray(rollup)) {
    return summarizeChecks(rollup)
  }
  return { state: 'unknown', summary: 'Unrecognized CI payload' }
}

export async function pollPullRequestCi(input: {
  task: PipelineTask
  gh: GhExec
  dryRun: boolean
}): Promise<CiPollResult> {
  if (input.dryRun) {
    return { state: 'green' }
  }
  if (!input.task.pr_url) {
    return { state: 'unknown', summary: 'pr_url missing' }
  }
  const prRef = input.task.pr_url
  const checks: OrcaExecResult = await input.gh(
    ['pr', 'checks', prRef, '--json', 'name,state,conclusion,bucket'],
    { timeoutMs: 60_000 }
  )
  if (checks.ok && checks.json) {
    return summarizeChecks(checks.json)
  }
  const view = await input.gh(['pr', 'view', prRef, '--json', 'statusCheckRollup,url'], {
    timeoutMs: 60_000
  })
  if (view.ok && view.json) {
    return summarizeChecks(view.json)
  }
  return {
    state: 'unknown',
    summary: (checks.stderr || view.stderr || 'gh pr checks failed').trim().slice(0, 300)
  }
}

export function extractPrUrl(text: string): string | null {
  const match = text.match(/https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/i)
  return match ? match[0] : null
}
