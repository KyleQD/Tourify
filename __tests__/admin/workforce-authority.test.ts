import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  validateStaffMemberParent,
  validateTeamParent,
  validateWorkforceAssignmentParents,
  WorkforceOrgScopeError,
  WorkforceParentValidationError,
} from "@/lib/admin/workforce-authority.service"
import {
  projectWorkforceRecord,
  WORKFORCE_FIELD_CLASSES,
} from "@/lib/admin/workforce-field-projections"

const USER_ID = "11111111-1111-4111-8111-111111111111"
const ORG_ID = "22222222-2222-4222-8222-222222222222"
const OTHER_ORG = "88888888-8888-4888-8888-888888888888"
const TOUR_ID = "44444444-4444-4444-8444-444444444444"
const TEAM_ID = "55555555-5555-4555-8555-555555555555"
const STAFF_ID = "66666666-6666-4666-8666-666666666666"
const EVENT_ID = "33333333-3333-4333-8333-333333333333"

type TableRow = Record<string, unknown> | null

function createClient(tables: Record<string, TableRow | TableRow[]>) {
  return {
    from(table: string) {
      const payload = tables[table]
      const rows = Array.isArray(payload) ? payload : payload ? [payload] : []
      const state: { filters: Array<[string, unknown]> } = { filters: [] }

      const query = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
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

describe("WORK-102 workforce field projections", () => {
  it("classifies protected fields", () => {
    expect(WORKFORCE_FIELD_CLASSES.email).toBe("contact")
    expect(WORKFORCE_FIELD_CLASSES.contract_amount).toBe("financial")
    expect(WORKFORCE_FIELD_CLASSES.ssn).toBe("sensitive_personal")
    expect(WORKFORCE_FIELD_CLASSES.emergency_contact).toBe("personnel_sensitive")
  })

  it("redacts financial and sensitive fields without finance.manage", () => {
    const projected = projectWorkforceRecord(
      {
        id: "1",
        name: "Alex",
        email: "a@example.com",
        contract_amount: 1200,
        ssn: "123-45-6789",
        emergency_contact: "Pat",
        role: "stage",
      },
      { capabilities: ["workforce.view"] },
    )

    expect(projected.name).toBe("Alex")
    expect(projected.email).toBe("a@example.com")
    expect(projected.role).toBe("stage")
    expect(projected.contract_amount).toBeNull()
    expect(projected.contract_amount__redacted).toBe(true)
    expect(projected.ssn).toBeNull()
    expect(projected.emergency_contact).toBeNull()
  })

  it("exposes financial fields with finance.view", () => {
    const projected = projectWorkforceRecord(
      { id: "1", contract_amount: 500, rate: 40 },
      { capabilities: ["workforce.view", "finance.view"] },
    )
    expect(projected.contract_amount).toBe(500)
    expect(projected.rate).toBe(40)
  })
})

describe("WORK-102 workforce assignment authority", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects missing org scope", async () => {
    await expect(
      validateWorkforceAssignmentParents({
        supabase: createClient({}),
        userId: USER_ID,
        orgId: "",
        tourId: TOUR_ID,
      }),
    ).rejects.toBeInstanceOf(WorkforceOrgScopeError)
  })

  it("validates team belongs to tour", async () => {
    await expect(
      validateTeamParent({
        supabase: createClient({
          tour_teams: { id: TEAM_ID, tour_id: TOUR_ID },
        }),
        tourId: TOUR_ID,
        teamId: TEAM_ID,
      }),
    ).resolves.toEqual({ teamId: TEAM_ID, tourId: TOUR_ID })

    await expect(
      validateTeamParent({
        supabase: createClient({
          tour_teams: { id: TEAM_ID, tour_id: TOUR_ID },
        }),
        tourId: "77777777-7777-4777-8777-777777777777",
        teamId: TEAM_ID,
      }),
    ).rejects.toBeInstanceOf(WorkforceParentValidationError)
  })

  it("requires staff member org match", async () => {
    await expect(
      validateStaffMemberParent({
        supabase: createClient({
          staff_members: {
            id: STAFF_ID,
            org_id: ORG_ID,
            employer_entity_type: "organization",
            employer_entity_id: ORG_ID,
          },
        }),
        orgId: ORG_ID,
        staffMemberId: STAFF_ID,
      }),
    ).resolves.toEqual({ staffMemberId: STAFF_ID, orgId: ORG_ID })

    await expect(
      validateStaffMemberParent({
        supabase: createClient({
          staff_members: {
            id: STAFF_ID,
            org_id: OTHER_ORG,
            employer_entity_type: "organization",
            employer_entity_id: OTHER_ORG,
          },
        }),
        orgId: ORG_ID,
        staffMemberId: STAFF_ID,
      }),
    ).rejects.toBeInstanceOf(WorkforceParentValidationError)
  })

  it("accepts staff scoped via organizer_accounts ops_org_id", async () => {
    await expect(
      validateStaffMemberParent({
        supabase: createClient({
          staff_members: {
            id: STAFF_ID,
            org_id: null,
            employer_entity_type: "organization",
            employer_entity_id: OTHER_ORG, // organizer_accounts.id, not org id
            user_id: null,
          },
          organizer_accounts: { id: OTHER_ORG, user_id: USER_ID, ops_org_id: ORG_ID },
        }),
        orgId: ORG_ID,
        staffMemberId: STAFF_ID,
      }),
    ).resolves.toEqual({ staffMemberId: STAFF_ID, orgId: ORG_ID })
  })

  it("accepts active org members whose staff row lacks org scope", async () => {
    await expect(
      validateStaffMemberParent({
        supabase: createClient({
          staff_members: {
            id: STAFF_ID,
            org_id: null,
            employer_entity_type: "venue",
            employer_entity_id: null,
            user_id: USER_ID,
          },
          org_members: { org_id: ORG_ID, user_id: USER_ID, role: "member" },
        }),
        orgId: ORG_ID,
        staffMemberId: STAFF_ID,
      }),
    ).resolves.toEqual({ staffMemberId: STAFF_ID, orgId: ORG_ID })
  })

  it("validates tour parent via org membership", async () => {
    const supabase = createClient({
      org_members: { org_id: ORG_ID, user_id: USER_ID },
      tours: {
        id: TOUR_ID,
        org_id: ORG_ID,
        status: "active",
        name: "Spring",
        created_by: USER_ID,
        user_id: USER_ID,
      },
      tour_team_members: null,
      events_v2: {
        id: EVENT_ID,
        org_id: ORG_ID,
        status: "confirmed",
        title: "Night 1",
        created_by: USER_ID,
      },
      tour_events: [],
      staff_members: {
        id: STAFF_ID,
        org_id: ORG_ID,
        employer_entity_type: "organization",
        employer_entity_id: ORG_ID,
      },
    })

    await expect(
      validateWorkforceAssignmentParents({
        supabase,
        userId: USER_ID,
        orgId: ORG_ID,
        tourId: TOUR_ID,
        eventId: EVENT_ID,
        staffMemberId: STAFF_ID,
        role: "rigger",
        requireRole: true,
      }),
    ).resolves.toEqual({ orgId: ORG_ID })
  })
})
