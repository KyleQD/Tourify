import { describe, expect, it, vi } from "vitest"

import { parseSchedulingApiError, shouldLoadLiveSchedulingDetails } from "@/components/admin/scheduling/use-scheduling-data"
import { getLiveSchedulingScopeFlags } from "@/lib/hiring/hiring-dashboard-utils"
import { resolveSchedulingOrgId } from "@/lib/hiring/resolve-scheduling-org-id"
import type { HiringEntity } from "@/types/hiring-entity"

describe("org-scoped shifts without venue", () => {
  const orgEmployer: HiringEntity = {
    entityType: "organization",
    entityId: "11111111-1111-1111-1111-111111111111",
    displayName: "DreamStream",
  }

  it("does not gate live scheduling on venue", () => {
    expect(
      getLiveSchedulingScopeFlags({
        mode: "live",
        employer: orgEmployer,
        venueId: null,
      }),
    ).toEqual({ needsEmployer: false, needsVenue: false })

    expect(
      shouldLoadLiveSchedulingDetails({
        mode: "live",
        employer: orgEmployer,
        venueId: null,
      }),
    ).toBe(true)
  })

  it("parses organization_access_required into a friendly message", () => {
    const parsed = parseSchedulingApiError(
      JSON.stringify({
        error: "No organization membership is available for this account.",
        code: "organization_access_required",
      }),
    )

    expect(parsed.message).toBe("No organization membership is available for this account.")
    expect(parsed.code).toBe("organization_access_required")
    expect(parsed.isActingContextError).toBe(true)
  })

  it("resolves ops org id from organizer_accounts.id", async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: { ops_org_id: "22222222-2222-2222-2222-222222222222" } })

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "organizations") {
          return { select: () => ({ eq: () => ({ maybeSingle }) }) }
        }
        return { select: () => ({ eq: () => ({ maybeSingle }) }) }
      }),
    } as any

    const orgId = await resolveSchedulingOrgId({ supabase, employer: orgEmployer })
    expect(orgId).toBe("22222222-2222-2222-2222-222222222222")
  })
})
