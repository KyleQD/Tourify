import { describe, expect, it, vi } from "vitest"

import {
  LOGISTICS_PLAN_WORKSPACE_FLAG,
  resolveLogisticsPlanWorkspaceFlag,
} from "@/lib/logistics/authorization"
import { summarizeTourForLogisticsPlan } from "@/lib/logistics/plans"

function featureFlagClient(args: { definition: Record<string, unknown> | null; assignment: Record<string, unknown> | null }) {
  return {
    from: vi.fn((table: string) => {
      const row = table === "admin_feature_flag_definitions" ? args.definition : args.assignment
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
      }
      query.select.mockReturnValue(query)
      query.eq.mockReturnValue(query)
      return query
    }),
  }
}

describe("logistics plan workspace", () => {
  it("resolves only an explicit enabled organization assignment", async () => {
    const client = featureFlagClient({
      definition: {
        key: LOGISTICS_PLAN_WORKSPACE_FLAG,
        safe_default: false,
        environments: ["staging"],
        state: "active",
        expires_at: "2027-12-31T23:59:59.000Z",
      },
      assignment: {
        enabled: true,
        rollout_percentage: 100,
        environment: "staging",
        assignment_version: 4,
      },
    })
    await expect(resolveLogisticsPlanWorkspaceFlag({
      supabase: client,
      orgId: "org-a",
      now: new Date("2026-08-09T00:00:00.000Z"),
    })).resolves.toMatchObject({ enabled: true, assignmentVersion: 4 })
  })

  it("fails closed when the organization does not have an assignment", async () => {
    const client = featureFlagClient({
      definition: {
        key: LOGISTICS_PLAN_WORKSPACE_FLAG,
        safe_default: false,
        environments: ["staging"],
        state: "active",
        expires_at: "2027-12-31T23:59:59.000Z",
      },
      assignment: null,
    })
    await expect(resolveLogisticsPlanWorkspaceFlag({
      supabase: client,
      orgId: "org-a",
      now: new Date("2026-08-09T00:00:00.000Z"),
    })).resolves.toMatchObject({ enabled: false, reason: "assignment_missing" })
  })

  it("keeps the canonical tour plan as the workspace source", () => {
    expect(summarizeTourForLogisticsPlan({
      tourId: "tour-a",
      orgId: "org-a",
      planVersion: 3,
      name: "Northbound",
      description: null,
      status: "draft",
      start_date: "2026-09-01",
      end_date: "2026-09-03",
      main_artist: null,
      markets: [],
      route_notes: null,
      routeProjection: [],
      stops: [{
        event_id: null,
        ordinal: 0,
        name: "Seattle",
        venue: null,
        date: "2026-09-01",
        time: null,
        market: null,
        leg_name: null,
        capacity: null,
        advance_status: "not_started",
        stop_type: "show",
      }],
    })).toEqual({
      tourId: "tour-a",
      name: "Northbound",
      startDate: "2026-09-01",
      endDate: "2026-09-03",
      stopCount: 1,
    })
  })
})
