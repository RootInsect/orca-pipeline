import { describe, expect, it } from 'vitest'
import { classifyTaskType, templateIdForType } from './classify'

describe('classifyTaskType', () => {
  it('honors type hints', () => {
    expect(classifyTaskType({ typeHint: 'debug', title: 'anything', body: '' })).toBe('debug')
  })

  it('classifies Chinese and English keywords', () => {
    expect(classifyTaskType({ title: '修 Bug：登录崩溃', body: '' })).toBe('bug_fix')
    expect(classifyTaskType({ title: '新功能：导出 CSV', body: '' })).toBe('new_feature')
    expect(classifyTaskType({ title: '排查支付超时', body: '' })).toBe('debug')
    expect(classifyTaskType({ title: '文案小改', body: 'typo in settings' })).toBe('small_change')
  })

  it('defaults to bug_fix', () => {
    expect(classifyTaskType({ title: 'misc', body: '' })).toBe('bug_fix')
  })

  it('maps types to templates', () => {
    expect(templateIdForType('bug_fix')).toBe('bugfix-v1')
    expect(templateIdForType('new_feature')).toBe('feature-v1')
    expect(templateIdForType('debug')).toBe('debug-v1')
    expect(templateIdForType('small_change')).toBe('small-change-v1')
  })
})
