#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

const here = import.meta.dirname
const dir = path.resolve(here, '../templates')
const outPath = path.resolve(here, '../../../src/cli/pipeline/default-templates.ts')
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.yaml'))
  .sort()
const entries = files.map((f) => {
  const id = f.replace(/\.yaml$/, '')
  const body = readFileSync(path.join(dir, f), 'utf8')
  return `  ${JSON.stringify(id)}: ${JSON.stringify(body)}`
})
const out =
  '// Generated from skill-guides/dev-pipeline/templates. Keep in sync via:\n' +
  '// node skill-guides/dev-pipeline/scripts/embed-templates.mjs\n\n' +
  `export const EMBEDDED_TEMPLATES: Record<string, string> = {\n${entries.join(',\n')}\n}\n`
writeFileSync(outPath, out)
console.log('wrote', outPath)
