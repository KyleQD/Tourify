import { ensureVenueOperationalContext, type VenueContext } from "@/lib/venue/venue-access"

/**
 * VEN-087 — provisioning must not escalate the first caller to org owner.
 * Mirrors the chainable Supabase mock pattern from lib/workflows tests.
 */

type Row = Record<string, any>

interface MockSpec {
  venueProfile?: Row | null
  bridgeRow?: Row | null
  existingOrgId?: string | null
  existingVenuesV2Id?: string | null
}

function createServiceMock(spec: MockSpec) {
  const calls: Array<{ table: string; op: string; payload?: Row }> = []

  const single = (table: string, row: Row | null) => async () => {
    calls.push({ table, op: "single" })
    return { data: row, error: null }
  }

  const client = {
    from(table: string) {
      if (table === "venue_identity_bridges") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                calls.push({ table, op: "maybeSingle" })
                return { data: spec.bridgeRow ?? null, error: null }
              },
            }),
          }),
          upsert: async (payload: Row) => {
            calls.push({ table, op: "upsert", payload })
            return { error: null }
          },
        }
      }

      if (table === "organizations") {
        return {
          upsert: (payload: Row) => ({
            select: () => ({
              single: single(table, spec.existingOrgId ? { id: spec.existingOrgId } : { id: "new-org-1" }),
            }),
            // capture for assertion
            __payload: payload,
          }),
        }
      }

      if (table === "venues_v2") {
        return {
          upsert: () => ({
            select: () => ({
              single: single(table, spec.existingVenuesV2Id ? { id: spec.existingVenuesV2Id } : { id: "new-v2-1" }),
            }),
          }),
        }
      }

      // org_members / venue_profiles update paths — record and succeed.
      return new Proxy(
        {},
        {
          get(_t, op: string) {
            if (op === "upsert") {
              return async (payload: Row) => {
                calls.push({ table, op: "upsert", payload })
                return { error: null }
              }
            }
            if (op === "update") {
              return (payload: Row) => ({
                eq: async () => {
                  calls.push({ table, op: "update", payload })
                  return { error: null }
                },
              })
            }
            return () => ({ data: null, error: null })
          },
        },
      )
    },
  }

  function orgMemberUpserts() {
    return calls.filter((c) => c.table === "org_members" && c.op === "upsert")
  }
  function bridgeUpserts() {
    return calls.filter((c) => c.table === "venue_identity_bridges" && c.op === "upsert")
  }
  function organizationUpserts() {
    return calls.filter((c) => c.table === "organizations" && c.op === "single")
  }

  return { client: client as never, calls, orgMemberUpserts, bridgeUpserts, organizationUpserts }
}

function buildVenue(overrides?: Partial<VenueContext>): VenueContext {
  return {
    id: "vp-123",
    venueProfileId: "vp-123",
    displayName: "Test Venue",
    role: "team",
    settings: {},
    ...overrides,
  } as VenueContext
}

describe("ensureVenueOperationalContext — VEN-087 escalation guard", () => {
  it("does NOT grant org owner to a delegated team member on first provisioning", async () => {
    const mock = createServiceMock({})
    const venue = buildVenue({ role: "team" })

    await ensureVenueOperationalContext(mock.client, venue, "user-a")

    const upserts = mock.orgMemberUpserts()
    expect(upserts).toHaveLength(1)
    expect(upserts[0].payload?.role).toBe("member")
  })

  it("preserves owner mirroring for a verified Venue account owner", async () => {
    const mock = createServiceMock({})
    const venue = buildVenue({ role: "owner" })

    await ensureVenueOperationalContext(mock.client, venue, "user-owner")

    const upserts = mock.orgMemberUpserts()
    expect(upserts).toHaveLength(1)
    expect(upserts[0].payload?.role).toBe("owner")
  })

  it("is a no-op when the bridge already carries both identities", async () => {
    const mock = createServiceMock({
      bridgeRow: { venue_profile_id: "vp-123", venues_v2_id: "v2-exists", operational_org_id: "org-exists" },
      existingOrgId: "org-exists",
      existingVenuesV2Id: "v2-exists",
    })
    const venue = buildVenue({ role: "team", venuesV2Id: "v2-exists", operationalOrgId: "org-exists" })

    const result = await ensureVenueOperationalContext(mock.client, venue, "user-a")

    expect(mock.organizationUpserts()).toHaveLength(0)
    expect(mock.orgMemberUpserts()).toHaveLength(0)
    expect(mock.bridgeUpserts()).toHaveLength(0)
    expect(result.venuesV2Id).toBe("v2-exists")
    expect(result.operationalOrgId).toBe("org-exists")
  })

  it("write-throughs newly provisioned identities to the relational bridge", async () => {
    const mock = createServiceMock({})
    const venue = buildVenue({ role: "team" })

    await ensureVenueOperationalContext(mock.client, venue, "user-a")

    const bridge = mock.bridgeUpserts()
    expect(bridge).toHaveLength(1)
    expect(bridge[0].payload).toMatchObject({
      venue_profile_id: "vp-123",
      venues_v2_id: "new-v2-1",
      operational_org_id: "new-org-1",
      provenance: "runtime",
    })
  })
})
