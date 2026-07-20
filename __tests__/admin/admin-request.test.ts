import { describe, expect, it } from 'vitest'
import { buildAdminRequest, mapAdminScopeError } from '@/lib/admin/admin-request'

describe('admin request helpers', () => {
  it('merges acting headers into no-store fetch init', () => {
    const init = buildAdminRequest(
      { 'x-acting-profile-id': 'profile-a', 'x-acting-account-type': 'organization' },
      { method: 'POST', headers: { 'Content-Type': 'application/json' } },
    )

    expect(init.credentials).toBe('include')
    expect(init.cache).toBe('no-store')
    expect(init.headers).toMatchObject({
      'x-acting-profile-id': 'profile-a',
      'x-acting-account-type': 'organization',
      'Content-Type': 'application/json',
    })
  })

  it('maps scope and capability failures to operator-facing copy', () => {
    expect(mapAdminScopeError(409, 'acting_context_required').actionHint).toBe('Switch account')
    expect(mapAdminScopeError(403, 'capability_required').title).toBe('Access denied')
    expect(mapAdminScopeError(400).title).toBe('Workspace not ready')
  })
})
