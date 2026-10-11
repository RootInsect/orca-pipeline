import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse } from 'yaml'
import { EMBEDDED_TEMPLATES } from './default-templates'
import {
  asStringArray,
  isRecord,
  parseRole,
  parseStage,
  parseTaskTypeOrNull
} from './parse-helpers'
import { resolveSkillGuideRoot } from './paths'
import type { AgentPreference, PipelineStage, PipelineTemplate, TemplateStage } from './types'

function parsePreference(raw: unknown): AgentPreference {
  if (!isRecord(raw)) {
    return { capability: 'code', cost: 'mid' }
  }
  const cost = raw.cost === 'low' || raw.cost === 'high' || raw.cost === 'mid' ? raw.cost : 'mid'
  return {
    capability: typeof raw.capability === 'string' ? raw.capability : 'code',
    cost
  }
}

function parseTemplateStage(raw: unknown): TemplateStage | null {
  if (!isRecord(raw)) {
    return null
  }
  const name = parseStage(raw.name, 'setup_env')
  const role = parseRole(raw.role, 'Orchestrator')
  if (typeof raw.name !== 'string' || name !== raw.name) {
    return null
  }
  if (typeof raw.role !== 'string' || role !== raw.role) {
    return null
  }
  return {
    name,
    role,
    skills: asStringArray(raw.skills),
    human_gate: raw.human_gate === true,
    skip_when: typeof raw.skip_when === 'string' ? raw.skip_when : null,
    exit_when: typeof raw.exit_when === 'string' ? raw.exit_when : '',
    on_fail: typeof raw.on_fail === 'string' ? raw.on_fail : 'retry',
    agent_preference: parsePreference(raw.agent_preference)
  }
}

export function parsePipelineTemplate(raw: unknown): PipelineTemplate {
  if (!isRecord(raw)) {
    throw new Error('template root must be an object')
  }
  const id = typeof raw.id === 'string' ? raw.id : ''
  const stages = Array.isArray(raw.stages)
    ? raw.stages.map(parseTemplateStage).filter((stage): stage is TemplateStage => stage !== null)
    : []
  if (!id || stages.length === 0) {
    throw new Error('template requires id and stages')
  }
  const taskTypes = Array.isArray(raw.task_types)
    ? raw.task_types
        .map((item) => parseTaskTypeOrNull(item))
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : []
  return {
    id,
    task_types: taskTypes,
    max_ci_loops: typeof raw.max_ci_loops === 'number' ? raw.max_ci_loops : 2,
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    stages
  }
}

async function readTemplateYaml(templateId: string): Promise<string> {
  const skillRoot = resolveSkillGuideRoot()
  if (skillRoot) {
    const filePath = path.join(skillRoot, 'templates', `${templateId}.yaml`)
    try {
      await access(filePath)
      return await readFile(filePath, 'utf8')
    } catch {
      // fall through to embedded
    }
  }
  const embedded = EMBEDDED_TEMPLATES[templateId]
  if (!embedded) {
    throw new Error(`Unknown pipeline template: ${templateId}`)
  }
  return embedded
}

export async function loadPipelineTemplate(templateId: string): Promise<PipelineTemplate> {
  return parsePipelineTemplate(parse(await readTemplateYaml(templateId)))
}

export function nextTemplateStage(
  template: PipelineTemplate,
  current: PipelineStage
): TemplateStage | null {
  if (current === 'done' || current === 'classify') {
    return template.stages[0] ?? null
  }
  const index = template.stages.findIndex((stage) => stage.name === current)
  if (index === -1) {
    return template.stages[0] ?? null
  }
  return template.stages[index + 1] ?? null
}

export function stageDefinition(
  template: PipelineTemplate,
  stage: PipelineStage
): TemplateStage | null {
  return template.stages.find((item) => item.name === stage) ?? null
}
