import { describe, expect, it } from 'vitest'
import {
  hasAdminCapability,
  resolveAdminCapabilities,
} from '@/lib/auth/admin-capabilities'

describe('admin capabilities', () => {
  it('preserves the organization owner invariant', () => {
    const capabilities = resolveAdminCapabilities('owner', [])
    expect(capabilities).toContain('org.roles.manage')
    expect(capabilities).toContain('tour.delete')
    expect(capabilities).toContain('finance.pay')
    expect(capabilities).toContain('contract.sign')
  })

  it('uses safe role defaults while a legacy permission row is present', () => {
    const capabilities = resolveAdminCapabilities('tour_manager', [
      'event.manage',
      'task.manage',
    ])
    expect(capabilities).toContain('tour.view')
    expect(capabilities).toContain('tour.manage')
    expect(capabilities).toContain('logistics.manage')
    expect(capabilities).not.toContain('finance.pay')
  })

  it('treats a canonical database permission row as authoritative', () => {
    const capabilities = resolveAdminCapabilities('admin', [
      'tour.view',
      'finance.view',
    ])
    expect(capabilities).toEqual(['tour.view', 'finance.view'])
    expect(hasAdminCapability(capabilities, 'finance.view')).toBe(true)
    expect(hasAdminCapability(capabilities, 'finance.manage')).toBe(false)
  })

  it('does not grant unknown roles implicit access', () => {
    expect(resolveAdminCapabilities('custom-unconfigured', [])).toEqual([])
  })
})
