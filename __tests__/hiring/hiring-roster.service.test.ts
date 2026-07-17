import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { HiringRosterService } from "@/lib/services/hiring-roster.service"
import type { HiringEntity } from "@/types/hiring-entity"

const employer: HiringEntity = {
  entityType: "organization",
  entityId: "00000000-0000-0000-0000-000000000002",
  displayName: "Test Org",
}

class QueryBuilder {
  private table: string
  private selectArg: string | undefined
  private ranged = false
  public selects: string[]

  constructor(table: string, selects: string[]) {
    this.table = table
    this.selects = selects
  }

  select(arg: string) {
    this.selectArg = arg
    this.selects.push(`${this.table}:${arg}`)
    return this
  }

  eq() {
    return this
  }

  in() {
    return this
  }

  order() {
    return this
  }

  range() {
    this.ranged = true
    return this
  }

  then(resolve: (value: any) => void) {
    resolve(this.resolve())
  }

  private resolve() {
    if (this.table === "staff_members" && this.ranged) {
      return {
        data: [
          {
            id: "staff-1",
            user_id: "user-1",
            employer_entity_type: "organization",
            employer_entity_id: employer.entityId,
            name: "Fallback Name",
            email: "fallback@example.test",
            role: "Security",
            position: "Security",
            department: "Operations",
            status: "on_leave",
            compliance_status: "needs_review",
            created_at: "2026-07-01T00:00:00.000Z",
          },
        ],
        error: null,
        count: 1,
      }
    }

    if (this.table === "staff_members" && this.selectArg?.startsWith("status")) {
      return {
        data: [{ status: "on_leave", compliance_status: "needs_review", department: "Operations" }],
        error: null,
      }
    }

    if (this.table === "profiles") {
      return {
        data: [
          {
            id: "profile-1",
            user_id: "user-1",
            full_name: "Hydrated Worker",
            email: "worker@example.test",
            phone: "555-0100",
            avatar_url: "https://example.test/avatar.png",
          },
        ],
        error: null,
      }
    }

    return { data: [], error: null }
  }
}

function createSupabaseMock() {
  const selects: string[] = []
  return {
    selects,
    supabase: {
      from: vi.fn((table: string) => new QueryBuilder(table, selects)),
    },
  }
}

describe("HiringRosterService", () => {
  it("hydrates roster profiles without embedded PostgREST relationships", async () => {
    const { supabase, selects } = createSupabaseMock()
    const service = new HiringRosterService({ supabase: supabase as any })

    const result = await service.listRosterMembers({ employer })

    expect(selects.some((select) => select.includes("profiles:user_id"))).toBe(false)
    expect(result.members[0].profile.fullName).toBe("Hydrated Worker")
    expect(result.members[0].profile.email).toBe("worker@example.test")
    expect(result.members[0].status).toBe("inactive")
    expect(result.statusCounts.inactive).toBe(1)
  })
})
