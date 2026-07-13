import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const ensureAdminOrgScope = vi.fn()
const resolveAdminOrgIdForUser = vi.fn()
const buildUniqueEventSlug = vi.fn()

vi.mock("@/app/api/events/_lib/admin-event-persistence", () => ({
  ensureAdminOrgScope: (...args: unknown[]) => ensureAdminOrgScope(...args),
  resolveAdminOrgIdForUser: (...args: unknown[]) => resolveAdminOrgIdForUser(...args),
}))

vi.mock("@/app/api/events/_lib/events-v2-admin", async () => {
  const actual = await vi.importActual<typeof import("@/app/api/events/_lib/events-v2-admin")>(
    "@/app/api/events/_lib/events-v2-admin",
  )
  return {
    ...actual,
    buildUniqueEventSlug: (...args: unknown[]) => buildUniqueEventSlug(...args),
  }
})

import {
  AdminTourEventAuthError,
  AdminTourEventOperationsService,
  getAdminTourEventErrorStatus,
} from "@/lib/admin/tour-event-operations.service"

const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
const USER_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"
const TOUR_A = "11111111-1111-4111-8111-111111111111"
const TOUR_B = "22222222-2222-4222-8222-222222222222"
const EVENT_A = "33333333-3333-4333-8333-333333333333"

interface MockState {
  memberships: Array<{ org_id: string }>
  tours: Array<Record<string, unknown>>
  events: Array<Record<string, unknown>>
  tourEvents: Array<Record<string, unknown>>
  ops: Array<{ table: string; op: string; payload?: unknown; filters?: Record<string, unknown> }>
}

function createMockSupabase(state: MockState) {
  function matchesFilters(row: Record<string, unknown>, filters: Record<string, unknown>) {
    return Object.entries(filters).every(([key, value]) => {
      if (Array.isArray(value)) return value.includes(row[key])
      return row[key] === value
    })
  }

  function createBuilder(table: string) {
    const filters: Record<string, unknown> = {}
    let op: "select" | "insert" | "update" | "delete" = "select"
    let payload: unknown = null
    let limitCount: number | null = null
    let preferSingle = false
    let preferMaybeSingle = false

    const builder: any = {
      select(columns?: string) {
        if (op !== "insert" && op !== "update") op = "select"
        void columns
        return builder
      },
      insert(rows: unknown) {
        op = "insert"
        payload = rows
        return builder
      },
      upsert(rows: unknown, _opts?: unknown) {
        op = "insert"
        payload = rows
        return builder
      },
      update(patch: unknown) {
        op = "update"
        payload = patch
        return builder
      },
      delete() {
        op = "delete"
        return builder
      },
      eq(column: string, value: unknown) {
        filters[column] = value
        return builder
      },
      in(column: string, values: unknown[]) {
        filters[column] = values
        return builder
      },
      ilike(column: string, value: unknown) {
        filters[column] = value
        return builder
      },
      order() {
        return builder
      },
      limit(count: number) {
        limitCount = count
        return builder
      },
      maybeSingle() {
        preferMaybeSingle = true
        return builder.then((result: any) => {
          const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : []
          return { data: rows[0] ?? null, error: null }
        })
      },
      single() {
        preferSingle = true
        return builder.then((result: any) => {
          const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : []
          if (!rows[0]) return { data: null, error: { message: "No rows" } }
          return { data: rows[0], error: null }
        })
      },
      then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
        try {
          state.ops.push({ table, op, payload, filters: { ...filters } })

          if (table === "org_members") {
            // Membership fixtures are already scoped to the test user.
            const orgFilter = filters.org_id
            let rows = state.memberships.filter((row) =>
              orgFilter === undefined ? true : row.org_id === orgFilter,
            )
            if (limitCount != null) rows = rows.slice(0, limitCount)
            return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
          }

          if (table === "tours") {
            if (op === "insert") {
              const row = Array.isArray(payload) ? payload[0] : payload
              const inserted = { id: TOUR_A, ...row }
              state.tours.push(inserted as Record<string, unknown>)
              return Promise.resolve({ data: preferSingle || preferMaybeSingle ? inserted : [inserted], error: null }).then(resolve, reject)
            }
            if (op === "delete") {
              state.tours = state.tours.filter((row) => !matchesFilters(row, filters))
              return Promise.resolve({ data: null, error: null }).then(resolve, reject)
            }
            if (op === "update") {
              const updated = state.tours
                .filter((row) => matchesFilters(row, filters))
                .map((row) => ({ ...row, ...(payload as object) }))
              state.tours = state.tours.map((row) =>
                matchesFilters(row, filters) ? { ...row, ...(payload as object) } : row,
              )
              return Promise.resolve({
                data: preferSingle || preferMaybeSingle ? updated[0] ?? null : updated,
                error: null,
              }).then(resolve, reject)
            }
            let rows = state.tours.filter((row) => matchesFilters(row, filters))
            if (limitCount != null) rows = rows.slice(0, limitCount)
            return Promise.resolve({
              data: preferSingle || preferMaybeSingle ? rows[0] ?? null : rows,
              error: null,
            }).then(resolve, reject)
          }

          if (table === "events_v2") {
            if (op === "insert") {
              const row = Array.isArray(payload) ? payload[0] : payload
              const inserted = {
                id: EVENT_A,
                created_at: "2026-07-09T00:00:00.000Z",
                ...row,
              }
              state.events.push(inserted as Record<string, unknown>)
              return Promise.resolve({
                data: preferSingle || preferMaybeSingle ? inserted : [inserted],
                error: null,
              }).then(resolve, reject)
            }
            if (op === "delete") {
              state.events = state.events.filter((row) => !matchesFilters(row, filters))
              return Promise.resolve({ data: null, error: null }).then(resolve, reject)
            }
            if (op === "update") {
              const updated = state.events
                .filter((row) => matchesFilters(row, filters))
                .map((row) => ({ ...row, ...(payload as object) }))
              state.events = state.events.map((row) =>
                matchesFilters(row, filters) ? { ...row, ...(payload as object) } : row,
              )
              return Promise.resolve({
                data: preferSingle || preferMaybeSingle ? updated[0] ?? null : updated,
                error: null,
              }).then(resolve, reject)
            }
            let rows = state.events.filter((row) => matchesFilters(row, filters))
            if (limitCount != null) rows = rows.slice(0, limitCount)
            return Promise.resolve({
              data: preferSingle || preferMaybeSingle ? rows[0] ?? null : rows,
              error: null,
            }).then(resolve, reject)
          }

          if (table === "tour_events") {
            if (op === "insert") {
              const rows = (Array.isArray(payload) ? payload : [payload]).map((row) => ({
                ...(row as object),
              }))
              state.tourEvents.push(...(rows as Array<Record<string, unknown>>))
              return Promise.resolve({
                data: preferSingle || preferMaybeSingle ? rows[0] ?? null : rows,
                error: null,
              }).then(resolve, reject)
            }
            if (op === "update") {
              state.tourEvents = state.tourEvents.map((row) =>
                matchesFilters(row, filters) ? { ...row, ...(payload as object) } : row,
              )
              const updated = state.tourEvents.filter((row) => matchesFilters(row, filters))
              return Promise.resolve({
                data: preferSingle || preferMaybeSingle ? updated[0] ?? null : updated,
                error: null,
              }).then(resolve, reject)
            }
            if (op === "delete") {
              const before = state.tourEvents.length
              state.tourEvents = state.tourEvents.filter((row) => !matchesFilters(row, filters))
              void before
              return Promise.resolve({ data: null, error: null }).then(resolve, reject)
            }
            let rows = state.tourEvents.filter((row) => matchesFilters(row, filters))
            if (limitCount != null) rows = rows.slice(0, limitCount)
            // Expand nested selects used by presenters when needed
            rows = rows.map((row) => ({
              ...row,
              tours: state.tours.find((tour) => tour.id === row.tour_id) ?? null,
              events_v2: state.events.find((event) => event.id === row.event_id) ?? null,
            }))
            return Promise.resolve({
              data: preferSingle || preferMaybeSingle ? rows[0] ?? null : rows,
              error: null,
            }).then(resolve, reject)
          }

          if (table === "ticket_sales" || table === "financial_transactions") {
            return Promise.resolve({ data: [], error: null }).then(resolve, reject)
          }

          return Promise.resolve({ data: [], error: null }).then(resolve, reject)
        } catch (error) {
          return Promise.reject(error).then(resolve, reject)
        }
      },
    }

    return builder
  }

  return {
    from: vi.fn((table: string) => createBuilder(table)),
  }
}

describe("admin tour/event hardening", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ensureAdminOrgScope.mockResolvedValue(ORG_A)
    resolveAdminOrgIdForUser.mockResolvedValue(ORG_A)
    buildUniqueEventSlug.mockResolvedValue("standalone-showcase")
  })

  it("rejects requested org_id that is not in the admin memberships", async () => {
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [],
      events: [],
      tourEvents: [],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    await expect(
      AdminTourEventOperationsService.listEvents({
        supabase,
        userId: USER_ID,
        orgId: ORG_B,
      }),
    ).rejects.toBeInstanceOf(AdminTourEventAuthError)

    try {
      await AdminTourEventOperationsService.listTours({
        supabase,
        userId: USER_ID,
        orgId: ORG_B,
      })
      expect.fail("expected org mismatch to throw")
    } catch (error) {
      expect(error).toBeInstanceOf(AdminTourEventAuthError)
      expect(getAdminTourEventErrorStatus(error)).toBe(403)
    }
  })

  it("creates a standalone event with no tour_events inserts", async () => {
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [],
      events: [],
      tourEvents: [],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    const event = await AdminTourEventOperationsService.createEvent({
      supabase,
      userId: USER_ID,
      input: {
        title: "Standalone showcase",
        event_date: "2026-08-14",
        event_time: "20:00",
        tour_ids: [],
      },
    })

    expect(event.id).toBe(EVENT_A)
    expect(state.events).toHaveLength(1)
    expect(state.tourEvents).toHaveLength(0)
    expect(state.ops.some((op) => op.table === "tour_events" && op.op === "insert")).toBe(false)
  })

  it("creates a multi-tour event with two links and exactly one primary", async () => {
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [
        { id: TOUR_A, org_id: ORG_A, name: "Tour A" },
        { id: TOUR_B, org_id: ORG_A, name: "Tour B" },
      ],
      events: [],
      tourEvents: [],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    await AdminTourEventOperationsService.createEvent({
      supabase,
      userId: USER_ID,
      input: {
        title: "Shared stop",
        event_date: "2026-08-14",
        event_time: "20:00",
        tour_ids: [TOUR_A, TOUR_B],
        primary_tour_id: TOUR_B,
      },
    })

    expect(state.tourEvents).toHaveLength(2)
    const primaries = state.tourEvents.filter((row) => row.is_primary === true)
    expect(primaries).toHaveLength(1)
    expect(primaries[0]?.tour_id).toBe(TOUR_B)
  })

  it("attaches an existing event only when event and tour share the authorized org", async () => {
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [
        { id: TOUR_A, org_id: ORG_A, name: "Tour A" },
        { id: TOUR_B, org_id: ORG_B, name: "Other org tour" },
      ],
      events: [
        {
          id: EVENT_A,
          org_id: ORG_A,
          title: "Night one",
          status: "confirmed",
          start_at: "2026-08-14T20:00:00.000Z",
          end_at: "2026-08-14T22:00:00.000Z",
          settings: {},
          created_by: USER_ID,
        },
      ],
      tourEvents: [],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    await AdminTourEventOperationsService.addTourAssignment({
      supabase,
      orgId: ORG_A,
      eventId: EVENT_A,
      assignment: { tour_id: TOUR_A, is_primary: true },
    })
    expect(state.tourEvents).toHaveLength(1)

    await expect(
      AdminTourEventOperationsService.addTourAssignment({
        supabase,
        orgId: ORG_A,
        eventId: EVENT_A,
        assignment: { tour_id: TOUR_B, is_primary: false },
      }),
    ).rejects.toBeInstanceOf(AdminTourEventAuthError)
  })

  it("detaches a tour assignment without deleting the event", async () => {
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [{ id: TOUR_A, org_id: ORG_A, name: "Tour A" }],
      events: [
        {
          id: EVENT_A,
          org_id: ORG_A,
          title: "Night one",
          status: "confirmed",
          start_at: "2026-08-14T20:00:00.000Z",
          end_at: "2026-08-14T22:00:00.000Z",
          settings: {},
          created_by: USER_ID,
        },
      ],
      tourEvents: [{ tour_id: TOUR_A, event_id: EVENT_A, is_primary: true, ordinal: 0 }],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    const result = await AdminTourEventOperationsService.detachTourAssignment({
      supabase,
      orgId: ORG_A,
      eventId: EVENT_A,
      tourId: TOUR_A,
    })

    expect(result).toEqual({ success: true })
    expect(state.tourEvents).toHaveLength(0)
    expect(state.events).toHaveLength(1)
    expect(state.ops.some((op) => op.table === "events_v2" && op.op === "delete")).toBe(false)
  })

  it("deletes a tour by detaching tour_events only and never deletes events_v2", async () => {
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [{ id: TOUR_A, org_id: ORG_A, name: "Tour A", created_by: USER_ID }],
      events: [
        {
          id: EVENT_A,
          org_id: ORG_A,
          title: "Night one",
          status: "confirmed",
          start_at: "2026-08-14T20:00:00.000Z",
          end_at: "2026-08-14T22:00:00.000Z",
          settings: {},
          created_by: USER_ID,
        },
      ],
      tourEvents: [{ tour_id: TOUR_A, event_id: EVENT_A, is_primary: true, ordinal: 0 }],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    const result = await AdminTourEventOperationsService.deleteTour({
      supabase,
      userId: USER_ID,
      tourId: TOUR_A,
    })

    expect(result).toEqual({ success: true })
    expect(state.tours).toHaveLength(0)
    expect(state.tourEvents).toHaveLength(0)
    expect(state.events).toHaveLength(1)
    expect(state.ops.some((op) => op.table === "events_v2" && op.op === "delete")).toBe(false)
  })

  it("rejects get/update/delete for resources outside the admin org", async () => {
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [{ id: TOUR_B, org_id: ORG_B, name: "Foreign tour", created_by: "other-user" }],
      events: [
        {
          id: EVENT_A,
          org_id: ORG_B,
          title: "Foreign event",
          status: "confirmed",
          start_at: "2026-08-14T20:00:00.000Z",
          end_at: "2026-08-14T22:00:00.000Z",
          settings: {},
          created_by: "other-user",
        },
      ],
      tourEvents: [],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    await expect(
      AdminTourEventOperationsService.getEvent({
        supabase,
        userId: USER_ID,
        eventId: EVENT_A,
      }),
    ).rejects.toBeInstanceOf(AdminTourEventAuthError)

    await expect(
      AdminTourEventOperationsService.updateEvent({
        supabase,
        userId: USER_ID,
        eventId: EVENT_A,
        input: { title: "Nope" },
      }),
    ).rejects.toBeInstanceOf(AdminTourEventAuthError)

    await expect(
      AdminTourEventOperationsService.deleteEvent({
        supabase,
        userId: USER_ID,
        eventId: EVENT_A,
      }),
    ).rejects.toBeInstanceOf(AdminTourEventAuthError)

    await expect(
      AdminTourEventOperationsService.getTour({
        supabase,
        userId: USER_ID,
        tourId: TOUR_B,
      }),
    ).rejects.toBeInstanceOf(AdminTourEventAuthError)

    await expect(
      AdminTourEventOperationsService.assertAdminEventAccess({
        supabase,
        userId: USER_ID,
        eventId: EVENT_A,
      }),
    ).rejects.toBeInstanceOf(AdminTourEventAuthError)
  })

  it("rejects createEvent when tour_id is outside the authorized org", async () => {
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [{ id: TOUR_B, org_id: ORG_B, name: "Foreign tour" }],
      events: [],
      tourEvents: [],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    await expect(
      AdminTourEventOperationsService.createEvent({
        supabase,
        userId: USER_ID,
        input: {
          title: "Cross org attempt",
          event_date: "2026-08-14",
          event_time: "20:00",
          tour_id: TOUR_B,
        },
      }),
    ).rejects.toBeInstanceOf(AdminTourEventAuthError)

    expect(state.events).toHaveLength(0)
    expect(state.memberships).toEqual([{ org_id: ORG_A }])
  })

  it("requires orgId for detachTourAssignment", async () => {
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [{ id: TOUR_A, org_id: ORG_A, name: "Tour A" }],
      events: [
        {
          id: EVENT_A,
          org_id: ORG_A,
          title: "Night one",
          status: "confirmed",
          start_at: "2026-08-14T20:00:00.000Z",
          end_at: "2026-08-14T22:00:00.000Z",
          settings: {},
          created_by: USER_ID,
        },
      ],
      tourEvents: [{ tour_id: TOUR_A, event_id: EVENT_A, is_primary: true }],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    await expect(
      AdminTourEventOperationsService.detachTourAssignment({
        supabase,
        eventId: EVENT_A,
        tourId: TOUR_A,
        orgId: "" as any,
      }),
    ).rejects.toBeInstanceOf(AdminTourEventAuthError)
  })

  it("maps AdminTourEventAuthError to HTTP 403", () => {
    expect(getAdminTourEventErrorStatus(new AdminTourEventAuthError("denied"))).toBe(403)
    expect(getAdminTourEventErrorStatus(new Error("Event not found."))).toBe(404)
    expect(getAdminTourEventErrorStatus(new Error("boom"), 500)).toBe(500)
  })

  it("replaceTourAssignments validates all tours before writing and normalizes a single primary", async () => {
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [
        { id: TOUR_A, org_id: ORG_A, name: "Tour A" },
        { id: TOUR_B, org_id: ORG_A, name: "Tour B" },
      ],
      events: [
        {
          id: EVENT_A,
          org_id: ORG_A,
          title: "Night one",
          status: "confirmed",
          start_at: "2026-08-14T20:00:00.000Z",
          end_at: "2026-08-14T22:00:00.000Z",
          settings: {},
          created_by: USER_ID,
        },
      ],
      tourEvents: [{ tour_id: TOUR_A, event_id: EVENT_A, is_primary: true, ordinal: 0 }],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    await AdminTourEventOperationsService.replaceTourAssignments({
      supabase,
      orgId: ORG_A,
      eventId: EVENT_A,
      assignments: [
        { tour_id: TOUR_A, is_primary: true },
        { tour_id: TOUR_B, is_primary: true },
      ],
    })

    expect(state.tourEvents).toHaveLength(2)
    expect(state.tourEvents.filter((row) => row.is_primary)).toHaveLength(1)

    await expect(
      AdminTourEventOperationsService.replaceTourAssignments({
        supabase,
        orgId: ORG_A,
        eventId: EVENT_A,
        assignments: [{ tour_id: "99999999-9999-4999-8999-999999999999", is_primary: true }],
      }),
    ).rejects.toBeInstanceOf(AdminTourEventAuthError)
  })

  it("seeds participants and ticket_types from builder selections on createEvent", async () => {
    const artistId = "44444444-4444-4444-8444-444444444444"
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [],
      events: [],
      tourEvents: [],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    await AdminTourEventOperationsService.createEvent({
      supabase,
      userId: USER_ID,
      input: {
        title: "Seeded showcase",
        event_date: "2026-08-14",
        event_time: "20:00",
        artist_ids: [artistId],
        ticket_price: 35,
        vip_price: 75,
        setup_context: {
          artists: [{ id: artistId, label: "Headliner" }],
          vendors: [{ id: "vendor:security", label: "Night Security", meta: "Security" }],
        },
      } as any,
    })

    const participantInsert = state.ops.find((op) => op.table === "event_participants" && op.op === "insert")
    const participantPayload = Array.isArray(participantInsert?.payload)
      ? participantInsert?.payload[0]
      : participantInsert?.payload
    expect((participantPayload as any)?.participant_type).toBe("Artist")
    expect(state.ops.some((op) => op.table === "ticket_types" && op.op === "insert")).toBe(true)
    expect(state.ops.some((op) => op.table === "event_vendor_requests" && op.op === "insert")).toBe(true)
  })

  it("writes venue_account_id into settings when attaching a venue profile id", async () => {
    const venueProfileId = "55555555-5555-4555-8555-555555555555"
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [],
      events: [],
      tourEvents: [],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    const event = await AdminTourEventOperationsService.createEvent({
      supabase,
      userId: USER_ID,
      input: {
        title: "Venue bridged show",
        event_date: "2026-09-01",
        event_time: "19:00",
        venue_id: venueProfileId,
        venue_name: "Bridge Hall",
      } as any,
    })

    expect((event as any).settings?.venue_account_id).toBe(venueProfileId)
    expect((event as any).settings?.artist_account_ids || []).toEqual([])
  })

  it("publishEvent confirms status and writes work_mode_publications", async () => {
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [],
      events: [
        {
          id: EVENT_A,
          org_id: ORG_A,
          title: "Publish me",
          status: "inquiry",
          start_at: "2026-08-14T20:00:00.000Z",
          end_at: "2026-08-14T22:00:00.000Z",
          settings: {},
          created_by: USER_ID,
        },
      ],
      tourEvents: [],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    const event = await AdminTourEventOperationsService.publishEvent({
      supabase,
      userId: USER_ID,
      eventId: EVENT_A,
    })

    expect(String((event as any).status || "").toLowerCase()).toMatch(/confirm|active|published/)
    expect(state.ops.some((op) => op.table === "work_mode_publications" && op.op === "insert")).toBe(true)
  })

  it("createTour accepts venue_name/event_date aliases and persists settings.route", async () => {
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [],
      events: [],
      tourEvents: [],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    const tour = await AdminTourEventOperationsService.createTour({
      supabase,
      userId: USER_ID,
      input: {
        name: "Alias Run",
        start_date: "2026-09-01",
        end_date: "2026-09-10",
        main_artist: "Headliner",
        events: [
          {
            name: "Seattle",
            venue_name: "Climate Pledge",
            event_date: "2026-09-05",
            event_time: "20:00",
            market: "Seattle",
          } as any,
        ],
        routing: [{ order: 1, name: "Seattle", venue: "Climate Pledge", date: "2026-09-05" }],
      },
    })

    expect(tour.id).toBe(TOUR_A)
    expect(state.events).toHaveLength(1)
    expect(state.tourEvents).toHaveLength(1)
    expect((state.tours[0].settings as any)?.route?.[0]?.event_id).toBe(EVENT_A)
    expect((tour as any).events?.length).toBe(1)
  })

  it("updateTour attaches event_ids and creates new stop events", async () => {
    const existingEventId = "44444444-4444-4444-8444-444444444444"
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [
        {
          id: TOUR_A,
          org_id: ORG_A,
          name: "Shell Tour",
          status: "planning",
          settings: {},
          created_by: USER_ID,
          user_id: USER_ID,
        },
      ],
      events: [
        {
          id: existingEventId,
          org_id: ORG_A,
          title: "Existing Show",
          status: "inquiry",
          start_at: "2026-09-01T20:00:00.000Z",
          settings: { venue_label: "Old Venue" },
          created_by: USER_ID,
        },
      ],
      tourEvents: [],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    await AdminTourEventOperationsService.updateTour({
      supabase,
      userId: USER_ID,
      tourId: TOUR_A,
      input: {
        name: "Shell Tour",
        event_ids: [existingEventId],
        events: [
          {
            name: "Portland",
            venue: "Moda Center",
            date: "2026-09-07",
            market: "Portland",
            leg_name: "West",
          },
        ],
        routing: [
          { order: 1, name: "Existing", venue: "Old Venue", date: "2026-09-01", event_id: existingEventId },
          { order: 2, name: "Portland", venue: "Moda Center", date: "2026-09-07" },
        ],
      },
    })

    expect(state.tourEvents.some((row) => row.event_id === existingEventId)).toBe(true)
    expect(state.events.some((row) => row.title === "Portland")).toBe(true)
    expect(state.tourEvents.length).toBeGreaterThanOrEqual(2)
    expect((state.tours[0].settings as any)?.route?.length).toBeGreaterThanOrEqual(1)
  })

  it("updateTour updates assignment metadata and event fields for linked stops", async () => {
    const state: MockState = {
      memberships: [{ org_id: ORG_A }],
      tours: [
        {
          id: TOUR_A,
          org_id: ORG_A,
          name: "Linked Tour",
          status: "planning",
          settings: {},
          created_by: USER_ID,
          user_id: USER_ID,
        },
      ],
      events: [
        {
          id: EVENT_A,
          org_id: ORG_A,
          title: "LA Show",
          status: "inquiry",
          start_at: "2026-09-03T20:00:00.000Z",
          settings: { venue_label: "Greek" },
          created_by: USER_ID,
        },
      ],
      tourEvents: [{ tour_id: TOUR_A, event_id: EVENT_A, is_primary: true, ordinal: 0, market: "LA" }],
      ops: [],
    }
    const supabase = createMockSupabase(state)

    await AdminTourEventOperationsService.updateTour({
      supabase,
      userId: USER_ID,
      tourId: TOUR_A,
      input: {
        name: "Linked Tour",
        events: [
          {
            id: EVENT_A,
            name: "Los Angeles",
            venue: "Hollywood Bowl",
            date: "2026-09-04",
            market: "Los Angeles",
            leg_name: "West Coast",
            advance_status: "in_progress",
            ordinal: 0,
          },
        ],
      },
    })

    const link = state.tourEvents.find((row) => row.event_id === EVENT_A)
    expect(link?.market).toBe("Los Angeles")
    expect(link?.leg_name).toBe("West Coast")
    expect(link?.advance_status).toBe("in_progress")
    expect(state.events[0].title).toBe("Los Angeles")
    expect((state.events[0].settings as any)?.venue_label).toBe("Hollywood Bowl")
  })
})
