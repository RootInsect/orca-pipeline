import { describe, expect, it } from 'vitest'
import { defaultAgentsForAvailable, ensureCursorAgentAllowed } from './agent-availability'

describe('pipeline agent availability', () => {
  it('defaults every role to cursor-agent when it is the only agent on PATH', () => {
    expect(defaultAgentsForAvailable(['cursor-agent'])).toEqual({
      Orchestrator: 'cursor-agent',
      Planner: 'cursor-agent',
      Developer: 'cursor-agent',
      Reviewer: 'cursor-agent',
      Writer: 'cursor-agent'
    })
  })

  it('keeps classic prefs when multiple agents are on PATH', () => {
    const agents = defaultAgentsForAvailable(['cursor-agent', 'claude', 'codex'])
    expect(agents.Developer).toBe('codex')
    expect(agents.Reviewer).toBe('claude')
    expect(agents.Planner).toBe('claude')
  })

  it('keeps cursor-agent as a valid fill for blank roles', () => {
    const agents = ensureCursorAgentAllowed({
      Orchestrator: 'claude',
      Planner: '',
      Developer: 'codex',
      Reviewer: 'claude',
      Writer: 'claude'
    })
    expect(agents.Planner).toBe('cursor-agent')
  })
})
