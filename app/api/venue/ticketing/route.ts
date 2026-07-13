import { NextRequest, NextResponse } from "next/server"
import { authenticateApiRequest } from "@/lib/auth/api-auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { canManageVenue, ensureVenueOperationalContext, getCurrentVenueContext } from "@/lib/venue/venue-access"

export const dynamic = "force-dynamic"

async function resolveVenueId(request: NextRequest, auth: { user: any; supabase: any }) {
  const { searchParams } = new URL(request.url)
  const venueId = searchParams.get("venue_id")
  if (venueId) return venueId
  const venue = await getCurrentVenueContext(auth.supabase, auth.user.id)
  return venue?.id || null
}

function mergeById(lists: any[][]) {
  const map = new Map<string, any>()
  for (const list of lists) {
    for (const row of list || []) {
      if (row?.id) map.set(row.id, row)
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.start_at || 0).getTime() - new Date(a.start_at || 0).getTime(),
  )
}

function withAllInPricing(ticketType: any) {
  const metadata = ticketType?.metadata && typeof ticketType.metadata === "object" ? ticketType.metadata : {}
  const basePrice = Number(ticketType.price || 0)
  const serviceFee = Number(metadata.service_fee || metadata.serviceFee || 0)
  const facilityFee = Number(metadata.facility_fee || metadata.facilityFee || 0)
  const taxAmount = Number(metadata.tax_amount || metadata.taxAmount || 0)
  const mandatoryFees = Math.max(0, serviceFee) + Math.max(0, facilityFee) + Math.max(0, taxAmount)

  return {
    ...ticketType,
    base_price: basePrice,
    mandatory_fees: mandatoryFees,
    all_in_price: basePrice + mandatoryFees,
    price_breakdown: {
      base_price: basePrice,
      service_fee: Math.max(0, serviceFee),
      facility_fee: Math.max(0, facilityFee),
      tax_amount: Math.max(0, taxAmount),
      all_in_price: basePrice + mandatoryFees,
    },
  }
}

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })

  const venueId = await resolveVenueId(request, auth)
  if (!venueId) return NextResponse.json({ success: false, error: "venue_id is required" }, { status: 400 })

  const access = await canManageVenue(auth.supabase, auth.user.id, venueId, "manage_ticketing")
  if (!access.allowed) return NextResponse.json({ success: false, error: access.reason || "Forbidden" }, { status: 403 })

  const service = createServiceRoleClient()
  const venue = await getCurrentVenueContext(auth.supabase, auth.user.id, venueId)
  if (!venue) return NextResponse.json({ success: false, error: "No manageable venue found" }, { status: 404 })

  const mappedVenue = await ensureVenueOperationalContext(service as any, venue, auth.user.id)
  const baseSelect = "id, title, start_at, capacity, venue_id, settings, status"
  const eventQueries = []

  if (mappedVenue.venuesV2Id) {
    eventQueries.push(service.from("events_v2").select(baseSelect).eq("venue_id", mappedVenue.venuesV2Id).limit(250))
  }
  if (mappedVenue.operationalOrgId) {
    eventQueries.push(service.from("events_v2").select(baseSelect).eq("org_id", mappedVenue.operationalOrgId).limit(250))
  }
  eventQueries.push(
    service.from("events_v2").select(baseSelect).contains("settings", { venue_profile_id: mappedVenue.id }).limit(250),
  )

  const eventResults = await Promise.all(eventQueries)
  const eventError = eventResults.find((result) => result.error)?.error
  if (eventError) return NextResponse.json({ success: false, error: eventError.message }, { status: 500 })

  const venueEvents = mergeById(eventResults.map((result) => result.data || []))
  const eventIds = venueEvents.map((event: any) => event.id)

  if (eventIds.length === 0) {
    return NextResponse.json({
      success: true,
      summary: {
        events: [],
        ticketsSold: 0,
        grossRevenue: 0,
        checkedIn: 0,
        capacity: 0,
        ticketTypes: 0,
      },
    })
  }

  const [ticketTypesResult, salesResult] = await Promise.all([
    service
      .from("ticket_types")
      .select("id, event_id, name, price, quantity_available, quantity_sold, metadata")
      .in("event_id", eventIds),
    service
      .from("ticket_sales")
      .select("id, event_id, quantity, total_amount, payment_status, checked_in")
      .in("event_id", eventIds),
  ])

  const ticketTypes = ticketTypesResult.error ? [] : (ticketTypesResult.data || []).map(withAllInPricing)
  const sales = salesResult.error ? [] : salesResult.data || []
  const completedSales = sales.filter((sale: any) => sale.payment_status === "completed" || !sale.payment_status)

  const eventsWithTicketing = venueEvents.map((event: any) => {
    const eventTypes = ticketTypes.filter((type: any) => type.event_id === event.id)
    const eventSales = completedSales.filter((sale: any) => sale.event_id === event.id)
    const ticketsSold = eventSales.reduce((sum: number, sale: any) => sum + Number(sale.quantity || 0), 0)

    // Venue hosts get operational counts only — full finance requires view_full_financials.
    return {
      ...event,
      ticket_types: eventTypes,
      tickets_sold: ticketsSold,
      gross_revenue: null,
      checked_in: eventSales.filter((sale: any) => sale.checked_in).length,
      transparent_pricing_required: true,
      finance_hidden: true,
    }
  })

  return NextResponse.json({
    success: true,
    summary: {
      events: eventsWithTicketing,
      ticketsSold: eventsWithTicketing.reduce((sum: number, event: any) => sum + event.tickets_sold, 0),
      grossRevenue: null,
      finance_note:
        "Full financials hidden for venue share-only access. Use settlements when assigned a revenue share.",
      checkedIn: eventsWithTicketing.reduce((sum: number, event: any) => sum + event.checked_in, 0),
      capacity: venueEvents.reduce((sum: number, event: any) => sum + Number(event.capacity || 0), 0),
      ticketTypes: ticketTypes.length,
    },
  })
}
