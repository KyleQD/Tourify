import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"
import { listVenueReservations } from "@/lib/venue/availability"

export const dynamic = "force-dynamic"

/**
 * VENUE-005 — venue-scoped reservation surface for the venue calendar.
 *
 * Prior to VENUE-005 the venue calendar read `venue_reservations` with the
 * client-role Supabase client; the RLS boundary was existence-only and the raw
 * table grant leaked to anon/authenticated. This route is the replacement:
 * authenticate, resolve the venue, require `manage_bookings`, then read with a
 * service-role client through the sanitized consuming-status projection only.
 * The route itself is the data boundary — anon and cross-venue callers get
 * 401/403 before any query is issued.
 */
function parseIsoTimestamp(value: string): string | null {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  // Normalize to the canonical ISO 8601 form used by reserved_range literals.
  return parsed.toISOString()
}

async function resolveVenueId(request: NextRequest, auth: { user: any; supabase: any }) {
  const { searchParams } = new URL(request.url)
  const requestedVenueId = searchParams.get("venue_id")
  if (requestedVenueId) return requestedVenueId
  const venue = await getCurrentVenueContext(auth.supabase, auth.user.id)
  return venue?.id || null
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const venueId = await resolveVenueId(request, auth)
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_bookings")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const fromParam = searchParams.get("from")
  const toParam = searchParams.get("to")

  if (Boolean(fromParam) !== Boolean(toParam)) {
    return NextResponse.json(
      { success: false, error: "from and to must be provided together" },
      { status: 400 },
    )
  }

  // Absent window -> unbounded (but still venue-scoped) read. Present window ->
  // both bounds required, both valid ISO 8601, and non-inverted.
  let from: string | undefined
  let to: string | undefined
  if (fromParam && toParam) {
    const parsedFrom = parseIsoTimestamp(fromParam)
    const parsedTo = parseIsoTimestamp(toParam)
    if (!parsedFrom || !parsedTo) {
      return NextResponse.json(
        { success: false, error: "from and to must be valid ISO timestamps" },
        { status: 400 },
      )
    }
    if (parsedFrom > parsedTo) {
      return NextResponse.json(
        { success: false, error: "from must not be after to" },
        { status: 400 },
      )
    }
    from = parsedFrom
    to = parsedTo
  }

  const service = createServiceRoleClient()
  const { data, error } = await listVenueReservations(service, { venueId, from, to })

  if (error) {
    console.error("Failed to load venue reservations:", error)
    return NextResponse.json({ success: false, error: "Failed to load venue reservations" }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}