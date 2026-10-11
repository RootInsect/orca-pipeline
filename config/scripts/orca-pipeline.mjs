#!/usr/bin/env node
/** Thin launcher: `orca-pipeline …` → built CLI `pipeline …`. */
import { spawnSync } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import path from 'node:path'

const scriptPath = realpathSync(import.meta.filename)
const repoRoot = path.resolve(path.dirname(scriptPath), '..', '..')
const cliEntry =
  process.env.ORCA_DEV_CLI_ENTRY_PATH ?? path.join(repoRoot, 'out', 'cli', 'index.js')

if (!existsSync(cliEntry)) {
  console.error("orca-pipeline: CLI not built yet. Run 'pnpm run build:cli' first.")
  process.exit(1)
}

const result = spawnSync(process.execPath, [cliEntry, 'pipeline', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env
})
process.exit(result.status ?? 1)
