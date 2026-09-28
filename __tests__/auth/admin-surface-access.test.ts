import { describe, expect, it, vi } from 'vitest'
import { resolveAdminSurfaceAccess, userHasAdminSurfaceAccess } from '@/lib/auth/admin'
import { profileIndicatesAdminAccess } from '@/lib/auth/admin-profile-gates'

function mockQuery(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = chain
  builder.eq = chain
  builder.in = chain
  builder.limit = chain
  builder.single = () => Promise.resolve(result)
  builder.maybeSingle = () => Promise.resolve(result)
  return builder
}

function trackedQuery(
  result: { data: unknown; error: unknown },
  filters: Array<[string, unknown]>,
) {
  const builder: Record<string, unknown> = {}
  builder.select = () => builder
  builder.eq = (column: string, value: unknown) => {
    filters.push([column, value])
    return builder
  }
  builder.in = () => builder
  builder.limit = () => builder
  builder.maybeSingle = () => Promise.resolve(result)
  return builder
}

describe('resolveAdminSurfaceAccess', () => {
  it('grants access via org_members even when profile is missing', async () => {
    const calls: string[] = []
    const membershipFilters: Array<[string, unknown]> = []
    const supabaseClient = {
      from(table: string) {
        calls.push(table)
        if (table === 'profiles') return mockQuery({ data: null, error: { message: 'not found' } })
        if (table === 'org_members')
          return trackedQuery(
            { data: { org_id: 'org-1', role: 'owner' }, error: null },
            membershipFilters,
          )
        return mockQuery({ data: null, error: null })
      },
    }

    const match = await resolveAdminSurfaceAccess(supabaseClient, 'user-1')
    expect(match.hasAccess).toBe(true)
    expect(match.role).toBe('owner')
    expect(membershipFilters).toContainEqual(['status', 'active'])
    expect(calls).not.toContain('organizer_accounts')
    expect(calls).not.toContain('account_relationships')
    expect(await userHasAdminSurfaceAccess(supabaseClient, 'user-1')).toBe(true)
  })

  it('grants access via profile admin gate', async () => {
    const supabaseClient = {
      from(table: string) {
        if (table === 'profiles') return mockQuery({ data: { is_admin: true, role: 'admin' }, error: null })
        return mockQuery({ data: null, error: null })
      },
    }

    const match = await resolveAdminSurfaceAccess(supabaseClient, 'user-1')
    expect(match.hasAccess).toBe(true)
    expect(match.profileType).toBe('platform_admin')
  })

  it('denies when no surface matches', async () => {
    const supabaseClient = {
      from() {
        return mockQuery({ data: null, error: null })
      },
    }

    const match = await resolveAdminSurfaceAccess(supabaseClient, 'user-1')
    expect(match.hasAccess).toBe(false)
  })

  it('does not treat legacy account identity records as authorization grants', async () => {
    const calls: string[] = []
    const supabaseClient = {
      from(table: string) {
        calls.push(table)
        if (table === 'profiles') return mockQuery({ data: { role: 'viewer', account_type: 'general' }, error: null })
        if (table === 'org_members') return mockQuery({ data: null, error: null })
        return mockQuery({ data: null, error: null })
      },
    }

    const match = await resolveAdminSurfaceAccess(supabaseClient, 'user-1')
    expect(match.hasAccess).toBe(false)
    expect(calls).not.toContain('organizer_accounts')
    expect(calls).not.toContain('account_relationships')
  })
})

describe('platform admin profile contract', () => {
  it('does not elevate a profile role without a platform-admin grant', () => {
    expect(profileIndicatesAdminAccess({ role: 'admin' } as any)).toBe(false)
  })

  it('accepts the active-chain admin level representations', () => {
    expect(profileIndicatesAdminAccess({ admin_level: 'super' })).toBe(true)
    expect(profileIndicatesAdminAccess({ admin_level: '1' })).toBe(true)
    expect(profileIndicatesAdminAccess({ admin_level: '0' })).toBe(false)
  })
})
