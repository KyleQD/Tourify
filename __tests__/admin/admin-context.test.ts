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

  it('builds org-scoped cache keys for switch invalidation (SEC-101)', () => {
    expect(actingAdminCacheKey({ orgId: 'org-a', profileId: 'profile-a' })).toBe(
      'admin-org:org-a:profile:profile-a',
    )
    expect(actingAdminCacheKey({ orgId: 'org-a', profileId: 'profile-a' })).not.toBe(
      actingAdminCacheKey({ orgId: 'org-b', profileId: 'profile-b' }),
    )
  })
})
