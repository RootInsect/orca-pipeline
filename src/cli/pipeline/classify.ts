import type { TaskType } from './types'

const RULES: { type: TaskType; patterns: RegExp[] }[] = [
  {
    type: 'bug_fix',
    patterns: [
      /\bbug\b/i,
      /\bfix\b/i,
      /regression/i,
      /crash/i,
      /typeerror/i,
      /报错/,
      /崩溃/,
      /修复/,
      /修\s*bug/i
    ]
  },
  {
    type: 'new_feature',
    patterns: [
      /\bfeature\b/i,
      /\badd\b.+\bsupport\b/i,
      /new feature/i,
      /新功能/,
      /从无到有/,
      /实现.*能力/
    ]
  },
  {
    type: 'debug',
    patterns: [/\bdebug\b/i, /investigat/i, /troubleshoot/i, /排查/, /调试/, /根因/, /why is/i]
  },
  {
    type: 'small_change',
    patterns: [/typo/i, /copy change/i, /wording/i, /文案/, /小改/, /小修/, /config tweak/i, /拼写/]
  }
]

export function classifyTaskType(input: {
  typeHint?: string | null
  title: string
  body: string
  labels?: string[]
}): TaskType {
  const hint = input.typeHint?.trim()
  if (hint === 'bug_fix' || hint === 'new_feature' || hint === 'debug' || hint === 'small_change') {
    return hint
  }
  const haystack = [input.title, input.body, ...(input.labels ?? [])].join('\n')
  for (const rule of RULES) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return rule.type
    }
  }
  return 'bug_fix'
}

export function templateIdForType(type: TaskType): string {
  switch (type) {
    case 'bug_fix':
      return 'bugfix-v1'
    case 'new_feature':
      return 'feature-v1'
    case 'debug':
      return 'debug-v1'
    case 'small_change':
      return 'small-change-v1'
  }
}
