import { describe, expect, it } from 'vitest'
import {
  hasAdminCapability,
  hasEffectiveAdminCapability,
  resolveAdminCapabilities,
  resolveEffectiveAdminCapabilities,
} from '@/lib/auth/admin-capabilities'

describe('admin capabilities', () => {
  it('preserves the organization owner invariant', () => {
    const capabilities = resolveAdminCapabilities('owner', [])
    expect(capabilities).toContain('org.roles.manage')
    expect(capabilities).toContain('tour.delete')
    expect(capabilities).toContain('finance.pay')
    expect(capabilities).toContain('contract.sign')
    expect(capabilities).toContain('commerce.manage_payouts')
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

  it('adds configured capabilities without stripping default-role capabilities', () => {
    const capabilities = resolveAdminCapabilities('admin', [
      'tour.view',
      'finance.view',
    ])
    expect(capabilities).toContain('tour.manage')
    expect(hasAdminCapability(capabilities, 'finance.view')).toBe(true)
    expect(hasAdminCapability(capabilities, 'finance.manage')).toBe(true)
    expect(hasAdminCapability(capabilities, 'finance.pay')).toBe(false)
    expect(hasAdminCapability(capabilities, 'commerce.manage_payouts')).toBe(false)
    expect(hasAdminCapability(capabilities, 'commerce.retry_payouts')).toBe(false)
  })

  it('does not grant unknown roles implicit access', () => {
    expect(resolveAdminCapabilities('custom-unconfigured', [])).toEqual([])
  })

  it('supports documented manager aliases and keeps workers out of Admin', () => {
    expect(resolveAdminCapabilities('production_manager')).toContain('event.live_ops')
    expect(resolveAdminCapabilities('department_manager')).toContain('workforce.manage')
    expect(resolveAdminCapabilities('finance_manager')).toContain('finance.approve')
    expect(resolveAdminCapabilities('finance_manager')).toContain('commerce.manage_payouts')
    expect(resolveAdminCapabilities('finance_manager')).toContain('commerce.view_financials')
    expect(resolveAdminCapabilities('ticketing_manager')).toContain('ticketing.scan')
    expect(resolveAdminCapabilities('ticketing_manager')).toContain('commerce.manage_orders')
    expect(resolveAdminCapabilities('ticketing_manager')).toContain('commerce.view_customers')
    expect(resolveAdminCapabilities('worker')).toEqual([])
  })

  it('keeps department managers on the approved workforce-focused subset', () => {
    const capabilities = resolveAdminCapabilities('department_manager')
    expect(capabilities).toContain('workforce.manage')
    expect(capabilities).toContain('communications.send')
    expect(capabilities).not.toContain('tour.manage')
    expect(capabilities).not.toContain('event.publish')
    expect(capabilities).not.toContain('finance.pay')
    expect(capabilities).toContain('commerce.view')
    expect(capabilities).not.toContain('commerce.manage_payouts')
  })

  it('allows catalog-scoped custom roles without implicit defaults', () => {
    expect(resolveAdminCapabilities('custom-coordinator', ['tour.view', 'advance.manage', 'commerce.export', 'unknown']))
      .toEqual(['tour.view', 'advance.manage', 'commerce.export'])
  })

  it('SEC-102: revoked membership yields no capabilities', () => {
    expect(
      resolveEffectiveAdminCapabilities({
        role: 'owner',
        membershipStatus: 'revoked',
      }),
    ).toEqual([])
  })

  it('SEC-102: includes non-expired grants and drops expired ones', () => {
    const now = new Date('2026-07-20T12:00:00.000Z')
    const capabilities = resolveEffectiveAdminCapabilities({
      role: 'viewer',
      membershipStatus: 'active',
      now,
      grants: [
        { capability: 'finance.view', scopeType: 'organization', scopeId: 'org-a', expiresAt: '2026-07-21T00:00:00.000Z' },
        { capability: 'finance.pay', scopeType: 'organization', scopeId: 'org-a', expiresAt: '2026-07-19T00:00:00.000Z' },
      ],
      orgId: 'org-a',
    })
    expect(capabilities).toContain('tour.view')
    expect(capabilities).toContain('finance.view')
    expect(capabilities).not.toContain('finance.pay')
  })

  it('SEC-102: owner invariant still wins over empty configured perms', () => {
    const capabilities = resolveEffectiveAdminCapabilities({
      role: 'owner',
      configuredPermissions: [],
      membershipStatus: 'active',
    })
    expect(capabilities).toContain('org.roles.manage')
    expect(capabilities).toContain('contract.sign')
  })

  it('SEC-102: fails closed for missing, unknown, invalid, or expired membership state', () => {
    const base = { role: 'owner' as const }
    expect(resolveEffectiveAdminCapabilities(base)).toEqual([])
    expect(resolveEffectiveAdminCapabilities({ ...base, membershipStatus: 'suspended' })).toEqual([])
    expect(resolveEffectiveAdminCapabilities({
      ...base,
      membershipStatus: 'active',
      membershipExpiresAt: 'invalid',
    })).toEqual([])
    expect(resolveEffectiveAdminCapabilities({
      ...base,
      membershipStatus: 'active',
      membershipExpiresAt: '2026-07-20T11:59:59.000Z',
      now: new Date('2026-07-20T12:00:00.000Z'),
    })).toEqual([])
  })

  it('SEC-102: combines defaults and catalog-only custom roles while creator/master remains invariant', () => {
    expect(resolveEffectiveAdminCapabilities({
      role: 'viewer',
      customRoleCapabilities: ['advance.manage', 'unknown'],
      membershipStatus: 'active',
    })).toEqual(expect.arrayContaining(['tour.view', 'advance.manage']))

    const creator = resolveEffectiveAdminCapabilities({
      role: 'worker',
      customRoleCapabilities: [],
      isOrganizationCreator: true,
      membershipStatus: 'active',
    })
    expect(creator).toContain('org.roles.manage')
    expect(creator).toContain('finance.pay')
  })

  it('SEC-102: applies entity grants only to the exact target and ignores revoked grants', () => {
    const input = {
      role: 'viewer',
      membershipStatus: 'active',
      orgId: 'org-a',
      target: { type: 'tour' as const, id: 'tour-a' },
      grants: [
        { capability: 'tour.manage' as const, scopeType: 'tour' as const, scopeId: 'tour-a' },
        { capability: 'finance.pay' as const, scopeType: 'tour' as const, scopeId: 'tour-b' },
        { capability: 'tour.delete' as const, scopeType: 'tour' as const, scopeId: 'tour-a', revokedAt: '2026-07-20T00:00:00.000Z' },
      ],
    }
    const capabilities = resolveEffectiveAdminCapabilities(input)
    expect(capabilities).toContain('tour.manage')
    expect(capabilities).not.toContain('finance.pay')
    expect(capabilities).not.toContain('tour.delete')
    expect(hasEffectiveAdminCapability(input, 'tour.manage')).toBe(true)
    expect(hasEffectiveAdminCapability({ ...input, target: { type: 'tour', id: 'tour-b' } }, 'tour.manage')).toBe(false)
  })

  it('SEC-102: never promotes an unscoped compatibility grant into an entity command', () => {
    expect(resolveEffectiveAdminCapabilities({
      role: 'worker',
      membershipStatus: 'active',
      orgId: 'org-a',
      target: { type: 'event', id: 'event-a' },
      grants: [{ capability: 'event.manage' }],
    })).not.toContain('event.manage')
  })
})
