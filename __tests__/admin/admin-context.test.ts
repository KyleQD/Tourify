import { describe, expect, it } from 'vitest'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import {
  actingAdminCacheKey,
  parseExplicitAdminActingHeaders,
  resolveActingAdminContext,
} from '@/lib/auth/admin-context'

function headers(values: Record<string, string>): Pick<Headers, 'get'> {
  const normalized = new Map(
    Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]),
  )
  return { get: key => normalized.get(key.toLowerCase()) ?? null }
}

function mockSupabase(tableResults: Record<string, { data: any; error: any }>) {
  return {
    from: (table: string) => {
      const query: Record<string, any> = {
        select: () => query,
        eq: () => query,
        in: () => query,
        maybeSingle: async () => tableResults[table] ?? { data: null, error: null },
        then: (resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) =>
          Promise.resolve(tableResults[table] ?? { data: null, error: null }).then(resolve, reject),
      }
      return query
    },
  }
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

  it('requires explicit header/session selection without consulting membership fallbacks', async () => {
    const tables: string[] = []
    const result = await resolveActingAdminContext(
      new NextRequest('http://localhost/api/admin/tours'),
      {
        user: { id: 'user-a' },
        supabase: {
          from: (table: string) => {
            tables.push(table)
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null, error: null }),
                }),
              }),
            }
          },
        },
      },
    )

    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(409)
    await expect((result as NextResponse).json()).resolves.toMatchObject({
      code: 'acting_context_required',
    })
    expect(tables).toEqual(['user_sessions'])
  })

  it('treats the selected organization owner as owner when membership is missing', async () => {
    const result = await resolveActingAdminContext(
      new NextRequest('http://localhost/api/admin/tours', {
        headers: {
          'x-acting-profile-id': 'profile-a',
          'x-acting-account-type': 'organization',
          'x-acting-org-id': 'org-a',
        },
      }),
      {
        user: { id: 'user-a' },
        supabase: mockSupabase({
          organizer_accounts: {
            data: { id: 'profile-a', user_id: 'user-a', ops_org_id: 'org-a', is_active: true },
            error: null,
          },
          org_members: { data: null, error: null },
        }),
      },
    )

    expect(result).not.toBeInstanceOf(NextResponse)
    expect(result).toMatchObject({
      userId: 'user-a',
      profileId: 'profile-a',
      orgId: 'org-a',
      membershipRole: 'owner',
      scope: 'organization',
      allowedTourIds: [],
    })
    expect((result as any).capabilities).toContain('org.settings.manage')
  })

  it('rejects a selected organization when the user is neither owner nor member', async () => {
    const result = await resolveActingAdminContext(
      new NextRequest('http://localhost/api/admin/tours', {
        headers: {
          'x-acting-profile-id': 'profile-a',
          'x-acting-account-type': 'organization',
          'x-acting-org-id': 'org-a',
        },
      }),
      {
        user: { id: 'user-b' },
        supabase: mockSupabase({
          organizer_accounts: {
            data: { id: 'profile-a', user_id: 'user-a', ops_org_id: 'org-a', is_active: true },
            error: null,
          },
          org_members: { data: null, error: null },
          tour_team_members: { data: [], error: null },
        }),
      },
    )

    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(403)
    await expect((result as NextResponse).json()).resolves.toMatchObject({
      code: 'organization_access_denied',
    })
  })

  it('builds org-scoped cache keys for switch invalidation (SEC-101)', () => {
    expect(actingAdminCacheKey({ orgId: 'org-a', profileId: 'profile-a' })).toBe(
      'admin-org:org-a:profile:profile-a',
    )
    expect(actingAdminCacheKey({ orgId: 'org-a', profileId: 'profile-a' })).not.toBe(
      actingAdminCacheKey({ orgId: 'org-b', profileId: 'profile-b' }),
    )
  })
})
