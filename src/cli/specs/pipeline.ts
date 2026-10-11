import type { CommandSpec } from '../args'
import { GLOBAL_FLAGS } from '../args'

export const PIPELINE_COMMAND_SPECS: CommandSpec[] = [
  {
    path: ['pipeline', 'init'],
    summary: 'Create ~/.pipeline config, tasks dir, and shared experience store',
    usage: 'orca pipeline init [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    notes: [
      'Writes ~/.pipeline/config.yaml and scaffolds ~/.pipeline/experience/{projects,agents,domains}/.',
      'Does not contact the Orca runtime.'
    ]
  },
  {
    path: ['pipeline', 'create'],
    summary: 'Publish a pipeline task (classify, load template, queue)',
    usage:
      'orca pipeline create --title <text> [--type <bug_fix|new_feature|debug|small_change>] ' +
      '[--body <text>] [--repo <owner/name>] [--project-id <id>] [--domain-tag <tag>]... ' +
      '[--develop-agent <id>] [--review-agent <id>] [--json]',
    allowedFlags: [
      ...GLOBAL_FLAGS,
      'title',
      'type',
      'body',
      'repo',
      'project-id',
      'domain-tag',
      'develop-agent',
      'review-agent'
    ],
    repeatableFlags: ['domain-tag'],
    notes: [
      'Classifies with --type when provided; otherwise uses keyword rules (default bug_fix).',
      'Stores YAML under the configured tasks_dir (default ~/.pipeline/tasks).'
    ],
    examples: [
      'orca pipeline create --type bug_fix --title "登录 TypeError" --repo acme/web --body "repro: click login"'
    ]
  },
  {
    path: ['pipeline', 'list'],
    summary: 'List pipeline tasks',
    usage: 'orca pipeline list [--status <queued|active|blocked|done|failed>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'status']
  },
  {
    path: ['pipeline', 'status'],
    summary: 'Show one task or list all',
    usage: 'orca pipeline status [--task <id>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'task']
  },
  {
    path: ['pipeline', 'once'],
    summary: 'Run one scheduler tick across active tasks',
    usage: 'orca pipeline once [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    notes: [
      'Advances stages, starts role workers via orchestration, polls CI with gh, writes experience.',
      'Set dry_run: true in ~/.pipeline/config.yaml or PIPELINE_DRY_RUN=1 to simulate Orca/gh.'
    ]
  },
  {
    path: ['pipeline', 'run'],
    summary: 'Run the scheduler loop until interrupted',
    usage: 'orca pipeline run [--interval-ms <n>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'interval-ms'],
    notes: ['Ctrl-C stops the loop. Prefer `once` while debugging.']
  },
  {
    path: ['pipeline', 'unblock'],
    summary: 'Clear a human blocker (e.g. clarify) and resume',
    usage: 'orca pipeline unblock --task <id> [--note <text>] [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'task', 'note']
  },
  {
    path: ['pipeline', 'config', 'show'],
    summary: 'Show pipeline config and role agent mapping',
    usage: 'orca pipeline config show [--json]',
    allowedFlags: [...GLOBAL_FLAGS],
    notes: [
      'Role agents also accept env PIPELINE_DEVELOPER_AGENT / PIPELINE_REVIEWER_AGENT.',
      'Default config path: ~/.pipeline/config.yaml'
    ]
  },
  {
    path: ['pipeline', 'config', 'set'],
    summary: 'Set a pipeline config key',
    usage: 'orca pipeline config set --key <name> --value <text> [--json]',
    allowedFlags: [...GLOBAL_FLAGS, 'key', 'value'],
    notes: [
      'Keys: tasks_dir, experience_root, orca_command, dry_run, Developer, Reviewer, Planner, Orchestrator.'
    ]
  }
]
