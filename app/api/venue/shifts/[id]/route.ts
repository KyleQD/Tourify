import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

function getShiftId(request: NextRequest) {
  const parts = request.nextUrl.pathname.split("/")
  return parts[parts.length - 1]
}

async function getShiftVenue(service: any, shiftId: string) {
  // Live staff_shifts schema: no deleted_at / adhoc_venue_id columns.
  const { data } = await service
    .from("staff_shifts")
    .select("id, venue_id")
    .eq("id", shiftId)
    .maybeSingle()
  return data || null
}

async function resolveVenueProfileIdForShift(service: any, shift: any) {
  // VEN-110: canonical rows carry venue_profiles.id directly in venue_id.
  if (shift?.venue_id) return shift.venue_id

  // Legacy fallback for pre-migration rows scoped by the operational mirror.
  if (shift?.adhoc_venue_id) {
    const { data } = await service
      .from("venue_identity_bridges")
      .select("venue_profile_id")
      .eq("venues_v2_id", shift.adhoc_venue_id)
      .maybeSingle()
    if (data?.venue_profile_id) return data.venue_profile_id

    // Settings-JSON fallback during the ADR-0001 migration window.
    const { data: legacy } = await service
      .from("venue_profiles")
      .select("id")
      .contains("settings", { venues_v2_id: shift.adhoc_venue_id })
      .maybeSingle()
    if (legacy?.id) return legacy.id
  }

  return null
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const shiftId = getShiftId(request)
  const service = createServiceRoleClient()
  const shift = await getShiftVenue(service, shiftId)
  if (!shift?.id) return NextResponse.json({ success: false, error: "Shift not found" }, { status: 404 })

  const venueProfileId = await resolveVenueProfileIdForShift(service, shift)
  if (!venueProfileId) return NextResponse.json({ success: false, error: "Shift venue could not be resolved" }, { status: 404 })
  const access = await canManageVenue(auth.supabase, auth.user.id, venueProfileId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const body = await request.json()
  const { data, error } = await service
    .from("staff_shifts")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", shiftId)
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const shiftId = getShiftId(request)
  const service = createServiceRoleClient()
  const shift = await getShiftVenue(service, shiftId)
  if (!shift?.id) return NextResponse.json({ success: false, error: "Shift not found" }, { status: 404 })

  const venueProfileId = await resolveVenueProfileIdForShift(service, shift)
  if (!venueProfileId) return NextResponse.json({ success: false, error: "Shift venue could not be resolved" }, { status: 404 })
  const access = await canManageVenue(auth.supabase, auth.user.id, venueProfileId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const { error } = await service
    .from("staff_shifts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", shiftId)
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
