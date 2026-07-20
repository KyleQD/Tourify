import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { requiresReapprovalOnChange } from '@/lib/logistics/status'

describe('backline fulfillment', () => {
  it('keeps requirement vs fulfillment as separate actions in API', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/api/admin/logistics/backline/route.ts'),
      'utf8'
    )
    expect(source).toContain("action === 'fulfill'")
    expect(source).toContain("action === 'substitute'")
    expect(source).toContain('backline_requirements')
    expect(source).toContain('backline_fulfillments')
    expect(source).toContain('backline_substitution_approvals')
  })

  it('requires reapproval when confirmed/approved requirements change critically', () => {
    expect(requiresReapprovalOnChange({
      previousStatus: 'approved',
      isCriticalFieldChanged: true,
    })).toBe(true)
    expect(requiresReapprovalOnChange({
      previousStatus: 'confirmed',
      isCriticalFieldChanged: true,
    })).toBe(true)
  })
})
