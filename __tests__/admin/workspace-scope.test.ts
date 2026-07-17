import { describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('server-only', () => ({}))

import { resolveAdminWorkspaceScope, resolveOptionalAdminWorkspaceScope } from '@/lib/admin/workspace-scope'

type Row = Record<string, any>

function supabaseMock(input: {
  organizers?: Row[]
  members?: Row[]
  sessions?: Row[]
}) {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {}
      return {
        select() {
          return this
        },
        eq(column: string, value: unknown) {
          filters[column] = value
          return this
        },
        maybeSingle() {
          const rows =
            table === 'organizer_accounts'
              ? input.organizers || []
              : table === 'org_members'
                ? input.members || []
                : table === 'user_sessions'
                  ? input.sessions || []
                  : []

          const row = rows.find((candidate) =>
            Object.entries(filters).every(([key, value]) => candidate[key] === value)
          )
          return Promise.resolve({ data: row || null, error: null })
        },
      }
    },
  }
}

function request(url: string, headers?: Record<string, string>) {
  return new NextRequest(url, { headers })
}

describe('resolveAdminWorkspaceScope', () => {
  it('resolves an owned organizer account from acting headers', async () => {
    const result = await resolveAdminWorkspaceScope(
      request('http://tourify.test/api/admin/tours', {
        'x-acting-profile-id': 'band-account',
        'x-acting-account-type': 'organization',
      }),
      {
        user: { id: 'user-1' },
        supabase: supabaseMock({
          organizers: [
            {
              id: 'band-account',
              user_id: 'user-1',
              subtype: 'band',
              ops_org_id: 'ops-band',
              is_active: true,
            },
          ],
        }),
      },
    )

    expect(result).not.toBeInstanceOf(NextResponse)
    expect((result as any).organizerAccountId).toBe('band-account')
    expect((result as any).opsOrgId).toBe('ops-band')
    expect((result as any).source).toBe('header')
  })

  it('resolves a granted organizer account from the account query param', async () => {
    const result = await resolveAdminWorkspaceScope(
      request('http://tourify.test/api/admin/tours?account=managed-org'),
      {
        user: { id: 'manager-1' },
        supabase: supabaseMock({
          organizers: [
            {
              id: 'managed-org',
              user_id: 'owner-1',
              subtype: 'band',
              ops_org_id: 'ops-managed',
              is_active: true,
            },
          ],
          members: [{ org_id: 'ops-managed', user_id: 'manager-1', role: 'tour_manager' }],
        }),
      },
    )

    expect(result).not.toBeInstanceOf(NextResponse)
    expect((result as any).opsOrgId).toBe('ops-managed')
    expect((result as any).source).toBe('query')
  })

  it('rejects an explicit organizer account the user cannot access', async () => {
    const result = await resolveAdminWorkspaceScope(
      request('http://tourify.test/api/admin/tours?account=private-org'),
      {
        user: { id: 'user-2' },
        supabase: supabaseMock({
          organizers: [
            {
              id: 'private-org',
              user_id: 'owner-1',
              subtype: 'band',
              ops_org_id: 'ops-private',
              is_active: true,
            },
          ],
        }),
      },
    )

    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(403)
  })

  it('does not silently fall back to the first org membership without active account context', async () => {
    const result = await resolveAdminWorkspaceScope(
      request('http://tourify.test/api/admin/tours'),
      {
        user: { id: 'multi-org-user' },
        supabase: supabaseMock({
          members: [{ org_id: 'old-org', user_id: 'multi-org-user', role: 'owner' }],
        }),
      },
    )

    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(400)
  })

  it('allows callers to opt into author fallback when no active account context exists', async () => {
    const result = await resolveOptionalAdminWorkspaceScope(
      request('http://tourify.test/api/admin/events'),
      {
        user: { id: 'author-1' },
        supabase: supabaseMock({}),
      },
    )

    expect(result).toBeNull()
  })
})
