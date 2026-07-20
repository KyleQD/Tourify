import { describe, expect, it } from 'vitest'
import { buildDietaryKitchenSummary, redactDietaryPii } from '@/lib/logistics/dietary-privacy'

describe('dietary privacy', () => {
  it('never includes person identifiers in kitchen summary', () => {
    const summary = buildDietaryKitchenSummary([
      { userId: 'secret-user', memberName: 'Hidden Person', allergy: 'Shellfish', preference: 'Halal' },
    ])
    const serialized = JSON.stringify(summary)
    expect(serialized).not.toContain('secret-user')
    expect(serialized).not.toContain('Hidden Person')
    expect(summary.allergyCounts.shellfish).toBe(1)
  })

  it('redacts identifiers from individual records', () => {
    expect(redactDietaryPii({ userId: 'u', memberName: 'n', preference: 'Vegan' })).toEqual({
      preference: 'Vegan',
      allergy: undefined,
    })
  })
})
