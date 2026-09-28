import { describe, expect, it } from "vitest"
import {
  resolveTourCommandCenterDomainAccess,
  TOUR_COMMAND_CENTER_SUMMARY_P95_TARGET_MS,
  buildTourCommandCenterSummary,
} from "@/lib/admin/tour-command-center-summary"

describe("TOUR-203 command-center summary BFF", () => {
  it("defines a measured p95 latency target", () => {
    expect(TOUR_COMMAND_CENTER_SUMMARY_P95_TARGET_MS).toBe(800)
    expect(TOUR_COMMAND_CENTER_SUMMARY_P95_TARGET_MS).toBeLessThanOrEqual(1000)
  })

  it("maps capabilities to domain access without leaking denied domains as writable", () => {
    const viewer = resolveTourCommandCenterDomainAccess(["tour.view", "event.view"])
    expect(viewer.overview).toBe(true)
    expect(viewer.shows).toBe(true)
    expect(viewer.finance).toBe(false)
    expect(viewer.logistics).toBe(false)
    expect(viewer.people).toBe(false)
    expect(viewer.transitions).toBe(false)

    const manager = resolveTourCommandCenterDomainAccess([
      "tour.view",
      "tour.manage",
      "workforce.view",
      "logistics.view",
      "finance.view",
      "vendor.view",
    ])
    expect(manager.people).toBe(true)
    expect(manager.logistics).toBe(true)
    expect(manager.finance).toBe(true)
    expect(manager.vendors).toBe(true)
    expect(manager.transitions).toBe(true)
  })

  it("assembles identity, lifecycle, versions, counts, risks, and freshness", async () => {
    const supabase = {
      from: (table: string) => {
        const empty = {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        }
        if (table === "tour_events") {
          return {
            select: () => ({
              eq: () => ({
                order: async () => ({
                  data: [
                    {
                      ordinal: 0,
                      advance_status: "not_started",
                      events_v2: {
                        id: "e1",
                        title: "Show 1",
                        start_at: "2026-08-01T20:00:00.000Z",
                        venue_id: "v1",
                      },
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }
        }
        if (table === "tour_stops") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({ order: async () => ({
                    data: [{ id: "stop-1", ordinal: 0, name: "Los Angeles", stop_type: "show", local_date: "2026-08-01" }],
                    error: null,
                  }) }),
                }),
              }),
            }),
          }
        }
        return empty
      },
    }

    const summary = await buildTourCommandCenterSummary({
      supabase: supabase as never,
      tourId: "tour-1",
      orgId: "org-1",
      capabilities: ["tour.view", "event.view", "tour.manage", "workforce.view"],
      tour: {
        id: "tour-1",
        org_id: "org-1",
        name: "Summer Run",
        status: "published",
        metadata_version: 4,
        plan_version: 2,
        start_date: "2026-08-01",
        end_date: "2026-08-10",
        settings: {
          main_artist: "Ada",
          lifecycle: {
            last_command: "publish",
            published_by: "u1",
            last_transition_at: "2026-07-01T00:00:00.000Z",
          },
        },
      },
    })

    expect(summary.identity.name).toBe("Summer Run")
    expect(summary.lifecycle.state).toBe("published")
    expect(summary.lifecycle.lastCommand).toBe("publish")
    expect(summary.versions.metadataVersion).toBe(4)
    expect(summary.versions.planVersion).toBe(2)
    expect(summary.counts.events).toBe(1)
    expect(summary.stopsState).toBe("ready")
    expect(summary.stops).toHaveLength(1)
    expect(summary.domainAccess.overview).toBe(true)
    expect(summary.freshness.p95TargetMs).toBe(TOUR_COMMAND_CENTER_SUMMARY_P95_TARGET_MS)
    expect(summary.freshness.generatedAt).toBeTruthy()
    expect(Array.isArray(summary.risks)).toBe(true)
    expect(summary.contract.contractVersion).toBe(1)
    expect(summary.risks.every((risk) => typeof risk.remediationUrl === "string")).toBe(true)
    expect(summary.domainMetrics.some((metric) => metric.domain === "shows" && metric.count === 1)).toBe(true)
    expect(summary.health.status).toBe("degraded")
    expect(summary.health.unknown.map((signal) => signal.signal_id)).toContain("route.health_unavailable")
    expect(summary.health.unknown.map((signal) => signal.signal_id)).toContain("logistics.missing_segments")
  })

  it("rolls persisted route-leg failures into command-center health and risks", async () => {
    const empty = {
      select: () => ({
        eq: () => ({
          order: () => ({ limit: async () => ({ data: [], error: null }) }),
          limit: async () => ({ data: [], error: null }),
        }),
      }),
    }
    const supabase = {
      from: (table: string) => {
        if (table === "tour_stops") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({ order: async () => ({ data: [], error: null }) }),
                }),
              }),
            }),
          }
        }
        if (table === "tour_route_legs") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: async () => ({
                    data: [{
                      has_conflict: true,
                      conflict_codes: ["insufficient_travel", "excessive_drive"],
                      distance_km: null,
                      duration_minutes: null,
                      calculated_at: null,
                    }],
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return empty
      },
    }

    const summary = await buildTourCommandCenterSummary({
      supabase: supabase as never,
      tourId: "tour-1",
      orgId: "org-1",
      capabilities: ["tour.view", "logistics.view"],
      tour: {
        id: "tour-1",
        org_id: "org-1",
        name: "Summer Run",
        status: "planning",
        start_date: "2026-08-01",
        end_date: "2026-08-10",
        settings: { main_artist: "Ada" },
      },
    })

    expect(summary.health.errors.map((signal) => signal.signal_id)).toEqual(expect.arrayContaining([
      "route.conflict_errors",
      "route.unknown_legs",
    ]))
    expect(summary.health.warnings.map((signal) => signal.signal_id)).toContain("route.conflict_warnings")
    expect(summary.health.unknown.map((signal) => signal.signal_id)).toContain("logistics.missing_rooms")
    expect(summary.risks.map((risk) => risk.id)).toContain("route.conflict_errors")
    expect(summary.freshness.isDegraded).toBe(true)
  })
})
