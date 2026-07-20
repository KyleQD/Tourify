import { describe, expect, it } from 'vitest'
import {
  assertOrgEntityReferences,
  listOrgEventIds,
} from '@/lib/admin/org-entity-access'

interface ResponseValue {
  data: unknown
  error: unknown
}

function createSupabaseMock(responses: Record<string, ResponseValue>) {
  const filters: Record<string, Array<[string, unknown]>> = {}

  return {
    filters,
    client: {
      from(table: string) {
        filters[table] ||= []
        const builder = {
          select() {
            return builder
          },
          eq(column: string, value: unknown) {
            filters[table].push([column, value])
            return builder
          },
          maybeSingle() {
            return Promise.resolve(responses[table])
          },
          then(resolve: (value: ResponseValue) => unknown) {
            return Promise.resolve(responses[table]).then(resolve)
          },
        }
        return builder
      },
    },
  }
}

describe('organization entity access', () => {
  it('applies both entity and organization predicates', async () => {
    const mock = createSupabaseMock({
      events_v2: { data: { id: 'event-a' }, error: null },
    })

    await assertOrgEntityReferences(mock.client, 'org-a', { eventId: 'event-a' })

    expect(mock.filters.events_v2).toEqual([
      ['id', 'event-a'],
      ['org_id', 'org-a'],
    ])
  })

  it('does not disclose an entity outside the acting organization', async () => {
    const mock = createSupabaseMock({
      events_v2: { data: null, error: null },
    })

    await expect(
      assertOrgEntityReferences(mock.client, 'org-a', { eventId: 'event-from-org-b' }),
    ).rejects.toMatchObject({
      status: 404,
      code: 'entity_not_found',
    })
  })

  it('rejects an event and tour that are not related', async () => {
    const mock = createSupabaseMock({
      events_v2: { data: { id: 'event-a' }, error: null },
      tours: { data: { id: 'tour-a' }, error: null },
      tour_events: { data: null, error: null },
    })

    await expect(assertOrgEntityReferences(mock.client, 'org-a', {
      eventId: 'event-a',
      tourId: 'tour-a',
    })).rejects.toMatchObject({
      status: 422,
      code: 'entity_relationship_invalid',
    })
  })

  it('returns only valid event IDs for the acting organization', async () => {
    const mock = createSupabaseMock({
      events_v2: {
        data: [{ id: 'event-a' }, { id: null }, {}, { id: 'event-b' }],
        error: null,
      },
    })

    await expect(listOrgEventIds(mock.client, 'org-a')).resolves.toEqual(['event-a', 'event-b'])
    expect(mock.filters.events_v2).toEqual([['org_id', 'org-a']])
  })
})
