import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Relational venue identity bridge (ADR-0001 / VEN-001 / VEN-088).
 *
 * Server-only resolution between the canonical Venue account (venue_profiles.id)
 * and its operational mirrors (venues_v2.id, organizations.id). Replaces the
 * settings-JSON identity mapping with FK-enforced 1:1:1 rows.
 *
 * Migration window behavior: callers may still dual-write the settings JSON cache;
 * reads prefer this table and fall back to JSON only when no bridge row exists.
 */

export type VenueIdentityProvenance = "backfill" | "runtime" | "manual"

export interface VenueIdentityBridge {
  venueProfileId: string
  venuesV2Id: string | null
  operationalOrgId: string | null
}

export async function fetchVenueIdentityBridge(
  client: SupabaseClient,
  venueProfileId: string,
): Promise<VenueIdentityBridge | null> {
  if (!venueProfileId) return null

  const { data, error } = await client
    .from("venue_identity_bridges")
    .select("venue_profile_id, venues_v2_id, operational_org_id")
    .eq("venue_profile_id", venueProfileId)
    .maybeSingle()

  if (error || !data?.venue_profile_id) return null

  return {
    venueProfileId: data.venue_profile_id,
    venuesV2Id: data.venues_v2_id ?? null,
    operationalOrgId: data.operational_org_id ?? null,
  }
}

export async function upsertVenueIdentityBridge(
  client: SupabaseClient,
  bridge: VenueIdentityBridge,
  provenance: VenueIdentityProvenance,
): Promise<boolean> {
  const { error } = await client
    .from("venue_identity_bridges")
    .upsert(
      {
        venue_profile_id: bridge.venueProfileId,
        ...(bridge.venuesV2Id ? { venues_v2_id: bridge.venuesV2Id } : {}),
        ...(bridge.operationalOrgId ? { operational_org_id: bridge.operationalOrgId } : {}),
        provenance,
      },
      { onConflict: "venue_profile_id" },
    )

  return !error
}
