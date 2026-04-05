import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"
import { resolveEventReference } from "../events/_lib/event-reference"
import { authenticateRequestWithBearerFallback } from "@/lib/auth/mobile-request-auth"

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-04-30.basil",
}) : null

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 503 }
      )
    }

    const authResult = await authenticateRequestWithBearerFallback(req)
    if (!authResult?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    const { supabase: userSupabase, user } = authResult
    const { bookingId, eventId, ticketQuantity, mobileRedirectUri } = await req.json()
    const normalizedTicketQuantity = Number(ticketQuantity || 1)
    if (!bookingId || !eventId || normalizedTicketQuantity <= 0) {
      return NextResponse.json(
        { error: "Invalid booking, event, or ticket quantity" },
        { status: 400 }
      )
    }

    const { data: booking, error: bookingError } = await userSupabase
      .from("bookings")
      .select("id, user_id, event_id, status, ticket_quantity")
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (bookingError) throw bookingError
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found or access denied" },
        { status: 404 }
      )
    }

    if (booking.status === "confirmed") {
      return NextResponse.json(
        { error: "Booking is already confirmed" },
        { status: 409 }
      )
    }

    // Resolve across legacy/canonical event models
    const eventReference = await resolveEventReference(supabase as any, eventId)
    if (!eventReference) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      )
    }

    let eventTitle = "Event Ticket"
    let ticketPrice = 0

    if (eventReference.table === "events_v2") {
      const { data: event, error: eventError } = await supabase
        .from("events_v2")
        .select("title, settings")
        .eq("id", eventReference.id)
        .single()
      if (eventError) throw eventError

      const settings = event?.settings && typeof event.settings === "object"
        ? (event.settings as Record<string, unknown>)
        : {}
      eventTitle = event?.title || eventTitle
      ticketPrice = Number(settings.ticket_price || settings.price || 0)
    } else if (eventReference.table === "artist_events") {
      const { data: event, error: eventError } = await supabase
        .from("artist_events")
        .select("title, name, price, ticket_price")
        .eq("id", eventReference.id)
        .single()
      if (eventError) throw eventError

      eventTitle = event?.title || event?.name || eventTitle
      ticketPrice = Number(event?.price || event?.ticket_price || 0)
    } else {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("title, name, price, ticket_price")
        .eq("id", eventReference.id)
        .single()
      if (eventError) throw eventError

      eventTitle = event?.title || event?.name || eventTitle
      ticketPrice = Number(event?.price || event?.ticket_price || 0)
    }

    if (!Number.isFinite(ticketPrice) || ticketPrice <= 0) {
      return NextResponse.json(
        { error: "This event does not have purchasable tickets configured yet" },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
    const encodedMobileRedirect = typeof mobileRedirectUri === "string"
      ? encodeURIComponent(mobileRedirectUri)
      : null
    const successUrl = encodedMobileRedirect
      ? `${appUrl}/auth/mobile-callback?success=true&booking_id=${bookingId}&mobile_redirect_uri=${encodedMobileRedirect}&session_id={CHECKOUT_SESSION_ID}`
      : `${appUrl}/bookings?success=true&booking_id=${bookingId}&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = encodedMobileRedirect
      ? `${appUrl}/auth/mobile-callback?canceled=true&mobile_redirect_uri=${encodedMobileRedirect}`
      : `${appUrl}/bookings?canceled=true`

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: eventTitle,
              description: `Ticket x${normalizedTicketQuantity}`,
            },
            unit_amount: Math.round(ticketPrice * 100), // Convert to cents
          },
          quantity: normalizedTicketQuantity,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId,
        eventId: eventReference.id,
        eventTable: eventReference.table,
        ticketQuantity: normalizedTicketQuantity.toString(),
        userId: user.id,
      },
      customer_email: user.email || undefined,
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error("Payment error:", error)
    return NextResponse.json(
      { error: "Error creating payment session" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Payment service not configured" },
        { status: 503 }
      )
    }

    const authResult = await authenticateRequestWithBearerFallback(req)
    if (!authResult?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    const { supabase: userSupabase, user } = authResult

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get("session_id")
    const bookingId = searchParams.get("booking_id")

    if (!sessionId || !bookingId) {
      return NextResponse.json(
        { error: "Session ID and booking ID are required" },
        { status: 400 }
      )
    }

    const { data: booking, error: bookingError } = await userSupabase
      .from("bookings")
      .select("id, user_id, status")
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (bookingError) throw bookingError
    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found or access denied" },
        { status: 404 }
      )
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId)
    
    if (session.payment_status === "paid") {
      const sessionBookingId = session.metadata?.bookingId
      const sessionUserId = session.metadata?.userId

      if (sessionBookingId !== bookingId || sessionUserId !== user.id) {
        return NextResponse.json(
          { error: "Session does not match booking ownership" },
          { status: 403 }
        )
      }

      void session.metadata?.eventId
      void session.metadata?.ticketQuantity
      void session.metadata?.eventTable
      
      // Update booking status
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", bookingId)
        .eq("user_id", user.id)

      if (updateError) throw updateError

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false })
  } catch (error) {
    console.error("Payment verification error:", error)
    return NextResponse.json(
      { error: "Error verifying payment" },
      { status: 500 }
    )
  }
} 