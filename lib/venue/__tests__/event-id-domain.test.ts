import { VenueService } from '@/lib/services/venue.service'

/**
 * VEN-002 — event reads must resolve the venues_v2 ID domain before querying
 * events_v2; legacy `events` stays in the venue_profiles domain.
 */

type Row = Record<string, any>

function chainable(result: { data: any; error: any }) {
  const firstRow = Array.isArray(result.data) ? (result.data[0] ?? null) : (result.data ?? null)
  const chain: any = {
    eq: () => chain,
    gte: () => chain,
    lte: () => chain,
    order: () => Promise.resolve({ ...result }),
    limit: () => Promise.resolve({ ...result }),
    maybeSingle: async () => ({ data: firstRow, error: null }),
    single: async () => ({ data: firstRow, error: null }),
  }
  return chain
}

interface Spec {
  bridgeVenuesV2Id?: string | null
  settingsRow?: Row | null
  eventsV2Rows?: Row[]
}

function createClientMock(spec: Spec) {
  const eventsV2VenueFilters: string[] = []

  const client = {
    from(table: string) {
      if (table === 'venue_identity_bridges') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: spec.bridgeVenuesV2Id
                  ? { venue_profile_id: 'vp-1', venues_v2_id: spec.bridgeVenuesV2Id, operational_org_id: null }
                  : null,
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'venue_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: spec.settingsRow ?? null, error: null }),
            }),
          }),
        }
      }

      if (table === 'events_v2') {
        const result = { data: spec.eventsV2Rows ?? [], error: null }
        return {
          select: () => ({
            eq: (_colA: string, valueA: string) => {
              // By-ID lookups chain .eq('id', …).eq('venue_id', …); range queries
              // chain .eq('venue_id', …).gte(…). Record every filter value.
              eventsV2VenueFilters.push(valueA)
              const inner: any = {
                eq: (_colB: string, valueB: string) => {
                  eventsV2VenueFilters.push(valueB)
                  return chainable(result)
                },
                gte: () => chainable(result),
                lte: () => chainable(result),
                order: () => Promise.resolve({ ...result }),
                maybeSingle: async () => ({ data: result.data[0] ?? null, error: null }),
              }
              return inner
            },
          }),
        }
      }

      // Legacy tables: always empty.
      return {
        select: () => ({
          eq: () => chainable({ data: [], error: null }),
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }
    },
  }

  return { client: client as never, eventsV2VenueFilters }
}

describe('VEN-002 — event ID-domain resolution', () => {
  it('queries events_v2 with the bridge-resolved venues_v2 id, not the profile id', async () => {
    const mock = createClientMock({
      bridgeVenuesV2Id: 'v2-mirror-1',
      eventsV2Rows: [{ id: 'ev-1', title: 'Night', start_at: '2026-09-01T00:00:00Z' }],
    })

    const service = new VenueService(mock.client)
    const events = await service.getVenueEventsByRange('vp-1', '2026-08-01', '2026-12-31')

    expect(mock.eventsV2VenueFilters).toContain('v2-mirror-1')
    expect(mock.eventsV2VenueFilters).not.toContain('vp-1')
    expect(events.some((e) => e.event_table === 'events_v2')).toBe(true)
  })

  it('falls back to settings-JSON cache when no bridge row is readable', async () => {
    const mock = createClientMock({
      bridgeVenuesV2Id: null,
      settingsRow: { settings: { venues_v2_id: 'v2-from-json' } },
      eventsV2Rows: [],
    })

    const service = new VenueService(mock.client)
    await service.getUpcomingEvents('vp-1')

    expect(mock.eventsV2VenueFilters).toContain('v2-from-json')
  })

  it('skips the events_v2 query entirely when no operational mirror exists', async () => {
    const mock = createClientMock({
      bridgeVenuesV2Id: null,
      settingsRow: { settings: {} },
    })

    const service = new VenueService(mock.client)
    await service.getUpcomingEvents('vp-1')

    expect(mock.eventsV2VenueFilters).toEqual([])
  })

  it('resolves by-ID event lookups against the mirrored domain', async () => {
    const mock = createClientMock({
      bridgeVenuesV2Id: 'v2-mirror-9',
      eventsV2Rows: [
        {
          id: 'ev-9',
          title: 'Launch',
          status: 'confirmed',
          start_at: '2026-10-01T20:00:00Z',
          end_at: '2026-10-02T02:00:00Z',
          capacity: 300,
          settings: { description: 'x', is_public: true },
        },
      ],
    })

    const service = new VenueService(mock.client)
    const event = await service.getVenueEventById('vp-1', 'ev-9')

    expect(mock.eventsV2VenueFilters).toContain('v2-mirror-9')
    expect(event?.event_table).toBe('events_v2')
    expect(event?.isPublic).toBe(true)
  })
})
