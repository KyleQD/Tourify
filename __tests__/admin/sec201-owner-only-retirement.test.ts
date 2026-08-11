import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  assertSec201SourceRetiredOwnerOnly,
  SEC201_RETIRED_OWNER_ONLY_ROUTES,
} from '@/lib/admin/sec201-owner-only-retirement'
import {
  resolveTourAccess,
  TourAccessDeniedError,
} from '@/lib/admin/tour-access.service'

function createMockQuery(result: { data: unknown; error: unknown }) {
  const query: Record<string, unknown> = {}
  const chain = () => query
  for (const method of ['select', 'eq', 'limit', 'order']) {
    query[method] = vi.fn(chain)
  }
  query.maybeSingle = vi.fn(async () => result)
  query.single = vi.fn(async () => result)
  return query
}

describe('SEC-201 retire owner-only tour authorization', () => {
  it('migrated legacy routes use canonical access and forbid owner-only checks', () => {
    for (const relative of SEC201_RETIRED_OWNER_ONLY_ROUTES) {
      const source = readFileSync(resolve(process.cwd(), relative), 'utf8')
      const coverage = assertSec201SourceRetiredOwnerOnly(source)
      expect(coverage.failures, relative).toEqual([])
      expect(coverage.ok, relative).toBe(true)
    }
  })

  it('org collaborators resolve tour access without being the owner', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'tours') {
          return createMockQuery({
            data: {
              id: 'tour-1',
              org_id: 'org-1',
              status: 'active',
              name: 'Run',
              created_by: 'owner-user',
              user_id: 'owner-user',
            },
            error: null,
          })
        }
        if (table === 'org_members') {
          return createMockQuery({ data: null, error: null })
        }
        if (table === 'tour_team_members') {
          return createMockQuery({
            data: {
              id: 'tm-1',
              role: 'tour_manager',
              status: 'active',
              is_active: true,
            },
            error: null,
          })
        }
        return createMockQuery({ data: null, error: null })
      }),
    }

    const access = await resolveTourAccess({
      supabase,
      userId: 'collaborator-user',
      tourId: 'tour-1',
      orgId: 'org-1',
    })

    expect(access?.relation).toBe('tour_collaborator')
    expect(access?.tourId).toBe('tour-1')
  })

  it('denies foreign org when acting org mismatches', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'tours') {
          return createMockQuery({
            data: {
              id: 'tour-1',
              org_id: 'org-a',
              status: 'active',
              name: 'Run',
              created_by: 'owner-user',
              user_id: 'owner-user',
            },
            error: null,
          })
        }
        return createMockQuery({ data: { org_id: 'org-b' }, error: null })
      }),
    }

    const access = await resolveTourAccess({
      supabase,
      userId: 'user-b',
      tourId: 'tour-1',
      orgId: 'org-b',
    })
    expect(access).toBeNull()
  })

  it('exports TourAccessDeniedError for consistent 404 semantics', () => {
    const error = new TourAccessDeniedError()
    expect(error.status).toBe(404)
    expect(error.code).toBe('entity_not_found')
  })
})
