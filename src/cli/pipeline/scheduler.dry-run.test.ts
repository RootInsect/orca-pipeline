import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { publishPipelineTask } from './create-task'
import { ensureExperienceRoot } from './experience'
import { runSchedulerOnce } from './scheduler'
import { loadTask } from './task-store'
import type { PipelineConfig } from './types'

const tempDirs: string[] = []

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function tempConfig(): Promise<PipelineConfig> {
  const root = await mkdtemp(path.join(tmpdir(), 'orca-pipeline-'))
  tempDirs.push(root)
  const config: PipelineConfig = {
    tasks_dir: path.join(root, 'tasks'),
    experience_root: path.join(root, 'experience'),
    orca_command: 'orca',
    dry_run: true,
    poll_interval_ms: 10,
    worker_wait_timeout_ms: 1000,
    agents: {
      Orchestrator: 'claude',
      Planner: 'claude',
      Developer: 'codex',
      Reviewer: 'claude',
      Writer: 'claude'
    },
    auto_skip_clarify_keywords: ['repro', '复现', 'typeerror']
  }
  await ensureExperienceRoot(config.experience_root)
  return config
}

describe('pipeline scheduler dry-run', () => {
  it('runs bug_fix from create to done with role switch and experience', async () => {
    const config = await tempConfig()
    const { task } = await publishPipelineTask({
      config,
      title: '登录按钮无响应',
      body: 'repro: click login shows TypeError',
      repo: 'acme/web',
      domainTags: ['auth']
    })
    expect(task.type).toBe('bug_fix')
    expect(task.orca.develop_agent).toBe('codex')
    expect(task.orca.review_agent).toBe('claude')

    let current = task
    for (let i = 0; i < 40; i += 1) {
      await runSchedulerOnce(config)
      current = await loadTask(config.tasks_dir, task.id)
      if (current.status === 'done') {
        break
      }
    }

    expect(current.status).toBe('done')
    expect(current.stage).toBe('done')
    expect(current.pr_url).toContain('github.com')
    expect(current.experience.written.length).toBeGreaterThan(0)
    expect(current.orca.develop_agent).toBe('codex')
    expect(current.orca.review_agent).toBe('claude')

    const index = await readFile(path.join(config.experience_root, 'index.jsonl'), 'utf8')
    expect(index).toContain('acme__web')
    expect(index).toContain('auth')
  })
})
