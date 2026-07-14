import { describe, expect, it, vi } from "vitest"

import { resolveOrganizerId } from "@/lib/services/hiring-onboarding.service"
import type { HiringActor } from "@/types/hiring-entity"

function createOrganizerSupabaseMock(rows: { byId?: string | null; byUser?: string | null }) {
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn((column: string) => ({
        maybeSingle: vi.fn(async () => {
          if (column === "id") return { data: rows.byId ? { id: rows.byId } : null, error: null }
          if (column === "user_id") return { data: rows.byUser ? { id: rows.byUser } : null, error: null }
          return { data: null, error: null }
        }),
      })),
    })),
  }))

  return { supabase: { from } as never, from }
}

function organizationActor(entityId: string): HiringActor {
  return {
    userId: "user_admin",
    employer: { entityType: "organization", entityId, displayName: "Neon Room" },
  }
}

describe("resolveOrganizerId", () => {
  it("returns null for non-organization employers without querying", async () => {
    const { supabase, from } = createOrganizerSupabaseMock({})

    const actor: HiringActor = {
      userId: "user_admin",
      employer: { entityType: "venue", entityId: "venue_1", displayName: "The Venue" },
    }

    expect(await resolveOrganizerId({ supabase, actor })).toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it("returns null when no organizer account matches (avoids FK violation)", async () => {
    const { supabase } = createOrganizerSupabaseMock({ byId: null, byUser: null })

    const result = await resolveOrganizerId({ supabase, actor: organizationActor("97b9e178-auth-uuid") })

    expect(result).toBeNull()
  })

  it("returns the organizer account id when the employer scope is a real organizer row", async () => {
    const { supabase } = createOrganizerSupabaseMock({ byId: "org_account_1" })

    const result = await resolveOrganizerId({ supabase, actor: organizationActor("org_account_1") })

    expect(result).toBe("org_account_1")
  })

  it("falls back to the organizer account owned by the employer user", async () => {
    const { supabase } = createOrganizerSupabaseMock({ byId: null, byUser: "org_account_2" })

    const result = await resolveOrganizerId({ supabase, actor: organizationActor("auth-user-uuid") })

    expect(result).toBe("org_account_2")
  })
})
