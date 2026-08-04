import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, getCurrentVenueContext } from "@/lib/venue/venue-access"
import {
  isVenueBookingLifecycleEnabled,
  mapLifecycleToLegacyBookingStatus,
  resolveVenueBookingLifecycleStatus,
  VENUE_BOOKING_LIFECYCLE_STATUSES,
} from "@/lib/venue/booking-lifecycle"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]).optional(),
  lifecycleStatus: z.enum(VENUE_BOOKING_LIFECYCLE_STATUSES).optional(),
  expectedRevision: z.number().int().positive().optional(),
  clientRequestId: z.string().uuid().optional(),
  responseMessage: z.string().max(2000).optional().nullable(),
}).refine((value) => Boolean(value.status || value.lifecycleStatus), {
  message: "status or lifecycleStatus is required",
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
  const lifecycleAvailable = isVenueBookingLifecycleEnabled()
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

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const requests = (data || []).map((booking: any) => ({
    ...booking,
    resolved_lifecycle_status: resolveVenueBookingLifecycleStatus(booking),
    lifecycle_revision: booking.lifecycle_revision || 1,
  }))
  const filteredRequests =
    status && status !== "all"
      ? requests.filter((booking: any) =>
          lifecycleAvailable
            ? booking.resolved_lifecycle_status === status
            : booking.status === status,
        )
      : requests

  return NextResponse.json({
    success: true,
    data: filteredRequests,
    lifecycle: {
      available: lifecycleAvailable,
      statuses: VENUE_BOOKING_LIFECYCLE_STATUSES,
    },
    pipeline: {
      new: requests.filter((booking: any) => booking.resolved_lifecycle_status === "inquiry"),
      hold: requests.filter((booking: any) => booking.resolved_lifecycle_status === "hold"),
      offer: requests.filter((booking: any) => booking.resolved_lifecycle_status === "offer"),
      contract: requests.filter((booking: any) => booking.resolved_lifecycle_status === "contract"),
      approved: requests.filter((booking: any) => booking.resolved_lifecycle_status === "confirmed"),
      archived: requests.filter((booking: any) => booking.resolved_lifecycle_status === "cancelled"),
    },
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const parsed = updateSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid booking update", details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const body = parsed.data
  const lifecycleAvailable = isVenueBookingLifecycleEnabled()
  if (body.lifecycleStatus && !lifecycleAvailable) {
    return NextResponse.json(
      {
        success: false,
        code: "FEATURE_UNAVAILABLE",
        error: "Booking lifecycle is unavailable until its database checks pass.",
      },
      { status: 503 },
    )
  }
  const service = createServiceRoleClient()
  const { data: existing, error: existingError } = await service
    .from("venue_booking_requests")
    .select(lifecycleAvailable ? "id, venue_id, status, lifecycle_status, lifecycle_revision" : "id, venue_id, status")
    .eq("id", body.requestId)
    .maybeSingle()

  if (existingError) return NextResponse.json({ success: false, error: existingError.message }, { status: 500 })
  if (!existing?.id) return NextResponse.json({ success: false, error: "Booking request not found" }, { status: 404 })

  const access = await canManageVenue(auth.supabase, auth.user.id, existing.venue_id, "manage_bookings")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  if (body.lifecycleStatus) {
    if (!body.expectedRevision || !body.clientRequestId) {
      return NextResponse.json(
        {
          success: false,
          error: "expectedRevision and clientRequestId are required for lifecycle changes",
        },
        { status: 400 },
      )
    }

    const { data, error } = await service.rpc("transition_venue_booking_lifecycle", {
      p_booking_request_id: body.requestId,
      p_expected_revision: body.expectedRevision,
      p_lifecycle_status: body.lifecycleStatus,
      p_actor_user_id: auth.user.id,
      p_client_request_id: body.clientRequestId,
      p_note: body.responseMessage || null,
    })
    if (error) {
      const conflict = error.code === "40001" || error.code === "23505"
      return NextResponse.json(
        {
          success: false,
          code: conflict ? "CONFLICT" : "INVALID_TRANSITION",
          error: conflict
            ? "This booking changed in another session. Refresh before retrying."
            : error.message,
        },
        { status: conflict ? 409 : 400 },
      )
    }

    return NextResponse.json({
      success: true,
      data,
      compatibilityStatus: mapLifecycleToLegacyBookingStatus(body.lifecycleStatus),
    })
  }

  if (!body.status) {
    return NextResponse.json({ success: false, error: "status is required" }, { status: 400 })
  }

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
