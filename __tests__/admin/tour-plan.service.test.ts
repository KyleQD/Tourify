import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  readTourPlan,
  tourPlanWriteSchema,
  TourPlanValidationError,
  writeTourPlan,
} from "@/lib/admin/tour-plan.service"

vi.mock("@/lib/admin/tour-access.service", () => ({
  requireTourAccess: vi.fn().mockResolvedValue({ orgId: "22222222-2222-4222-8222-222222222222" }),
  TourAccessDeniedError: class TourAccessDeniedError extends Error {
    readonly status = 404
  },
}))

function planReadClient(args: {
  stops: unknown[] | null
  stopError?: { code: string; message: string } | null
}) {
  const accessed: string[] = []
  const tour = {
    id: "33333333-3333-4333-8333-333333333333",
    org_id: "22222222-2222-4222-8222-222222222222",
    name: "Canonical Tour",
    status: "planning",
    plan_version: 2,
    current_draft_version_id: "44444444-4444-4444-8444-444444444444",
    settings: {},
  }

  return {
    accessed,
    client: {
      from(table: string) {
        accessed.push(table)
        if (table === "tours") {
          const query = {
            select: () => query,
            eq: () => query,
            maybeSingle: async () => ({ data: tour, error: null }),
          }
          return query
        }
        if (table === "tour_stops") {
          const query = {
            select: () => query,
            eq: () => query,
            order: async () => ({ data: args.stops, error: args.stopError ?? null }),
          }
          return query
        }
        throw new Error(`Unexpected compatibility read: ${table}`)
      },
    },
  }
}

describe("PLAN-101 canonical tour plan service", () => {
  it("requires expectedPlanVersion and full stop schema", () => {
    const parsed = tourPlanWriteSchema.safeParse({
      name: "West Coast",
      stops: [{ name: "LA", date: "2026-08-01" }],
    })
    expect(parsed.success).toBe(false)

    const ok = tourPlanWriteSchema.safeParse({
      expectedPlanVersion: 1,
      name: "West Coast",
      stops: [{ name: "LA", date: "2026-08-01", advance_status: "not_started" }],
    })
    expect(ok.success).toBe(true)
  })

  it("rejects independent routing JSON writes", async () => {
    await expect(
      writeTourPlan({
        supabase: { from: () => ({}) },
        userId: "11111111-1111-4111-8111-111111111111",
        tourId: "33333333-3333-4333-8333-333333333333",
        orgId: "22222222-2222-4222-8222-222222222222",
        input: {
          expectedPlanVersion: 1,
          name: "Drift Tour",
          stops: [{ name: "SF", date: "2026-09-01" }],
          routing: [{ order: 1, name: "SF" }],
        },
      }),
    ).rejects.toBeInstanceOf(TourPlanValidationError)
  })

  it("treats an empty canonical draft as authoritative instead of reviving legacy links", async () => {
    const { client, accessed } = planReadClient({ stops: [] })
    const plan = await readTourPlan({
      supabase: client,
      userId: "11111111-1111-4111-8111-111111111111",
      tourId: "33333333-3333-4333-8333-333333333333",
      orgId: "22222222-2222-4222-8222-222222222222",
    })

    expect(plan.stops).toEqual([])
    expect(accessed).not.toContain("tour_events")
  })

  it("surfaces canonical stop read failures instead of silently falling back", async () => {
    const { client, accessed } = planReadClient({
      stops: null,
      stopError: { code: "XX001", message: "canonical plan read failed" },
    })

    await expect(
      readTourPlan({
        supabase: client,
        userId: "11111111-1111-4111-8111-111111111111",
        tourId: "33333333-3333-4333-8333-333333333333",
        orgId: "22222222-2222-4222-8222-222222222222",
      }),
    ).rejects.toThrow("canonical plan read failed")
    expect(accessed).not.toContain("tour_events")
  })
})
