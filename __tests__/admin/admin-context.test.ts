import { describe, expect, it } from 'vitest'
import { NextResponse } from 'next/server'
import {
  parseExplicitAdminActingHeaders,
  selectSingleMembershipFallback,
} from '@/lib/auth/admin-context'

function headers(values: Record<string, string>): Pick<Headers, 'get'> {
  const normalized = new Map(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]),
  )
  return { get: key => normalized.get(key.toLowerCase()) ?? null }
}

describe('Admin acting context selection', () => {
  it('accepts an explicit organization profile and org assertion', () => {
    const result = parseExplicitAdminActingHeaders(headers({
      'x-acting-profile-id': 'profile-a',
      'x-acting-account-type': 'organization',
      'x-acting-org-id': 'org-a',
    }))

    expect(result).toEqual({
      profileId: 'profile-a',
      requestedOrgId: 'org-a',
      source: 'header',
    })
  })

  it('rejects partial acting headers instead of silently falling back', async () => {
    const result = parseExplicitAdminActingHeaders(headers({
      'x-acting-profile-id': 'profile-a',
    }))

    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(400)
    await expect((result as NextResponse).json()).resolves.toMatchObject({
      code: 'invalid_acting_context',
    })
  })

  it('requires organization context for Admin operations', async () => {
    const result = parseExplicitAdminActingHeaders(headers({
      'x-acting-profile-id': 'user-a',
      'x-acting-account-type': 'general',
    }))

    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(409)
  })

  it('allows a deterministic single-membership compatibility fallback', () => {
    expect(selectSingleMembershipFallback([{ org_id: 'org-a', role: 'admin' }]))
      .toEqual({ org_id: 'org-a', role: 'admin' })
  })

  it('rejects ambiguous memberships instead of selecting the first row', async () => {
    const result = selectSingleMembershipFallback([
      { org_id: 'org-a', role: 'admin' },
      { org_id: 'org-b', role: 'tour_manager' },
    ])

    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(409)
    await expect((result as NextResponse).json()).resolves.toMatchObject({
      code: 'acting_context_required',
    })
  })
})
