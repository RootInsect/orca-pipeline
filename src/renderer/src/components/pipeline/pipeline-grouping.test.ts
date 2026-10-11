import { describe, expect, it } from 'vitest'
import type { PipelineTaskDto } from '../../../../shared/pipeline-ui-types'
import { filterPipelineTasks, groupPipelineTasks } from './pipeline-grouping'

function task(
  partial: Partial<PipelineTaskDto> & Pick<PipelineTaskDto, 'id' | 'title'>
): PipelineTaskDto {
  return {
    source: 'manual',
    type: 'bug_fix',
    type_hint: 'bug_fix',
    template_id: 'bugfix-v1',
    body: '',
    repo: 'acme/web',
    project_id: 'acme__web',
    base_ref: 'main',
    domain_tags: [],
    priority: 'normal',
    status: 'active',
    stage: 'develop',
    ci_loops: 0,
    max_ci_loops: 2,
    pr_url: null,
    orca: {
      worktree_id: null,
      run_id: null,
      gate_ids: [],
      develop_agent: 'cursor-agent',
      review_agent: 'cursor-agent',
      last_dispatch_id: null,
      last_orch_task_id: null
    },
    runner: {
      phase: 'idle',
      role: 'Developer',
      agent: 'cursor-agent',
      blocker: null,
      last_error: null
    },
    agent_overrides: {},
    notes: [],
    artifacts: [],
    experience: { root_env: 'PIPELINE_EXPERIENCE_ROOT', written: [] },
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...partial
  }
}

describe('pipeline grouping', () => {
  it('groups by project by default key', () => {
    const groups = groupPipelineTasks(
      [
        task({ id: 'a', title: 'A', project_id: 'p1' }),
        task({ id: 'b', title: 'B', project_id: 'p2' }),
        task({ id: 'c', title: 'C', project_id: 'p1' })
      ],
      'project'
    )
    expect(groups.map((g) => g.key)).toEqual(['p1', 'p2'])
    expect(groups[0]?.tasks).toHaveLength(2)
  })

  it('filters onlyNeedsMe to blocked_human tasks', () => {
    const filtered = filterPipelineTasks(
      [
        task({
          id: 'wait',
          title: 'Wait',
          status: 'blocked',
          runner: {
            phase: 'blocked_human',
            role: 'Orchestrator',
            agent: null,
            blocker: 'clarify',
            last_error: null
          }
        }),
        task({ id: 'run', title: 'Run' })
      ],
      {
        project: 'all',
        agent: 'all',
        type: 'all',
        stage: 'all',
        onlyNeedsMe: true
      }
    )
    expect(filtered.map((row) => row.id)).toEqual(['wait'])
  })
})
