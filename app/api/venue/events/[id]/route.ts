import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import {
  canManageVenue,
  ensureVenueOperationalContext,
  getCurrentVenueContext,
} from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

/**
 * VEN-090 — authorized single-event fetch for Venue event detail.
 * Event detail previously loaded a ±365-day collection and matched the id
 * client-side; this endpoint resolves one event across the canonical identity
 * domains (bridge mirror id / operational org / profile-id in settings) with
 * server-side manage_events authorization.
 */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ success: false, error: "Invalid event id" }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const venue = await getCurrentVenueContext(auth.supabase, auth.user.id, searchParams.get("venue_id"))
  if (!venue) return NextResponse.json({ success: false, error: "No manageable venue found" }, { status: 404 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venue.id, "manage_events")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const mappedVenue = await ensureVenueOperationalContext(service as any, venue, auth.user.id)

  const baseSelect =
    "id, org_id, venue_id, title, slug, status, start_at, end_at, timezone, capacity, settings, created_by, created_at, updated_at"

  // Single row must satisfy BOTH the id and at least one venue-scope clause —
  // an `or` of scoped predicates keeps cross-tenant ids unreachable.
  const scopes = [
    mappedVenue.venuesV2Id ? `venue_id.eq.${mappedVenue.venuesV2Id}` : null,
    mappedVenue.operationalOrgId ? `org_id.eq.${mappedVenue.operationalOrgId}` : null,
    `settings->>venue_profile_id.eq.${mappedVenue.id}`,
  ].filter(Boolean)

  const { data, error } = await service
    .from("events_v2")
    .select(baseSelect)
    .eq("id", id)
    .or(scopes.join(","))
    .maybeSingle()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 })

  return NextResponse.json({
    success: true,
    data,
    venue: {
      venueProfileId: mappedVenue.id,
      venuesV2Id: mappedVenue.venuesV2Id,
      operationalOrgId: mappedVenue.operationalOrgId,
    },
  })
}
