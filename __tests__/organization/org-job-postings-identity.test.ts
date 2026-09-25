import { describe, expect, it } from "vitest"

import { resolveOrganizationDisplayNames, type OrganizationIdentityClient } from "@/lib/organizations/job-postings-identity"
import { mapVenueTemplateToUnified } from "@/lib/rebuild/unified-jobs-list"

const ORG_ID_1 = "33333333-3333-4333-8333-333333333333"
const ORG_ID_2 = "44444444-4444-4444-8444-444444444444"
const VENUE_ID = "22222222-2222-4222-8222-222222222222"

function venueRow(overrides: Record<string, unknown> = {}) {
  return {
    id: VENUE_ID,
    title: "Stagehand",
    description: null,
    location: "Dallas",
    employment_type: "contractor",
    experience_level: "entry",
    applications_count: 1,
    views_count: 2,
    urgent: false,
    remote: null,
    created_at: "2026-06-02T00:00:00.000Z",
    ...overrides,
  }
}

describe("unified job template mapping branches on employer_entity_type", () => {
  it("maps organization-owned templates with an organization source badge and org name", () => {
    const item = mapVenueTemplateToUnified(
      venueRow({
        id: ORG_ID_1,
        employer_entity_type: "organization",
        employer_entity_id: ORG_ID_1,
        organization: { name: "Wavefront Live" },
      })
    )

    expect(item.source).toBe("organization")
    expect(item.organization_name).toBe("Wavefront Live")
    expect(item.detail_href).toBe(`/jobs/${ORG_ID_1}?source=organization`)
  })

  it("never mislabels org templates as venue when the org name is unresolved", () => {
    const item = mapVenueTemplateToUnified(
      venueRow({
        id: ORG_ID_2,
        employer_entity_type: "organization",
        employer_entity_id: ORG_ID_2,
        organization: null,
        venue: { name: "Some Unrelated Venue" },
      })
    )

    expect(item.source).toBe("organization")
    expect(item.organization_name).toBeNull()
    expect(item.detail_href).toBe(`/jobs/${ORG_ID_2}?source=organization`)
  })

  it("keeps venue-owned templates on the venue source with the venue name", () => {
    const item = mapVenueTemplateToUnified(
      venueRow({
        employer_entity_type: "venue",
        employer_entity_id: VENUE_ID,
        venue: { name: "The Room" },
      })
    )

    expect(item.source).toBe("venue")
    expect(item.organization_name).toBe("The Room")
    expect(item.detail_href).toBe(`/jobs/${VENUE_ID}?source=venue`)
    expect(item.urgent).toBe(false)
  })

  it("keeps legacy venue templates (no employer scope) on the venue source", () => {
    const item = mapVenueTemplateToUnified(venueRow({ venue: { name: "Legacy Hall" } }))

    expect(item.source).toBe("venue")
    expect(item.organization_name).toBe("Legacy Hall")
  })
})

describe("resolveOrganizationDisplayNames", () => {
  function stubClient(rows: {
    organizerAccounts?: Array<{ ops_org_id: string | null; organization_name: string | null }>
    organizations?: Array<{ id: string; name: string | null }>
    throwOrgNames?: boolean
  }): OrganizationIdentityClient {
    const from = (table: "organizer_accounts" | "organizations") => {
      const builder = {
        select: () => builder,
        in: () => builder,
        eq: () => builder,
        then: (resolve: (value: unknown) => void, reject: (reason?: unknown) => void) => {
          if (table === "organizer_accounts") {
            if (rows.throwOrgNames) {
              reject(new Error("organizer_accounts unavailable"))
              return
            }
          }
          const data =
            table === "organizer_accounts" ? rows.organizerAccounts ?? [] : rows.organizations ?? []
          resolve({ data, error: null })
        },
      }
      return builder as any
    }
    return { from }
  }

  it("resolves display names from public brand profiles keyed by tenant id", async () => {
    const names = await resolveOrganizationDisplayNames(
      stubClient({
        organizerAccounts: [
          { ops_org_id: ORG_ID_1, organization_name: "Wavefront Live" },
          { ops_org_id: ORG_ID_2, organization_name: "Sunset Collective" },
        ],
      }),
      [ORG_ID_1, ORG_ID_2]
    )

    expect(names.get(ORG_ID_1)).toBe("Wavefront Live")
    expect(names.get(ORG_ID_2)).toBe("Sunset Collective")
  })

  it("falls back to the canonical tenant name when no public brand exists", async () => {
    const names = await resolveOrganizationDisplayNames(
      stubClient({
        organizerAccounts: [{ ops_org_id: ORG_ID_1, organization_name: "Wavefront Live" }],
        organizations: [{ id: ORG_ID_2, name: "Sunset Records" }],
      }),
      [ORG_ID_1, ORG_ID_2]
    )

    expect(names.get(ORG_ID_1)).toBe("Wavefront Live")
    expect(names.get(ORG_ID_2)).toBe("Sunset Records")
  })

  it("prefers the public brand name over the tenant name", async () => {
    const names = await resolveOrganizationDisplayNames(
      stubClient({
        organizerAccounts: [
          { ops_org_id: ORG_ID_1, organization_name: "Brand Name" },
          { ops_org_id: ORG_ID_2, organization_name: "Brand Two" },
        ],
        organizations: [
          { id: ORG_ID_1, name: "Tenant Name" },
          { id: ORG_ID_2, name: "Tenant Two" },
        ],
      }),
      [ORG_ID_1, ORG_ID_2]
    )

    expect(names.get(ORG_ID_1)).toBe("Brand Name")
    expect(names.get(ORG_ID_2)).toBe("Brand Two")
  })

  it("deduplicates ids and ignores blank entries", async () => {
    const names = await resolveOrganizationDisplayNames(
      stubClient({
        organizerAccounts: [{ ops_org_id: ORG_ID_1, organization_name: "Wavefront Live" }],
      }),
      [ORG_ID_1, ORG_ID_1, "  ", ORG_ID_1]
    )

    expect(names.size).toBe(1)
    expect(names.get(ORG_ID_1)).toBe("Wavefront Live")
  })

  it("returns an empty map for empty input", async () => {
    await expect(
      resolveOrganizationDisplayNames(stubClient({}), [])
    ).resolves.toEqual(new Map())
    await expect(
      resolveOrganizationDisplayNames(stubClient({}), ["  "])
    ).resolves.toEqual(new Map())
  })

  it("degrades to an empty map instead of throwing when brand lookup fails", async () => {
    const names = await resolveOrganizationDisplayNames(
      stubClient({ throwOrgNames: true }),
      [ORG_ID_1]
    )

    expect(names.size).toBe(0)
  })
})