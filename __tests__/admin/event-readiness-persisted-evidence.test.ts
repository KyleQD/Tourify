import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const requireEventAccess = vi.fn(async () => undefined)
vi.mock("@/lib/admin/event-access.service", () => ({
  requireEventAccess: (...args: unknown[]) => requireEventAccess(...args),
}))

import { evaluateEventReadinessFromPersisted } from "@/lib/admin/event-readiness-engine.service"

const EVENT_ID = "33333333-3333-4333-8333-333333333333"
const ORG_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const VENUE_ID = "55555555-5555-4555-8555-555555555555"

function createSupabaseFixture(input: { venueExists: boolean; activeShiftCount: number }) {
  const calls: Array<{ table: string; filters: Record<string, unknown> }> = []

  return {
    calls,
    from(table: string) {
      const filters: Record<string, unknown> = {}
      const response = () => {
        calls.push({ table, filters: { ...filters } })
        if (table === "events_v2") {
          return {
            data: {
              id: EVENT_ID,
              org_id: ORG_ID,
              title: "Evidence show",
              start_at: "2026-08-01T20:00:00.000Z",
              venue_id: VENUE_ID,
              capacity: 500,
              settings: { venue_label: "Evidence Hall", venue_account_id: VENUE_ID },
            },
            error: null,
          }
        }
        if (table === "venue_profiles") {
          return { data: input.venueExists ? { id: VENUE_ID } : null, error: null }
        }
        if (table === "staff_shifts") {
          return { data: null, count: input.activeShiftCount, error: null }
        }
        return { data: [], error: null }
      }

      const builder: any = {
        select() {
          return builder
        },
        eq(column: string, value: unknown) {
          filters[column] = value
          return builder
        },
        neq(column: string, value: unknown) {
          filters[`not_${column}`] = value
          return builder
        },
        maybeSingle() {
          return Promise.resolve(response())
        },
        then(resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) {
          return Promise.resolve(response()).then(resolve, reject)
        },
      }
      return builder
    },
  }
}

describe("REL-005 persisted readiness evidence", () => {
  beforeEach(() => vi.clearAllMocks())

  it("rejects stale venue-profile evidence and counts canonical active shifts", async () => {
    const supabase = createSupabaseFixture({ venueExists: false, activeShiftCount: 2 })
    const evaluation = await evaluateEventReadinessFromPersisted({
      supabase,
      userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      eventId: EVENT_ID,
      orgId: ORG_ID,
    })

    expect(evaluation.warnings.find((finding) => finding.id === "venue_profile")?.evidence).toMatchObject({
      venueProfileStatus: "missing",
    })
    expect(evaluation.warnings.map((finding) => finding.id)).not.toContain("team")
    expect(supabase.calls.find((call) => call.table === "staff_shifts")?.filters).toEqual({
      event_id: EVENT_ID,
      org_id: ORG_ID,
      not_status: "cancelled",
    })
  })
})
