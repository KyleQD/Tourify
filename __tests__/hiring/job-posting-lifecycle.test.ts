import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { reconcileJobPostingFillStatus } from "@/lib/hiring/job-posting-lifecycle"

function createSupabaseMock({ status, positions, activeHires }: { status: string; positions: number; activeHires: number }) {
  const jobUpdates: Array<Record<string, unknown>> = []
  const auditInserts: Array<Record<string, unknown>> = []

  const supabase = {
    from: vi.fn((table: string) => {
      let operation: "select" | "update" | "insert" = "select"
      let payload: Record<string, unknown> = {}
      let countRequested = false
      const query: Record<string, any> = {}
      query.select = vi.fn((_columns: string, options?: { count?: string }) => {
        countRequested = options?.count === "exact"
        return query
      })
      query.update = vi.fn((value: Record<string, unknown>) => {
        operation = "update"
        payload = value
        return query
      })
      query.insert = vi.fn((value: Record<string, unknown>) => {
        operation = "insert"
        payload = value
        return query
      })
      query.eq = vi.fn(() => query)
      query.in = vi.fn(() => query)
      query.neq = vi.fn(() => query)
      query.maybeSingle = vi.fn(async () => ({
        data: table === "job_posting_templates" ? { id: "job_1", status, number_of_positions: positions } : null,
        error: null,
      }))
      query.then = (resolve: (value: Record<string, unknown>) => void) => {
        if (table === "staff_onboarding_candidates") {
          return Promise.resolve(resolve({ data: [{ id: "candidate_1" }, { id: "candidate_2" }], error: null }))
        }
        if (table === "staff_members" && countRequested) {
          return Promise.resolve(resolve({ data: null, count: activeHires, error: null }))
        }
        if (table === "job_posting_templates" && operation === "update") {
          jobUpdates.push(payload)
          return Promise.resolve(resolve({ data: null, error: null }))
        }
        if (table === "hiring_audit_events" && operation === "insert") {
          auditInserts.push(payload)
          return Promise.resolve(resolve({ data: null, error: null }))
        }
        return Promise.resolve(resolve({ data: [], error: null }))
      }
      return query
    }),
  }

  return { supabase, jobUpdates, auditInserts }
}

const employer = {
  entityType: "organization" as const,
  entityId: "11111111-1111-4111-8111-111111111111",
  displayName: "DreamStream",
}

describe("reconcileJobPostingFillStatus", () => {
  it("marks a published role filled when active hires reach requested positions", async () => {
    const { supabase, jobUpdates, auditInserts } = createSupabaseMock({ status: "published", positions: 2, activeHires: 2 })
    const result = await reconcileJobPostingFillStatus({
      supabase: supabase as never,
      employer,
      jobPostingId: "job_1",
      actorUserId: "admin_1",
    })

    expect(result).toMatchObject({ status: "filled", activeHires: 2, requestedPositions: 2, changed: true })
    expect(jobUpdates).toEqual([expect.objectContaining({ status: "filled" })])
    expect(auditInserts).toEqual([expect.objectContaining({ event_type: "job_filled", job_id: "job_1" })])
  })

  it("does not republish a filled role when an active hire later leaves", async () => {
    const { supabase, jobUpdates, auditInserts } = createSupabaseMock({ status: "filled", positions: 2, activeHires: 1 })
    const result = await reconcileJobPostingFillStatus({
      supabase: supabase as never,
      employer,
      jobPostingId: "job_1",
      actorUserId: "admin_1",
    })

    expect(result).toMatchObject({ status: "filled", activeHires: 1, changed: false })
    expect(jobUpdates).toHaveLength(0)
    expect(auditInserts).toHaveLength(0)
  })
})
