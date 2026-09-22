import { describe, expect, it } from "vitest"

import {
  buildCommandCenterDomainMetric,
  COMMAND_CENTER_SUMMARY_CONTRACT_VERSION,
  parseCommandCenterSummaryContract,
  resolveCommandCenterDomainRemediationUrl,
  resolveRiskRemediationUrl,
  safeParseCommandCenterSummaryContract,
} from "@/lib/admin/command-center-summary-contract"
import {
  buildTourCommandCenterSummary,
  TOUR_COMMAND_CENTER_SUMMARY_P95_TARGET_MS,
} from "@/lib/admin/tour-command-center-summary"

describe("REP-201 command-center summary contract", () => {
  it("rejects payloads missing remediation links or domain metrics", () => {
    const parsed = safeParseCommandCenterSummaryContract({
      contractVersion: COMMAND_CENTER_SUMMARY_CONTRACT_VERSION,
      identity: {
        id: "t1",
        orgId: "o1",
        name: "Run",
        slug: null,
        mainArtist: null,
        status: "draft",
        lifecycleState: "draft",
        startDate: null,
        endDate: null,
      },
      lifecycle: {
        state: "draft",
        lastCommand: null,
        lastTransitionAt: null,
        publishedBy: null,
      },
      versions: { metadataVersion: 1, planVersion: null, publishedVersion: null },
      access: {
        class: "capability_projection",
        domains: {
          overview: true,
          shows: true,
          people: false,
          logistics: false,
          finance: false,
          vendors: false,
          ticketing: false,
          publications: true,
          transitions: false,
        },
      },
      domainMetrics: [],
      risks: [{ id: "x", severity: "warning", label: "x", domain: "readiness" }],
      freshness: {
        generatedAt: new Date().toISOString(),
        isStale: false,
        staleReasons: [],
        p95TargetMs: TOUR_COMMAND_CENTER_SUMMARY_P95_TARGET_MS,
        isDegraded: false,
      },
    })
    expect(parsed.success).toBe(false)
  })

  it("treats denied and unavailable counts as null (never fake zero)", () => {
    const denied = buildCommandCenterDomainMetric({
      domain: "finance",
      tourId: "tour-1",
      allowed: false,
      count: 12,
      loadError: null,
    })
    expect(denied.state).toBe("denied")
    expect(denied.count).toBeNull()
    expect(denied.remediationUrl).toBeNull()

    const unavailable = buildCommandCenterDomainMetric({
      domain: "logistics",
      tourId: "tour-1",
      allowed: true,
      count: 0,
      loadError: "timeout",
    })
    expect(unavailable.state).toBe("unavailable")
    expect(unavailable.count).toBeNull()
    expect(unavailable.remediationUrl).toContain("/admin/dashboard/tours/tour-1")
  })

  it("resolves direct remediation links for domains and readiness risks", () => {
    expect(resolveCommandCenterDomainRemediationUrl({ domain: "finance", tourId: "t1" })).toBe(
      "/admin/dashboard/tours/t1?tab=finance",
    )
    expect(resolveRiskRemediationUrl({ riskId: "readiness.overview", domain: "readiness", tourId: "t1" })).toBe(
      "/admin/dashboard/tours/t1",
    )
  })

  it("assembles a contract-valid summary from the TOUR-203 BFF", async () => {
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
                  eq: () => ({ order: async () => ({ data: [], error: null }) }),
                }),
              }),
            }),
          }
        }
        if (table === "financial_transactions") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: async () => ({
                      data: null,
                      error: { message: "finance down", code: "57014" },
                    }),
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
      capabilities: ["tour.view", "event.view", "tour.manage", "finance.view"],
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

    const contract = parseCommandCenterSummaryContract(summary.contract)
    expect(contract.contractVersion).toBe(1)
    expect(contract.identity.name).toBe("Summer Run")
    expect(contract.access.domains.finance).toBe(true)
    expect(contract.domainMetrics.find((row) => row.domain === "finance")?.state).toBe("unavailable")
    expect(contract.domainMetrics.find((row) => row.domain === "finance")?.count).toBeNull()
    expect(contract.freshness.isDegraded).toBe(true)
    expect(contract.risks.every((risk) => risk.remediationUrl.startsWith("/admin/"))).toBe(true)
    expect(summary.domainMetrics.length).toBeGreaterThanOrEqual(5)
  })
})
