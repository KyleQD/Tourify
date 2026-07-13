import { describe, expect, it } from 'vitest'
import { applyOrgLogisticsTaskFilter } from '@/lib/admin/resolve-authorized-org'

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
