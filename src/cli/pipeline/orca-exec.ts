import { spawn } from 'node:child_process'
import { isRecord } from './parse-helpers'
import type { GhExec, OrcaExec, OrcaExecResult } from './types'

export type { GhExec, OrcaExec, OrcaExecResult }

function tryParseJson(text: string): unknown {
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }
  try {
    return JSON.parse(trimmed)
  } catch {
    // Some CLIs print logs before JSON; take the last JSON object/array.
    const startObject = trimmed.lastIndexOf('{')
    const startArray = trimmed.lastIndexOf('[')
    const start = Math.max(startObject, startArray)
    if (start < 0) {
      return null
    }
    try {
      return JSON.parse(trimmed.slice(start))
    } catch {
      return null
    }
  }
}

export function createProcessExec(command: string): OrcaExec {
  return (args, options = {}) =>
    new Promise((resolve) => {
      const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
        windowsHide: true
      })
      let stdout = ''
      let stderr = ''
      let settled = false
      const timer =
        typeof options.timeoutMs === 'number' && options.timeoutMs > 0
          ? setTimeout(() => {
              child.kill('SIGTERM')
            }, options.timeoutMs)
          : null
      child.stdout.on('data', (chunk: Buffer | string) => {
        stdout += chunk.toString()
      })
      child.stderr.on('data', (chunk: Buffer | string) => {
        stderr += chunk.toString()
      })
      child.on('error', (error) => {
        if (settled) {
          return
        }
        settled = true
        if (timer) {
          clearTimeout(timer)
        }
        resolve({
          ok: false,
          code: null,
          stdout,
          stderr: `${stderr}\n${error.message}`.trim(),
          json: null
        })
      })
      child.on('close', (code) => {
        if (settled) {
          return
        }
        settled = true
        if (timer) {
          clearTimeout(timer)
        }
        const json = tryParseJson(stdout)
        resolve({
          ok: code === 0,
          code,
          stdout,
          stderr,
          json
        })
      })
    })
}

export function createOrcaExec(orcaCommand: string): OrcaExec {
  return createProcessExec(orcaCommand)
}

export function createGhExec(ghCommand = process.env.PIPELINE_GH_COMMAND?.trim() || 'gh'): GhExec {
  return createProcessExec(ghCommand)
}

export function dryRunExec(prefix: string): OrcaExec {
  return async (args) => {
    const fake: OrcaExecResult = {
      ok: true,
      code: 0,
      stdout: '',
      stderr: '',
      json: null
    }
    if (args[0] === 'worktree' && args[1] === 'create') {
      fake.json = { id: `dryrun-repo::/tmp/${prefix}-wt`, name: `${prefix}-wt` }
      fake.stdout = JSON.stringify(fake.json)
      return fake
    }
    if (args[0] === 'orchestration' && args[1] === 'run-create') {
      fake.json = { id: `run_dry_${prefix}` }
      fake.stdout = JSON.stringify(fake.json)
      return fake
    }
    if (args[0] === 'orchestration' && args[1] === 'worker-start') {
      fake.json = {
        dispatchId: `dispatch_dry_${Date.now()}`,
        taskId: `orch_task_dry_${Date.now()}`,
        status: 'running'
      }
      fake.stdout = JSON.stringify(fake.json)
      return fake
    }
    if (args[0] === 'orchestration' && args[1] === 'worker-show') {
      fake.json = {
        observation: { status: 'exited' },
        projection: { liveness: { verdict: 'exited' } },
        outcome: 'succeeded',
        report: {
          outcome: 'succeeded',
          body: 'dry-run worker succeeded\nhttps://github.com/example/repo/pull/1'
        }
      }
      fake.stdout = JSON.stringify(fake.json)
      return fake
    }
    if (args[0] === 'orchestration' && args[1] === 'gate-create') {
      fake.json = { id: `gate_dry_${Date.now()}` }
      fake.stdout = JSON.stringify(fake.json)
      return fake
    }
    if (args[0] === 'orchestration' && args[1] === 'gate-list') {
      fake.json = { gates: [] }
      fake.stdout = JSON.stringify(fake.json)
      return fake
    }
    if (args[0] === 'status') {
      fake.json = { ok: true }
      fake.stdout = JSON.stringify(fake.json)
      return fake
    }
    fake.json = { dry_run: true, args }
    fake.stdout = JSON.stringify(fake.json)
    return fake
  }
}

export function readJsonField(json: unknown, ...keys: string[]): string | null {
  let current: unknown = json
  for (const key of keys) {
    if (!isRecord(current)) {
      return null
    }
    current = current[key]
  }
  return typeof current === 'string' && current.length > 0 ? current : null
}
