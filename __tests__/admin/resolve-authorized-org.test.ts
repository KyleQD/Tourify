import { describe, expect, it } from 'vitest'
import {
  AdminActingContextRequiredError,
  AdminOrganizationAccessDeniedError,
  applyOrgLogisticsTaskFilter,
  authorizedOrgScopeErrorResponse,
  mergeAuthorizedOrgIds,
  resolveExplicitAuthorizedOrgId,
} from '@/lib/admin/resolve-authorized-org'

describe('explicit admin organization scope', () => {
  it('requires acting context instead of selecting the first membership', () => {
    expect(() => resolveExplicitAuthorizedOrgId(undefined, ['org-a', 'org-b']))
      .toThrow(AdminActingContextRequiredError)
  })

  it('accepts the explicitly selected organization', () => {
    expect(resolveExplicitAuthorizedOrgId('org-b', ['org-a', 'org-b'])).toBe('org-b')
  })

  it('accepts an explicitly selected owner-owned organization without a membership row', () => {
    const authorized = mergeAuthorizedOrgIds(['org-member'], ['org-owned'])

    expect(resolveExplicitAuthorizedOrgId('org-owned', authorized)).toBe('org-owned')
  })

  it('deduplicates membership and ownership scopes', () => {
    expect(mergeAuthorizedOrgIds(['org-a', 'org-b'], ['org-b', 'org-c'])).toEqual([
      'org-a',
      'org-b',
      'org-c',
    ])
  })

  it('rejects an organization outside the user memberships', () => {
    expect(() => resolveExplicitAuthorizedOrgId('org-c', ['org-a', 'org-b']))
      .toThrow(AdminOrganizationAccessDeniedError)
  })

  it('maps missing context to the stable 409 route contract', async () => {
    const response = authorizedOrgScopeErrorResponse(new AdminActingContextRequiredError())
    expect(response?.status).toBe(409)
    await expect(response?.json()).resolves.toMatchObject({
      success: false,
      code: 'acting_context_required',
    })
  })

  it('maps a wrong organization to the stable 403 route contract', async () => {
    const response = authorizedOrgScopeErrorResponse(new AdminOrganizationAccessDeniedError())
    expect(response?.status).toBe(403)
    await expect(response?.json()).resolves.toMatchObject({
      success: false,
      code: 'organization_access_denied',
    })
  })
})

function mockQuery() {
  const calls: Array<{ method: string; args: unknown[] }> = []
  const builder: Record<string, unknown> = {}
  for (const method of ['eq', 'in', 'or']) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args })
      return builder
    }
  }
  return { builder, calls }
}

describe('applyOrgLogisticsTaskFilter', () => {
  it('filters by explicit eventId', () => {
    const { builder, calls } = mockQuery()
    applyOrgLogisticsTaskFilter({
      query: builder,
      userId: 'user-1',
      eventIds: ['a', 'b'],
      tourIds: ['c'],
      eventId: 'evt-1',
    })
    expect(calls).toEqual([{ method: 'eq', args: ['event_id', 'evt-1'] }])
  })

  it('uses created_by when org has no events or tours', () => {
    const { builder, calls } = mockQuery()
    applyOrgLogisticsTaskFilter({
      query: builder,
      userId: 'user-1',
      eventIds: [],
      tourIds: [],
    })
    expect(calls).toEqual([{ method: 'eq', args: ['created_by', 'user-1'] }])
  })

  it('ors org event/tour ids with created_by for logistics_tasks', () => {
    const { builder, calls } = mockQuery()
    applyOrgLogisticsTaskFilter({
      query: builder,
      userId: 'user-1',
      eventIds: ['e1', 'e2'],
      tourIds: ['t1'],
    })
    expect(calls[0]?.method).toBe('or')
    expect(String(calls[0]?.args[0])).toContain('created_by.eq.user-1')
    expect(String(calls[0]?.args[0])).toContain('event_id.in.(e1,e2)')
    expect(String(calls[0]?.args[0])).toContain('tour_id.in.(t1)')
  })

  it('skips created_by for lodging-style tables', () => {
    const { builder, calls } = mockQuery()
    applyOrgLogisticsTaskFilter({
      query: builder,
      userId: 'user-1',
      eventIds: ['e1'],
      tourIds: [],
      includeCreatedBy: false,
    })
    expect(calls).toEqual([{ method: 'in', args: ['event_id', ['e1']] }])
  })
})
