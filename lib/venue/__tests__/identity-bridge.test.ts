import {
  fetchVenueIdentityBridge,
  upsertVenueIdentityBridge,
} from "@/lib/venue/identity-bridge"

/**
 * VEN-001/VEN-088 — relational identity bridge contract tests.
 * Uses the chainable Supabase client mock pattern from lib/workflows tests.
 */

function createSupabaseMock(bridgeRow: Record<string, unknown> | null, options?: { upsertError?: boolean }) {
  const upsertCalls: Array<{ payload: Record<string, unknown>; opts: Record<string, unknown> }> = []

  const client = {
    from(table: string) {
      expect(table).toBe("venue_identity_bridges")
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: bridgeRow, error: null }),
          }),
        }),
        upsert: async (payload: Record<string, unknown>, opts: Record<string, unknown>) => {
          upsertCalls.push({ payload, opts })
          return { error: options?.upsertError ? new Error("boom") : null }
        },
      }
    },
  }

  return { client, upsertCalls }
}

describe("fetchVenueIdentityBridge", () => {
  it("returns the mapped triangle when a bridge row exists", async () => {
    const row = {
      venue_profile_id: "vp-1",
      venues_v2_id: "v2-1",
      operational_org_id: "org-1",
    }
    const { client } = createSupabaseMock(row)
    const result = await fetchVenueIdentityBridge(client as never, "vp-1")
    expect(result).toEqual({
      venueProfileId: "vp-1",
      venuesV2Id: "v2-1",
      operationalOrgId: "org-1",
    })
  })

  it("returns nulls for unmapped sides instead of undefined", async () => {
    const { client } = createSupabaseMock({
      venue_profile_id: "vp-2",
      venues_v2_id: null,
      operational_org_id: null,
    })
    const result = await fetchVenueIdentityBridge(client as never, "vp-2")
    expect(result).toEqual({
      venueProfileId: "vp-2",
      venuesV2Id: null,
      operationalOrgId: null,
    })
  })

  it("returns null when no bridge row exists (settings-JSON fallback window)", async () => {
    const { client } = createSupabaseMock(null)
    expect(await fetchVenueIdentityBridge(client as never, "vp-3")).toBeNull()
  })

  it("returns null on empty venueProfileId without querying", async () => {
    const { client } = createSupabaseMock(null)
    expect(await fetchVenueIdentityBridge(client as never, "")).toBeNull()
  })
})

describe("upsertVenueIdentityBridge", () => {
  it("writes only provided sides with provenance and canonical conflict target", async () => {
    const { client, upsertCalls } = createSupabaseMock(null)
    const ok = await upsertVenueIdentityBridge(
      client as never,
      { venueProfileId: "vp-4", venuesV2Id: "v2-4", operationalOrgId: null },
      "runtime",
    )
    expect(ok).toBe(true)
    expect(upsertCalls).toHaveLength(1)
    expect(upsertCalls[0].payload).toEqual({
      venue_profile_id: "vp-4",
      venues_v2_id: "v2-4",
      provenance: "runtime",
    })
    expect(upsertCalls[0].opts).toEqual({ onConflict: "venue_profile_id" })
  })

  it("reports failure when the write errors", async () => {
    const { client } = createSupabaseMock(null, { upsertError: true })
    const ok = await upsertVenueIdentityBridge(
      client as never,
      { venueProfileId: "vp-5", venuesV2Id: null, operationalOrgId: "org-5" },
      "manual",
    )
    expect(ok).toBe(false)
  })
})
