import { describe, expect, it, vi } from 'vitest'
import { resolveAdminSurfaceAccess, userHasAdminSurfaceAccess } from '@/lib/auth/admin'

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

describe('resolveAdminSurfaceAccess', () => {
  it('grants access via org_members even when profile is missing', async () => {
    const calls: string[] = []
    const supabaseClient = {
      from(table: string) {
        calls.push(table)
        if (table === 'profiles') return mockQuery({ data: null, error: { message: 'not found' } })
        if (table === 'organizer_accounts') return mockQuery({ data: null, error: null })
        if (table === 'account_relationships') return mockQuery({ data: null, error: null })
        if (table === 'org_members') return mockQuery({ data: { org_id: 'org-1', role: 'owner' }, error: null })
        return mockQuery({ data: null, error: null })
      },
    }

    const match = await resolveAdminSurfaceAccess(supabaseClient, 'user-1')
    expect(match.hasAccess).toBe(true)
    expect(match.role).toBe('owner')
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
    expect(match.profileType).toBe('admin')
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

  it('treats legacy relationship column errors as non-fatal', async () => {
    let relationshipCalls = 0
    const supabaseClient = {
      from(table: string) {
        if (table === 'profiles') return mockQuery({ data: { role: 'viewer', account_type: 'general' }, error: null })
        if (table === 'organizer_accounts') return mockQuery({ data: null, error: null })
        if (table === 'org_members') return mockQuery({ data: null, error: null })
        if (table === 'account_relationships') {
          relationshipCalls += 1
          if (relationshipCalls === 1)
            return mockQuery({ data: null, error: null })
          return mockQuery({ data: null, error: { code: '42703', message: 'column user_id does not exist' } })
        }
        return mockQuery({ data: null, error: null })
      },
    }

    const match = await resolveAdminSurfaceAccess(supabaseClient, 'user-1')
    expect(match.hasAccess).toBe(false)
  })
})
