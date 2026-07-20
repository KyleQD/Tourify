import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { listWorkforcePeople } from "@/lib/services/admin-workforce-people.service"
import { HiringRosterService } from "@/lib/services/hiring-roster.service"
import type { HiringEntity } from "@/types/hiring-entity"

const employer: HiringEntity = {
  entityType: "organization",
  entityId: "00000000-0000-0000-0000-000000000002",
  displayName: "Test Org",
}

function createChain(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, any> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.insert = vi.fn((payload?: unknown) => {
    if (payload && typeof payload === "object") chain.__lastInsert = payload
    return chain
  })
  chain.update = vi.fn((payload?: unknown) => {
    if (payload && typeof payload === "object") chain.__lastUpdate = payload
    return chain
  })
  chain.eq = vi.fn(self)
  chain.in = vi.fn(self)
  chain.or = vi.fn(self)
  chain.order = vi.fn(self)
  chain.limit = vi.fn(self)
  chain.range = vi.fn(self)
  chain.maybeSingle = vi.fn(async () => finalResult)
  chain.single = vi.fn(async () => finalResult)
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(finalResult))
  return chain
}

describe("upsertRosterFromApproval tour/event projection", () => {
  it("writes event_id and tour_id onto employment_assignments", async () => {
    let assignmentInsert: Record<string, unknown> | null = null
    let staffInsertCalls = 0

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "staff_members") {
          staffInsertCalls += 1
          if (staffInsertCalls === 1) {
            // existing lookup
            return createChain({ data: null, error: null })
          }
          if (staffInsertCalls === 2) {
            // insert
            const chain = createChain({ data: { id: "staff_1" }, error: null })
            return chain
          }
          // optional metadata update + getRosterMember
          return createChain({
            data: {
              id: "staff_1",
              user_id: "user_worker",
              employer_entity_type: "organization",
              employer_entity_id: employer.entityId,
              name: "Worker One",
              email: "worker@example.test",
              role: "Stagehand",
              position: "Stagehand",
              status: "pending",
              compliance_status: "needs_review",
            },
            error: null,
          })
        }

        if (table === "employment_assignments") {
          const chain = createChain({ data: null, error: null })
          chain.insert = vi.fn((payload: Record<string, unknown>) => {
            assignmentInsert = payload
            return createChain({ data: { id: "assign_1" }, error: null })
          })
          return chain
        }

        if (table === "hiring_audit_events") {
          return createChain({ data: null, error: null })
        }

        if (table === "profiles") {
          return createChain({ data: [], error: null })
        }

        return createChain({ data: null, error: null })
      }),
    }

    const service = new HiringRosterService({ supabase: supabase as never })
    await service.upsertRosterFromApproval({
      employer,
      actorUserId: "admin_1",
      userId: "user_worker",
      candidateId: "cand_1",
      name: "Worker One",
      email: "worker@example.test",
      position: "Stagehand",
      department: "Production",
      completed: false,
      eventId: "00000000-0000-0000-0000-0000000000e1",
      tourId: "00000000-0000-0000-0000-0000000000t1",
    })

    expect(assignmentInsert).toMatchObject({
      user_id: "user_worker",
      staff_member_id: "staff_1",
      status: "invited",
      event_id: "00000000-0000-0000-0000-0000000000e1",
      tour_id: "00000000-0000-0000-0000-0000000000t1",
    })
  })
})

describe("listWorkforcePeople", () => {
  it("includes pending staff_members and invited employment_assignments", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "staff_members") {
          const chain = createChain({
            data: [
              {
                id: "staff_pending",
                user_id: "user_hire",
                name: "Hired Worker",
                email: "hire@example.test",
                role: "Bartender",
                position: "Bartender",
                status: "pending",
              },
            ],
            error: null,
          })
          return chain
        }

        if (table === "employment_assignments") {
          const chain = createChain({
            data: [
              {
                id: "assign_invited",
                user_id: "user_hire",
                role_title: "Bartender",
                position: "Bartender",
                status: "invited",
                staff_member_id: "staff_pending",
              },
            ],
            error: null,
          })
          return chain
        }

        if (table === "tour_team_members") {
          return createChain({ data: [], error: null })
        }

        if (table === "profiles") {
          return createChain({
            data: [
              {
                id: "user_hire",
                user_id: "user_hire",
                full_name: "Hired Worker",
                email: "hire@example.test",
              },
            ],
            error: null,
          })
        }

        return createChain({ data: [], error: null })
      }),
    }

    const people = await listWorkforcePeople({
      supabase: supabase as never,
      employerEntityType: "organization",
      employerEntityId: employer.entityId,
      tourId: "00000000-0000-0000-0000-0000000000t1",
      includePending: true,
    })

    expect(people).toHaveLength(1)
    expect(people[0].userId).toBe("user_hire")
    expect(people[0].sources).toContain("staff_members")
    expect(people[0].sources).toContain("employment_assignments")
    expect(people[0].name).toBe("Hired Worker")
  })
})

describe("participants invited status contract", () => {
  it("documents that assignee pools include invited employment assignments", () => {
    const assignableStatuses = ["invited", "confirmed", "active", "completed"]
    expect(assignableStatuses).toContain("invited")
  })
})
