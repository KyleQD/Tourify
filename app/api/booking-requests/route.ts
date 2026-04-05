import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { achievementEngine } from "@/lib/services/achievement-engine.service"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createClient as createServerClient } from "@/lib/supabase/server"

// Validation schemas
const bookingDetailsSchema = z.object({
  performanceType: z.string().min(1, "Performance type is required"),
  description: z.string().min(1, "Description is required"),
  performanceDate: z.string().min(1, "Performance date is required"),
  soundcheckTime: z.string().optional(),
  performanceTime: z.string().optional(),
  duration: z.string().optional(),
  venue: z.string().min(1, "Venue is required"),
  location: z.string().min(1, "Location is required"),
  compensation: z.string().min(1, "Compensation is required"),
  requirements: z.string().optional(),
  additionalNotes: z.string().optional()
})

const createBookingRequestSchema = z.object({
  artistId: z.string().uuid().optional(),
  venueId: z.string().uuid().optional(),
  requesterId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  eventId: z.string().uuid().optional(),
  tourId: z.string().uuid().optional(),
  eventName: z.string().optional(),
  eventType: z.string().optional(),
  eventDate: z.string().optional(),
  eventDuration: z.number().int().positive().optional(),
  expectedAttendance: z.number().int().nonnegative().optional(),
  budgetRange: z.string().optional(),
  bookingDetails: bookingDetailsSchema,
  token: z.string().optional(),
  status: z.enum(["pending", "accepted", "declined"]).default("pending"),
  requestType: z.enum(["performance", "collaboration"]).default("performance")
})

const updateBookingRequestSchema = z.object({
  token: z.string().optional(),
  requestId: z.string().uuid().optional(),
  venueRequestId: z.string().uuid().optional(),
  status: z.enum(["pending", "accepted", "declined"]),
  userId: z.string().uuid().optional(),
  responseMessage: z.string().optional()
})

function parseEventDurationMinutes(durationText?: string) {
  if (!durationText?.trim()) return 120
  const [start, end] = durationText.split("-").map(v => v.trim())
  if (!start || !end) return 120
  const startDate = Date.parse(`1970-01-01T${start}:00Z`)
  const endDate = Date.parse(`1970-01-01T${end}:00Z`)
  if (Number.isNaN(startDate) || Number.isNaN(endDate) || endDate <= startDate) return 120
  return Math.max(30, Math.round((endDate - startDate) / (1000 * 60)))
}

async function getManageableVenueIds(supabase: any, userId: string) {
  const [{ data: ownerRows }, { data: memberRows }] = await Promise.all([
    supabase
      .from("venue_profiles")
      .select("id")
      .or(`user_id.eq.${userId},main_profile_id.eq.${userId}`),
    supabase
      .from("venue_team_members")
      .select("venue_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .contains("permissions", { manage_bookings: true }),
  ])

  const ownerVenueIds = (ownerRows || []).map((row: { id: string }) => row.id)
  const memberVenueIds = (memberRows || []).map((row: { venue_id: string }) => row.venue_id)
  return Array.from(new Set([...ownerVenueIds, ...memberVenueIds].filter(Boolean)))
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateApiRequest(req)
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { supabase, user } = auth
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")
    const eventId = searchParams.get("eventId")
    const tourId = searchParams.get("tourId")
    const artistId = searchParams.get("artistId")
    const venueId = searchParams.get("venueId")

    if (venueId) {
      const { data: venueRequests, error: venueError } = await supabase
        .from("venue_booking_requests")
        .select("*")
        .eq("venue_id", venueId)
        .eq("requester_id", user.id)
        .order("requested_at", { ascending: false })

      if (venueError) throw venueError
      return NextResponse.json({ success: true, data: venueRequests || [] })
    }

    let query = supabase
      .from("booking_requests")
      .select("*")
      .eq("artist_id", user.id)
      .order("created_at", { ascending: false })

    if (token) {
      query = query.eq("token", token)
    }
    if (eventId) {
      query = query.eq("event_id", eventId)
    }
    if (tourId) {
      query = query.eq("tour_id", tourId)
    }
    if (artistId) {
      query = query.eq("artist_id", artistId)
    }

    const { data: bookingRequests, error } = await query

    if (error) throw error

    if (token) {
      // Return single booking request for token lookup
      const booking = bookingRequests[0]
      if (!booking) {
        return NextResponse.json(
          { error: "Booking request not found" },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, data: booking })
    }

    return NextResponse.json({ success: true, data: bookingRequests })
  } catch (error) {
    console.error("Error fetching booking requests:", error)
    return NextResponse.json(
      { error: "Failed to fetch booking requests" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validatedData = createBookingRequestSchema.parse(body)
    const auth = await authenticateApiRequest(req)
    const fallbackSupabase = await createServerClient()
    const supabase = auth?.supabase || fallbackSupabase
    const requesterId = auth?.user?.id || validatedData.requesterId || null
    const requesterEmail = validatedData.email || auth?.user?.email || null
    const hasLegacyTarget = Boolean(validatedData.eventId || validatedData.tourId)

    if (!hasLegacyTarget && !validatedData.venueId && !validatedData.artistId) {
      return NextResponse.json(
        { error: "Booking target missing. Provide artistId, eventId, tourId, or venueId." },
        { status: 400 }
      )
    }

    let bookingRequest: any = null
    if (hasLegacyTarget || validatedData.artistId) {
      const { data, error } = await supabase
        .from("booking_requests")
        .insert({
          artist_id: validatedData.artistId,
          email: validatedData.email,
          phone: validatedData.phone,
          event_id: validatedData.eventId,
          tour_id: validatedData.tourId,
          booking_details: validatedData.bookingDetails,
          token: validatedData.token,
          status: validatedData.status,
          request_type: validatedData.requestType,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      bookingRequest = data
    }

    let venueBookingRequest: any = null
    if (validatedData.venueId) {
      if (!requesterId || !requesterEmail) {
        return NextResponse.json(
          { error: "Authenticated requester and contact email are required for venue bookings" },
          { status: 401 }
        )
      }

      const eventDate = validatedData.eventDate || validatedData.bookingDetails.performanceDate
      const { data, error } = await supabase
        .from("venue_booking_requests")
        .insert({
          venue_id: validatedData.venueId,
          requester_id: requesterId,
          event_name:
            validatedData.eventName ||
            validatedData.bookingDetails.performanceType ||
            "Booking Request",
          event_type: validatedData.eventType || validatedData.requestType,
          event_date: eventDate,
          event_duration:
            validatedData.eventDuration ||
            parseEventDurationMinutes(validatedData.bookingDetails.duration),
          expected_attendance: validatedData.expectedAttendance || null,
          budget_range: validatedData.budgetRange || validatedData.bookingDetails.compensation || null,
          description: validatedData.bookingDetails.description,
          special_requirements:
            validatedData.bookingDetails.requirements ||
            validatedData.bookingDetails.additionalNotes ||
            null,
          contact_email: requesterEmail,
          contact_phone: validatedData.phone || null,
          status: "pending"
        })
        .select()
        .single()

      if (error) {
        if (!bookingRequest) throw error
      } else {
        venueBookingRequest = data
      }
    }

    if (bookingRequest?.artist_id) {
      await achievementEngine.recordMetricEvent({
        supabase: supabase as any,
        userId: bookingRequest.artist_id,
        metricKey: 'booking_requests_total',
        eventType: 'booking_request_created',
        delta: 1,
        eventSource: 'api_booking_requests',
        eventData: { booking_request_id: bookingRequest.id, request_type: bookingRequest.request_type }
      })
    }

    return NextResponse.json({
      success: true,
      data: bookingRequest || venueBookingRequest,
      legacyBookingRequest: bookingRequest,
      venueBookingRequest
    })
  } catch (error) {
    console.error("Error creating booking request:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to create booking request" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateApiRequest(req)
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { supabase, user } = auth
    const body = await req.json()
    const validatedData = updateBookingRequestSchema.parse(body)
    const hasVenueTarget = Boolean(validatedData.venueRequestId || validatedData.requestId)

    if (hasVenueTarget) {
      const targetRequestId = validatedData.venueRequestId || validatedData.requestId
      if (!targetRequestId) {
        return NextResponse.json(
          { error: "Venue booking request id is required" },
          { status: 400 }
        )
      }

      const { data: venueRequest, error: requestError } = await supabase
        .from("venue_booking_requests")
        .select("id, venue_id")
        .eq("id", targetRequestId)
        .maybeSingle()

      if (requestError) throw requestError
      if (!venueRequest?.id) {
        return NextResponse.json(
          { error: "Venue booking request not found" },
          { status: 404 }
        )
      }

      const manageableVenueIds = await getManageableVenueIds(supabase, user.id)
      if (!venueRequest.venue_id || !manageableVenueIds.includes(venueRequest.venue_id)) {
        return NextResponse.json(
          { error: "Forbidden: you do not have venue booking permissions" },
          { status: 403 }
        )
      }

      const venueStatus =
        validatedData.status === "accepted"
          ? "approved"
          : validatedData.status === "declined"
            ? "rejected"
            : "pending"

      const { error: rpcError } = await supabase.rpc("respond_to_booking_request", {
        p_request_id: targetRequestId,
        p_status: venueStatus,
        p_response_message: validatedData.responseMessage || null,
      })
      if (rpcError) {
        return NextResponse.json(
          { error: rpcError.message },
          { status: 500 }
        )
      }

      const { data: venueBookingRequest, error: venueError } = await supabase
        .from("venue_booking_requests")
        .select("*")
        .eq("id", targetRequestId)
        .single()
      if (venueError) throw venueError

      return NextResponse.json({ success: true, data: venueBookingRequest })
    }

    const updateData = {
      status: validatedData.status,
      artist_id: validatedData.userId,
      response_message: validatedData.responseMessage,
      updated_at: new Date().toISOString()
    }

    let query = supabase
      .from("booking_requests")
      .update(updateData)

    if (validatedData.token) {
      query = query.eq("token", validatedData.token)
      query = query.eq("artist_id", user.id)
    } else {
      return NextResponse.json(
        { error: "Token is required for booking request updates" },
        { status: 400 }
      )
    }

    const { data: bookingRequest, error } = await query.select().single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Booking request not found" },
          { status: 404 }
        )
      }
      throw error
    }

    if (bookingRequest.artist_id && validatedData.status === "accepted") {
      await achievementEngine.recordMetricEvent({
        supabase: supabase as any,
        userId: bookingRequest.artist_id,
        metricKey: 'bookings_accepted_total',
        eventType: 'booking_request_accepted',
        delta: 1,
        eventSource: 'api_booking_requests',
        eventData: { booking_request_id: bookingRequest.id }
      })
    }

    // Create notification for admin when booking is accepted/declined
    if (validatedData.status === "accepted" || validatedData.status === "declined") {
      await supabase
        .from("notifications")
        .insert({
          type: "booking_response",
          content: `An artist has ${validatedData.status} your booking request`,
          metadata: {
            bookingRequestId: bookingRequest.id,
            artistId: bookingRequest.artist_id,
            eventId: bookingRequest.event_id,
            tourId: bookingRequest.tour_id,
            status: validatedData.status,
            responseMessage: validatedData.responseMessage
          },
          created_at: new Date().toISOString()
        })
    }

    return NextResponse.json({ success: true, data: bookingRequest })
  } catch (error) {
    console.error("Error updating booking request:", error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Failed to update booking request" },
      { status: 500 }
    )
  }
} 