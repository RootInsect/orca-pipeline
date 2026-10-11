import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { errnoCode } from './parse-helpers'
import type { PipelineConfig, PipelineTask, TaskStatus } from './types'

export async function ensureExperienceRoot(root: string): Promise<void> {
  await mkdir(path.join(root, 'projects'), { recursive: true })
  await mkdir(path.join(root, 'agents'), { recursive: true })
  await mkdir(path.join(root, 'domains'), { recursive: true })
  const indexPath = path.join(root, 'index.jsonl')
  try {
    await writeFile(indexPath, '', { flag: 'wx' })
  } catch (error) {
    if (errnoCode(error) !== 'EEXIST') {
      throw error
    }
  }
}

function slug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export async function writeTaskExperience(input: {
  task: PipelineTask
  config: PipelineConfig
  finalStatus: TaskStatus
}): Promise<{ path: string; id: string }> {
  const { task, config, finalStatus } = input
  await ensureExperienceRoot(config.experience_root)
  const projectId = task.project_id || 'unknown_project'
  const id = `${slug(task.id)}-${finalStatus}`
  const title = `${task.type} · ${task.title}`.slice(0, 120)
  const agent = task.runner.agent || task.orca.develop_agent || config.agents.Developer
  const updatedAt = new Date().toISOString()
  const relativePath = path.join('projects', projectId, `${id}.md`)
  const absolutePath = path.join(config.experience_root, relativePath)
  await mkdir(path.dirname(absolutePath), { recursive: true })

  const lesson =
    finalStatus === 'done'
      ? `Completed ${task.type} through stage experience. Keep repro/acceptance notes near ${task.repo ?? projectId}.`
      : `Ended as ${finalStatus} at stage ${task.stage}. Blocker: ${task.runner.blocker || task.runner.last_error || 'n/a'}`

  const body = `---
id: ${id}
title: ${JSON.stringify(title)}
scope: project
scope_id: ${projectId}
tags: [${[task.type, ...task.domain_tags].map((tag) => JSON.stringify(tag)).join(', ')}]
agents: [${JSON.stringify(agent)}]
when_to_use: Similar ${task.type} work on ${projectId}
what_happened: ${JSON.stringify(task.title)}
lesson: ${JSON.stringify(lesson)}
links: [${[task.id, task.pr_url]
    .filter(Boolean)
    .map((item) => JSON.stringify(String(item)))
    .join(', ')}]
source_task: ${task.id}
updated_at: ${updatedAt}
---

Status: ${finalStatus}
Stage: ${task.stage}
PR: ${task.pr_url ?? '(none)'}
Notes:
${task.notes.map((note) => `- ${note}`).join('\n') || '- (none)'}
`
  await writeFile(absolutePath, body, 'utf8')

  const indexLine = JSON.stringify({
    id,
    scope: 'project',
    scope_id: projectId,
    tags: [task.type, ...task.domain_tags],
    projects: [projectId],
    agents: [agent],
    title,
    updated_at: updatedAt,
    path: relativePath.split(path.sep).join('/')
  })
  await appendFile(path.join(config.experience_root, 'index.jsonl'), `${indexLine}\n`, 'utf8')

  // Optional domain notes for tagged domains (short cross-project pointer).
  for (const domain of task.domain_tags.slice(0, 3)) {
    const domainId = slug(domain) || domain
    const domainRel = path.join('domains', domainId, `${id}.md`)
    const domainAbs = path.join(config.experience_root, domainRel)
    await mkdir(path.dirname(domainAbs), { recursive: true })
    await writeFile(
      domainAbs,
      `---
id: ${id}
title: ${JSON.stringify(title)}
scope: domain
scope_id: ${domainId}
tags: [${JSON.stringify(task.type)}, ${JSON.stringify(domainId)}]
projects: [${JSON.stringify(projectId)}]
when_to_use: ${JSON.stringify(`domain ${domainId} work related to ${task.type}`)}
lesson: ${JSON.stringify(lesson)}
source_task: ${task.id}
updated_at: ${updatedAt}
---
`,
      'utf8'
    )
    await appendFile(
      path.join(config.experience_root, 'index.jsonl'),
      `${JSON.stringify({
        id: `${id}:${domainId}`,
        scope: 'domain',
        scope_id: domainId,
        tags: [task.type, domainId],
        projects: [projectId],
        agents: [agent],
        title,
        updated_at: updatedAt,
        path: domainRel.split(path.sep).join('/')
      })}\n`,
      'utf8'
    )
  }

  return { path: absolutePath, id }
}
