import { describe, expect, it } from 'vitest'
import { computeNextValue, resolveMode, resolveTarget, type AchievementRow } from './achievement-engine.service'

function makeAchievement(overrides: Partial<AchievementRow> = {}): AchievementRow {
  return {
    id: 'test-id',
    name: 'Test',
    requirements: {},
    metric_key: 'metric',
    target_value: 10,
    evaluation_mode: 'increment',
    ...overrides
  }
}

describe('achievement-engine helpers', () => {
  it('resolves target from requirements first', () => {
    const achievement = makeAchievement({ requirements: { target: 25 }, target_value: 10 })
    expect(resolveTarget(achievement)).toBe(25)
  })

  it('uses increment mode by default', () => {
    const achievement = makeAchievement({ requirements: {}, evaluation_mode: null })
    expect(resolveMode(achievement)).toBe('increment')
  })

  it('computes increment progress values', () => {
    expect(computeNextValue({ currentValue: 5, mode: 'increment', delta: 3 })).toBe(8)
  })

  it('computes absolute progress as max snapshot', () => {
    expect(computeNextValue({ currentValue: 12, mode: 'absolute', delta: 1, absoluteValue: 10 })).toBe(12)
    expect(computeNextValue({ currentValue: 12, mode: 'absolute', delta: 1, absoluteValue: 20 })).toBe(20)
  })
})
