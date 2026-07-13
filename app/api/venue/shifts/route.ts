import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, ensureVenueOperationalContext, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  venue_id: z.string().uuid(),
  event_id: z.string().uuid().optional().nullable(),
  staff_member_id: z.string().uuid(),
  shift_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  break_duration: z.number().int().min(0).default(0),
  zone_assignment: z.string().optional().nullable(),
  role_assignment: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const venueId =
    searchParams.get("venue_id") ||
    searchParams.get("venueId") ||
    (await getCurrentVenueContext(auth.supabase, auth.user.id))?.id
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const venue = await getCurrentVenueContext(auth.supabase, auth.user.id, venueId)
  if (!venue) return NextResponse.json({ success: false, error: "No manageable venue found" }, { status: 404 })
  const mappedVenue = await ensureVenueOperationalContext(service as any, venue, auth.user.id)
  let query = service.from("staff_shifts").select("*")
  if (mappedVenue.venuesV2Id) {
    query = query.or(`venue_id.eq.${venueId},adhoc_venue_id.eq.${mappedVenue.venuesV2Id}`)
  } else {
    query = query.eq("venue_id", venueId)
  }

  const eventId = searchParams.get("eventId") || searchParams.get("event_id")
  const staffMemberId = searchParams.get("staff_member_id")
  const status = searchParams.get("status")
  const dateFrom = searchParams.get("date_from")
  const dateTo = searchParams.get("date_to")

  if (eventId) query = query.eq("event_id", eventId)
  if (staffMemberId) query = query.eq("staff_member_id", staffMemberId)
  if (status) query = query.eq("status", status)
  if (dateFrom) query = query.gte("shift_date", dateFrom)
  if (dateTo) query = query.lte("shift_date", dateTo)

  const { data, error } = await query.order("shift_date", { ascending: true }).order("start_time", { ascending: true })
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data: data || [] })
}

export async function POST(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = createSchema.parse(await request.json())
  const access = await canManageVenue(auth.supabase, auth.user.id, body.venue_id, "manage_team")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const venue = await getCurrentVenueContext(auth.supabase, auth.user.id, body.venue_id)
  if (!venue) return NextResponse.json({ success: false, error: "No manageable venue found" }, { status: 404 })
  const mappedVenue = await ensureVenueOperationalContext(service as any, venue, auth.user.id)
  const { data, error } = await service
    .from("staff_shifts")
    .insert({
      ...body,
      venue_id: null,
      adhoc_venue_id: mappedVenue.venuesV2Id || null,
      created_by: auth.user.id,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
