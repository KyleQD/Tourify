import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { getWorkerOpsDashboard } from "@/lib/services/worker-ops.service"

function createChain(finalResult: { data: unknown; error: unknown }) {
  const chain: Record<string, any> = {}
  const self = () => chain
  chain.select = vi.fn(self)
  chain.eq = vi.fn(self)
  chain.in = vi.fn(self)
  chain.or = vi.fn(self)
  chain.order = vi.fn(self)
  chain.limit = vi.fn(self)
  chain.maybeSingle = vi.fn(async () => finalResult)
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(finalResult))
  return chain
}

describe("getWorkerOpsDashboard", () => {
  it("returns shifts and tasks for a hired worker", async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "staff_members") {
          return createChain({
            data: [
              {
                id: "staff_1",
                status: "pending",
                position: "Stagehand",
                role: "Stagehand",
                employer_entity_type: "organization",
                employer_entity_id: "org_1",
              },
            ],
            error: null,
          })
        }

        if (table === "employment_assignments") {
          return createChain({
            data: [
              {
                id: "assign_1",
                role_title: "Stagehand",
                status: "invited",
                event_id: "event_1",
                tour_id: "tour_1",
                employer_entity_type: "organization",
                employer_entity_id: "org_1",
              },
            ],
            error: null,
          })
        }

        if (table === "staff_shifts") {
          return createChain({
            data: [
              {
                id: "shift_1",
                event_id: "event_1",
                shift_date: "2026-08-01",
                start_time: "09:00",
                end_time: "17:00",
                role_assignment: "Stagehand",
                status: "scheduled",
                zone_assignment: "Stage",
              },
            ],
            error: null,
          })
        }

        if (table === "tasks") {
          return createChain({
            data: [
              {
                id: "task_1",
                event_id: "event_1",
                title: "Load-in check",
                status: "todo",
                due_date: "2026-08-01",
                priority: "high",
              },
            ],
            error: null,
          })
        }

        if (table === "lodging_guest_assignments") {
          return createChain({ data: [], error: null })
        }

        if (table === "travel_group_members") {
          return createChain({ data: [], error: null })
        }

        return createChain({ data: [], error: null })
      }),
    }

    const dashboard = await getWorkerOpsDashboard({
      supabase: supabase as never,
      userId: "user_worker",
    })

    expect(dashboard.staffMembers).toHaveLength(1)
    expect(dashboard.assignments[0].tourId).toBe("tour_1")
    expect(dashboard.shifts[0].role).toBe("Stagehand")
    expect(dashboard.tasks[0].title).toBe("Load-in check")
  })
})
