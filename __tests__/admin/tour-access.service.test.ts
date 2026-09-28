import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  requireTourAccess,
  requireTourCapability,
  resolveTourAccess,
  TourAccessDeniedError,
  TourCapabilityDeniedError,
} from "@/lib/admin/tour-access.service"

const USER_ID = "11111111-1111-4111-8111-111111111111"
const OTHER_USER = "99999999-9999-4999-8999-999999999999"
const ORG_ID = "22222222-2222-4222-8222-222222222222"
const OTHER_ORG = "88888888-8888-4888-8888-888888888888"
const TOUR_ID = "33333333-3333-4333-8333-333333333333"

type TableRow = Record<string, unknown> | null

function createClient(tables: Record<string, TableRow | TableRow[]>) {
  return {
    from(table: string) {
      const payload = tables[table]
      const rows = Array.isArray(payload) ? payload : payload ? [payload] : []
      const state: { filters: Array<[string, unknown]> } = { filters: [] }

      const query = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn((column: string, value: unknown) => {
          state.filters.push([column, value])
          return query
        }),
        maybeSingle: vi.fn(async () => {
          const match = rows.find((row) =>
            state.filters.every(([column, value]) => row && row[column] === value),
          )
          return { data: match ?? null, error: null }
        }),
      }
      return query
    },
  }
}

describe("TOUR-102 canonical tour access service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("grants org members when acting org matches tour org", async () => {
    const supabase = createClient({
      tours: {
        id: TOUR_ID,
        org_id: ORG_ID,
        status: "draft",
        name: "Summer Run",
        created_by: OTHER_USER,
        user_id: OTHER_USER,
      },
      org_members: { org_id: ORG_ID, user_id: USER_ID },
      tour_team_members: null,
    })

    const access = await requireTourAccess({
      supabase,
      userId: USER_ID,
      tourId: TOUR_ID,
      orgId: ORG_ID,
    })

    expect(access.relation).toBe("org_member")
    expect(access.orgId).toBe(ORG_ID)
  })

  it("denies cross-org access as not found (no leakage)", async () => {
    const supabase = createClient({
      tours: {
        id: TOUR_ID,
        org_id: ORG_ID,
        status: "draft",
        name: "Summer Run",
        created_by: OTHER_USER,
        user_id: OTHER_USER,
      },
      org_members: { org_id: OTHER_ORG, user_id: USER_ID },
      tour_team_members: null,
    })

    await expect(
      requireTourAccess({
        supabase,
        userId: USER_ID,
        tourId: TOUR_ID,
        orgId: OTHER_ORG,
      }),
    ).rejects.toBeInstanceOf(TourAccessDeniedError)

    expect(
      await resolveTourAccess({
        supabase,
        userId: USER_ID,
        tourId: TOUR_ID,
        orgId: OTHER_ORG,
      }),
    ).toBeNull()
  })

  it("grants confirmed tour collaborators consistently with entity grants", async () => {
    const supabase = createClient({
      tours: {
        id: TOUR_ID,
        org_id: ORG_ID,
        status: "active",
        name: "Collab Tour",
        created_by: OTHER_USER,
        user_id: OTHER_USER,
      },
      org_members: null,
      tour_team_members: {
        id: "member-1",
        tour_id: TOUR_ID,
        user_id: USER_ID,
        role: "admin",
        status: "confirmed",
        is_active: true,
      },
    })

    const access = await requireTourAccess({
      supabase,
      userId: USER_ID,
      tourId: TOUR_ID,
      orgId: ORG_ID,
    })

    expect(access.relation).toBe("tour_collaborator")
    expect(access.collaboratorRole).toBe("admin")

    await expect(
      requireTourCapability({
        supabase,
        userId: USER_ID,
        tourId: TOUR_ID,
        orgId: ORG_ID,
        capability: "tour.manage",
      }),
    ).resolves.toMatchObject({ relation: "tour_collaborator" })
  })

  it("denies pending collaborators", async () => {
    const supabase = createClient({
      tours: {
        id: TOUR_ID,
        org_id: ORG_ID,
        status: "active",
        name: "Collab Tour",
        created_by: OTHER_USER,
        user_id: OTHER_USER,
      },
      org_members: null,
      tour_team_members: {
        id: "member-1",
        tour_id: TOUR_ID,
        user_id: USER_ID,
        role: "admin",
        status: "pending",
        is_active: true,
      },
    })

    await expect(
      requireTourAccess({
        supabase,
        userId: USER_ID,
        tourId: TOUR_ID,
        orgId: ORG_ID,
      }),
    ).rejects.toBeInstanceOf(TourAccessDeniedError)
  })

  it("allows legacy owners only when no acting org is forced", async () => {
    const supabase = createClient({
      tours: {
        id: TOUR_ID,
        org_id: null,
        status: "draft",
        name: "Legacy",
        created_by: USER_ID,
        user_id: USER_ID,
      },
      org_members: null,
      tour_team_members: null,
    })

    const access = await requireTourAccess({
      supabase,
      userId: USER_ID,
      tourId: TOUR_ID,
    })
    expect(access.relation).toBe("legacy_owner")

    await expect(
      requireTourAccess({
        supabase,
        userId: USER_ID,
        tourId: TOUR_ID,
        orgId: ORG_ID,
      }),
    ).rejects.toBeInstanceOf(TourAccessDeniedError)
  })

  it("enforces capabilities for org members", async () => {
    const supabase = createClient({
      tours: {
        id: TOUR_ID,
        org_id: ORG_ID,
        status: "draft",
        name: "Cap Tour",
        created_by: OTHER_USER,
        user_id: OTHER_USER,
      },
      org_members: { org_id: ORG_ID, user_id: USER_ID },
      tour_team_members: null,
    })

    await expect(
      requireTourCapability({
        supabase,
        userId: USER_ID,
        tourId: TOUR_ID,
        orgId: ORG_ID,
        capability: "tour.manage",
        capabilities: ["tour.view"],
      }),
    ).rejects.toBeInstanceOf(TourCapabilityDeniedError)

    await expect(
      requireTourCapability({
        supabase,
        userId: USER_ID,
        tourId: TOUR_ID,
        orgId: ORG_ID,
        capability: "tour.view",
        capabilities: ["tour.view"],
      }),
    ).resolves.toMatchObject({ relation: "org_member" })
  })
})
