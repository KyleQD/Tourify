import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  EventAccessDeniedError,
  EventCapabilityDeniedError,
  requireEventAccess,
  requireEventCapability,
  resolveEventAccess,
} from "@/lib/admin/event-access.service"

const USER_ID = "11111111-1111-4111-8111-111111111111"
const OTHER_USER = "99999999-9999-4999-8999-999999999999"
const ORG_ID = "22222222-2222-4222-8222-222222222222"
const OTHER_ORG = "88888888-8888-4888-8888-888888888888"
const EVENT_ID = "33333333-3333-4333-8333-333333333333"
const TOUR_ID = "44444444-4444-4444-8444-444444444444"

type TableRow = Record<string, unknown> | null

function createClient(tables: Record<string, TableRow | TableRow[]>) {
  return {
    from(table: string) {
      const payload = tables[table]
      const rows = Array.isArray(payload) ? payload : payload ? [payload] : []
      const state: { filters: Array<[string, unknown]>; limit?: number } = { filters: [] }

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((column: string, value: unknown) => {
          state.filters.push([column, value])
          return query
        }),
        limit: vi.fn((n: number) => {
          state.limit = n
          return query
        }),
        maybeSingle: vi.fn(async () => {
          const match = rows.find((row) =>
            state.filters.every(([column, value]) => row && row[column] === value),
          )
          return { data: match ?? null, error: null }
        }),
        then: undefined as unknown,
      }

      // Support awaiting list queries (tour_events).
      ;(query as any).then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve(
          resolve({
            data: rows
              .filter((row) =>
                state.filters.every(([column, value]) => row && row[column] === value),
              )
              .slice(0, state.limit ?? rows.length),
            error: null,
          }),
        )

      return query
    },
  }
}

describe("EVENT-101 canonical event access service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("grants org members when acting org matches event org", async () => {
    const supabase = createClient({
      events_v2: {
        id: EVENT_ID,
        org_id: ORG_ID,
        status: "confirmed",
        title: "Show Night",
        created_by: OTHER_USER,
      },
      org_members: { org_id: ORG_ID, user_id: USER_ID },
      tour_events: [],
      tour_team_members: null,
    })

    const access = await requireEventAccess({
      supabase,
      userId: USER_ID,
      eventId: EVENT_ID,
      orgId: ORG_ID,
    })

    expect(access.relation).toBe("org_member")
    expect(access.orgId).toBe(ORG_ID)
  })

  it("denies cross-org access as not found", async () => {
    const supabase = createClient({
      events_v2: {
        id: EVENT_ID,
        org_id: ORG_ID,
        status: "confirmed",
        title: "Show Night",
        created_by: OTHER_USER,
      },
      org_members: { org_id: OTHER_ORG, user_id: USER_ID },
      tour_events: [],
      tour_team_members: null,
    })

    await expect(
      requireEventAccess({
        supabase,
        userId: USER_ID,
        eventId: EVENT_ID,
        orgId: OTHER_ORG,
      }),
    ).rejects.toBeInstanceOf(EventAccessDeniedError)

    expect(
      await resolveEventAccess({
        supabase,
        userId: USER_ID,
        eventId: EVENT_ID,
        orgId: OTHER_ORG,
      }),
    ).toBeNull()
  })

  it("grants tour collaborators linked through tour_events", async () => {
    const supabase = createClient({
      events_v2: {
        id: EVENT_ID,
        org_id: ORG_ID,
        status: "confirmed",
        title: "Show Night",
        created_by: OTHER_USER,
      },
      org_members: null,
      tour_events: [{ event_id: EVENT_ID, tour_id: TOUR_ID }],
      tour_team_members: {
        id: "tm-1",
        tour_id: TOUR_ID,
        user_id: USER_ID,
        role: "tour_manager",
        status: "active",
        is_active: true,
      },
    })

    const access = await requireEventAccess({
      supabase,
      userId: USER_ID,
      eventId: EVENT_ID,
      orgId: ORG_ID,
    })

    expect(access.relation).toBe("tour_collaborator")
    expect(access.collaboratorRole).toBe("tour_manager")
  })

  it("enforces event capabilities for org members", async () => {
    const supabase = createClient({
      events_v2: {
        id: EVENT_ID,
        org_id: ORG_ID,
        status: "confirmed",
        title: "Show Night",
        created_by: OTHER_USER,
      },
      org_members: { org_id: ORG_ID, user_id: USER_ID },
      tour_events: [],
      tour_team_members: null,
    })

    await expect(
      requireEventCapability({
        supabase,
        userId: USER_ID,
        eventId: EVENT_ID,
        orgId: ORG_ID,
        capability: "advance.manage",
        capabilities: ["event.view"],
      }),
    ).rejects.toBeInstanceOf(EventCapabilityDeniedError)

    await expect(
      requireEventCapability({
        supabase,
        userId: USER_ID,
        eventId: EVENT_ID,
        orgId: ORG_ID,
        capability: "event.view",
        capabilities: ["event.view"],
      }),
    ).resolves.toMatchObject({ relation: "org_member" })
  })

  it("allows legacy owners only without acting org", async () => {
    const supabase = createClient({
      events_v2: {
        id: EVENT_ID,
        org_id: null,
        status: "draft",
        title: "Legacy Show",
        created_by: USER_ID,
      },
      org_members: null,
      tour_events: [],
      tour_team_members: null,
    })

    const access = await requireEventAccess({
      supabase,
      userId: USER_ID,
      eventId: EVENT_ID,
    })
    expect(access.relation).toBe("legacy_owner")

    await expect(
      requireEventAccess({
        supabase,
        userId: USER_ID,
        eventId: EVENT_ID,
        orgId: ORG_ID,
      }),
    ).rejects.toBeInstanceOf(EventAccessDeniedError)
  })
})
