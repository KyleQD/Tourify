import "server-only"

import type { ActingAdminContext } from "@/lib/auth/admin-context"

/**
 * ADM-M-007 / Phase 6 — org-scoped artist roster access helpers.
 *
 * The admin artists API previously queried artist_profiles globally: any admin
 * could read/edit/delete any artist platform-wide, and POST upsert-clobbered
 * existing profiles by email. Scoping derives from the canonical roster chain
 * organization_artist_members → organizer_accounts(ops_org_id) so an acting
 * admin only ever touches artists linked to their verified organization.
 */

export interface RosterScope {
  orgId: string
  /** organizer_account ids whose ops_org_id resolves to the acting org */
  organizerAccountIds: string[]
  /** artist_profile ids linked to those organizer accounts (active links) */
  artistProfileIds: string[]
}

export async function resolveOrgArtistRosterScope(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  admin: Pick<ActingAdminContext, "orgId">,
): Promise<RosterScope> {
  const { data: accounts } = await supabase
    .from("organizer_accounts")
    .select("id")
    .eq("ops_org_id", admin.orgId)

  const organizerAccountIds = (accounts ?? []).map((row: { id: string }) => row.id)

  if (organizerAccountIds.length === 0) {
    return { orgId: admin.orgId, organizerAccountIds: [], artistProfileIds: [] }
  }

  const { data: links } = await supabase
    .from("organization_artist_members")
    .select("id, artist_profile_id")
    .in("organizer_account_id", organizerAccountIds)
    .neq("status", "removed")

  return {
    orgId: admin.orgId,
    organizerAccountIds,
    artistProfileIds: (links ?? []).map((row: { artist_profile_id: string }) => row.artist_profile_id),
  }
}
