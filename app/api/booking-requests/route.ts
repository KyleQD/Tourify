import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { achievementEngine } from "@/lib/services/achievement-engine.service"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createBookingRequestSchema } from "@/lib/public-artist/booking-request-schema"
import { resolveActingContext } from "@/lib/auth/acting-context"
import {
  getInitialArtistBookingStatus,
  getArtistBookingParticipantRole,
  serializeArtistBooking,
  serializeArtistBookings,
  shouldIncludeArtistBookingForView,
} from "@/lib/bookings/artist-booking-server"
import type { ArtistBookingView } from "@/lib/bookings/artist-booking-types"

// Validation schemas
const updateBookingRequestSchema = z.object({
  token: z.string().optional(),
  requestId: z.string().uuid().optional(),
  venueRequestId: z.string().uuid().optional(),
  status: z.enum(["pending", "accepted", "declined", "approved", "rejected"]),
  userId: z.string().uuid().optional(),
  responseMessage: z.string().optional()
})

function toUnifiedBookingStatus(status: string): "pending" | "accepted" | "declined" {
  if (status === "approved" || status === "accepted") return "accepted"
  if (status === "rejected" || status === "declined") return "declined"
  return "pending"
}

function toVenueBookingStatus(status: string): "pending" | "approved" | "rejected" {
  if (status === "accepted" || status === "approved") return "approved"
  if (status === "declined" || status === "rejected") return "rejected"
  return "pending"
}

function parseEventDurationMinutes(durationText?: string) {
  if (!durationText?.trim()) return 120
  const [start, end] = durationText.split("-").map(v => v.trim())
  if (!start || !end) return 120
  const startDate = Date.parse(`1970-01-01T${start}:00Z`)
  const endDate = Date.parse(`1970-01-01T${end}:00Z`)
  if (Number.isNaN(startDate) || Number.isNaN(endDate) || endDate <= startDate) return 120
  return Math.max(30, Math.round((endDate - startDate) / (1000 * 60)))
}

async function validateVenueAvailability(input: {
  venueId: string
  eventDate?: string
  expectedAttendance?: number
}) {
  const service = createServiceRoleClient()
  const { data: venue } = await service
    .from("venue_profiles")
    .select("id, capacity, capacity_total")
    .eq("id", input.venueId)
    .maybeSingle()

  const capacity = Number((venue as any)?.capacity_total || (venue as any)?.capacity || 0)
  if (capacity > 0 && input.expectedAttendance && input.expectedAttendance > capacity) {
    return {
      ok: false,
      error: `Expected attendance exceeds this venue's listed capacity of ${capacity}.`,
    }
  }

  if (input.eventDate) {
    const start = new Date(input.eventDate)
    if (!Number.isNaN(start.getTime())) {
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      const { count } = await service
        .from("venue_booking_requests")
        .select("id", { count: "exact", head: true })
        .eq("venue_id", input.venueId)
        .eq("status", "approved")
        .gte("event_date", start.toISOString())
        .lt("event_date", end.toISOString())

      if ((count || 0) > 0) {
        return {
          ok: false,
          error: "This date already has an approved booking. Choose another date or contact the venue.",
        }
      }
    }
  }

  return { ok: true }
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
    const context = await resolveActingContext(req)
    if (context instanceof NextResponse) return context

    const { supabase, userId } = context
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")
    const eventId = searchParams.get("eventId")
    const tourId = searchParams.get("tourId")
    const artistId = searchParams.get("artistId")
    const venueId = searchParams.get("venueId")
    const requestedView = searchParams.get("view") as ArtistBookingView | null
    const view: ArtistBookingView = requestedView && ["incoming", "sent", "active", "history"].includes(requestedView)
      ? requestedView
      : ["artist", "service"].includes(context.accountType) ? "incoming" : "sent"

    if (venueId) {
      const { data: venueRequests, error: venueError } = await supabase
        .from("venue_booking_requests")
        .select("*")
        .eq("venue_id", venueId)
        .eq("requester_id", userId)
        .order("requested_at", { ascending: false })

      if (venueError) throw venueError
      return NextResponse.json({
        success: true,
        data: (venueRequests || []).map((request: any) => ({
          ...request,
          normalized_status: toUnifiedBookingStatus(request.status),
        })),
      })
    }

    const service = createServiceRoleClient()
    const isLegacyLookup = Boolean(token || eventId || tourId || artistId)
    let query = service
      .from("booking_requests")
      .select("*")
      .order("created_at", { ascending: false })

    if (isLegacyLookup) query = query.eq("artist_id", userId)
    else query = query.or(`artist_id.eq.${userId},requester_id.eq.${userId}`)

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
      const serialized = await serializeArtistBooking(booking, context)
      if (!serialized) return NextResponse.json({ error: "Booking request not found" }, { status: 404 })
      return NextResponse.json({ success: true, data: serialized })
    }

    const scopedRows = isLegacyLookup
      ? (bookingRequests || [])
      : (bookingRequests || []).filter((request: any) => {
          const role = getArtistBookingParticipantRole(request, context)
          if (!role) return false
          return shouldIncludeArtistBookingForView(role, request.status, view)
        })

    return NextResponse.json({
      success: true,
      data: await serializeArtistBookings(scopedRows, context),
      view,
    })
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
    const context = await resolveActingContext(req)
    if (context instanceof NextResponse) return context

    const auth = await authenticateApiRequest(req)
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const supabase = context.supabase
    const service = createServiceRoleClient()
    const requesterId = context.userId
    const requesterEmail = validatedData.email || auth.user.email || null
    const hasLegacyTarget = Boolean(validatedData.eventId || validatedData.tourId)

    if (!hasLegacyTarget && !validatedData.venueId && !validatedData.artistId) {
      return NextResponse.json(
        { error: "Booking target missing. Provide artistId, eventId, tourId, or venueId." },
        { status: 400 }
      )
    }

    const normalizedCreateStatus = toUnifiedBookingStatus(validatedData.status)

    let bookingRequest: any = null
    if (hasLegacyTarget || validatedData.artistId) {
      if (validatedData.artistId && validatedData.artistId === requesterId) {
        return NextResponse.json({ error: "You cannot send a booking request to yourself." }, { status: 400 })
      }

      let artistProfile: { id: string; user_id: string } | null = null
      let recipientAccountType = "artist"
      if (validatedData.artistId) {
        let artistQuery = service
          .from("artist_profiles")
          .select("id, user_id")
          .eq("user_id", validatedData.artistId)
        if (validatedData.artistProfileId) artistQuery = artistQuery.eq("id", validatedData.artistProfileId)
        const { data: artistRows, error: artistError } = await artistQuery.limit(1)
        if (artistError || !artistRows?.[0]) {
          return NextResponse.json({ error: "Artist profile not found." }, { status: 404 })
        }
        artistProfile = artistRows[0]

        const { data: account } = await service
          .from("accounts")
          .select("account_type")
          .eq("profile_id", artistProfile.id)
          .in("account_type", ["artist", "service"])
          .limit(1)
          .maybeSingle()
        if (account?.account_type === "service") recipientAccountType = "service"
      }

      const isPublicProfileRequest = Boolean(validatedData.artistId && !hasLegacyTarget)
      const bookingDetails = isPublicProfileRequest ? {
        performanceType: validatedData.bookingDetails.performanceType,
        performanceDate: validatedData.bookingDetails.performanceDate,
        venue: validatedData.bookingDetails.venue,
        location: validatedData.bookingDetails.location,
        description: "",
        compensation: "",
        additionalNotes: "",
      } : validatedData.bookingDetails

      const { data, error } = await service
        .from("booking_requests")
        .insert({
          artist_id: validatedData.artistId,
          artist_profile_id: artistProfile?.id || null,
          recipient_account_type: artistProfile ? recipientAccountType : null,
          requester_id: requesterId,
          requester_profile_id: context.profileId,
          requester_account_type: context.accountType,
          email: isPublicProfileRequest ? null : validatedData.email,
          phone: isPublicProfileRequest ? null : validatedData.phone,
          event_id: validatedData.eventId,
          tour_id: validatedData.tourId,
          booking_details: bookingDetails,
          token: validatedData.token,
          status: getInitialArtistBookingStatus(normalizedCreateStatus, isPublicProfileRequest),
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
      const eventDate = validatedData.eventDate || validatedData.bookingDetails.performanceDate
      const availability = await validateVenueAvailability({
        venueId: validatedData.venueId,
        eventDate,
        expectedAttendance: validatedData.expectedAttendance,
      })
      if (!availability.ok) {
        return NextResponse.json({ error: availability.error }, { status: 409 })
      }

      if (!requesterId || !requesterEmail) {
        return NextResponse.json(
          { error: "Authenticated requester and contact email are required for venue bookings" },
          { status: 401 }
        )
      }

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
        supabase: service as any,
        userId: bookingRequest.artist_id,
        metricKey: 'booking_requests_total',
        eventType: 'booking_request_created',
        delta: 1,
        eventSource: 'api_booking_requests',
        eventData: { booking_request_id: bookingRequest.id, request_type: bookingRequest.request_type }
      })
    }

    const serializedBooking = bookingRequest
      ? await serializeArtistBooking(bookingRequest, context)
      : null

    return NextResponse.json({
      success: true,
      data: serializedBooking || venueBookingRequest,
      legacyBookingRequest: serializedBooking,
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

      const venueStatus = toVenueBookingStatus(validatedData.status)

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

    const normalizedUpdateStatus = toUnifiedBookingStatus(validatedData.status)
    const service = createServiceRoleClient()
    const updateData = {
      status: normalizedUpdateStatus,
      ...(validatedData.userId ? { artist_id: validatedData.userId } : {}),
      response_message: validatedData.responseMessage,
      accepted_at: normalizedUpdateStatus === "accepted" ? new Date().toISOString() : null,
      declined_at: normalizedUpdateStatus === "declined" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    let query = service
      .from("booking_requests")
      .update(updateData)

    if (validatedData.token) {
      const { data: tokenRequest } = await service
        .from("booking_requests")
        .select("id, artist_id")
        .eq("token", validatedData.token)
        .maybeSingle()
      if (!tokenRequest || (tokenRequest.artist_id && tokenRequest.artist_id !== user.id)) {
        return NextResponse.json({ error: "Booking request not found" }, { status: 404 })
      }
      if (!tokenRequest.artist_id && validatedData.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      query = query.eq("token", validatedData.token)
      query = query.eq("status", "pending")
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

    if (bookingRequest.artist_id && normalizedUpdateStatus === "accepted") {
      await achievementEngine.recordMetricEvent({
        supabase: service as any,
        userId: bookingRequest.artist_id,
        metricKey: 'bookings_accepted_total',
        eventType: 'booking_request_accepted',
        delta: 1,
        eventSource: 'api_booking_requests',
        eventData: { booking_request_id: bookingRequest.id }
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
