import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]),
  responseMessage: z.string().max(2000).optional().nullable(),
})

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
  const status = searchParams.get("status")
  const limit = Math.min(Number(searchParams.get("limit") || 100), 250)
  const service = createServiceRoleClient()

  let query = service
    .from("venue_booking_requests")
    .select(
      `
        *,
        requester:requester_id (
          id,
          full_name,
          username,
          email,
          avatar_url,
          account_type
        )
      `,
    )
    .eq("venue_id", venueId)
    .order("requested_at", { ascending: false })
    .limit(limit)

  if (status && status !== "all") query = query.eq("status", status)

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    data: data || [],
    pipeline: {
      new: (data || []).filter((request: any) => request.status === "pending"),
      approved: (data || []).filter((request: any) => request.status === "approved"),
      declined: (data || []).filter((request: any) => request.status === "rejected"),
      archived: (data || []).filter((request: any) => request.status === "cancelled"),
    },
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const body = updateSchema.parse(await request.json())
  const service = createServiceRoleClient()
  const { data: existing, error: existingError } = await service
    .from("venue_booking_requests")
    .select("id, venue_id, status")
    .eq("id", body.requestId)
    .maybeSingle()

  if (existingError) return NextResponse.json({ success: false, error: existingError.message }, { status: 500 })
  if (!existing?.id) return NextResponse.json({ success: false, error: "Booking request not found" }, { status: 404 })

  const access = await canManageVenue(auth.supabase, auth.user.id, existing.venue_id, "manage_bookings")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const update = {
    status: body.status,
    response_message: body.responseMessage || null,
    responded_at: body.status === "pending" ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await service
    .from("venue_booking_requests")
    .update(update)
    .eq("id", body.requestId)
    .select("*")
    .single()

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  try {
    await service.from("notifications").insert({
      user_id: data.requester_id,
      type: "venue_booking_response",
      title: "Venue booking response",
      content: `Your booking request for ${data.event_name || "this venue"} is now ${data.status}.`,
      metadata: {
        booking_request_id: data.id,
        venue_id: data.venue_id,
        status: data.status,
      },
    })
  } catch {
    // Notification failure should not block the manager action.
  }

  return NextResponse.json({ success: true, data })
}
