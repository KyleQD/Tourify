import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { startRouteTiming } from '@/lib/observability/route-timing'
import { requireOpsOrgId, resolveOptionalAdminWorkspaceScope } from '@/lib/admin/workspace-scope'

const emptyStats = {
  totalTours: 0, activeTours: 0, totalEvents: 0, upcomingEvents: 0,
  totalArtists: 0, totalVenues: 0, totalRevenue: 0, monthlyRevenue: 0,
  ticketsSold: 0, totalCapacity: 0, staffMembers: 0,
  completedTasks: 0, pendingTasks: 0, averageRating: 0,
  totalTravelGroups: 0, totalTravelers: 0, confirmedTravelers: 0,
  coordinationCompletionRate: 0, fullyCoordinatedGroups: 0,
  ticketRevenue: 0, approvedVenueBookings: 0, pendingVenueBookings: 0,
  activeTransportation: 0, completedTransportation: 0,
  logisticsCompletionRate: 0, totalLodgingBookings: 0,
  activeLodgingBookings: 0, totalRentalAgreements: 0, activeRentalAgreements: 0,
}

export const GET = withAdminAuth(async (_request, { user, supabase }) => {
  const endTiming = startRouteTiming('/api/admin/dashboard/stats')
  try {
    const scope = await resolveOptionalAdminWorkspaceScope(_request, { user, supabase })
    if (scope instanceof NextResponse) return scope
    const orgId = scope ? requireOpsOrgId(scope) : null
    if (orgId instanceof NextResponse) return orgId

    let orgEventsQuery = supabase
      .from('events_v2')
      .select('id')
      .limit(1000)
    orgEventsQuery = orgId
      ? orgEventsQuery.or(`org_id.eq.${orgId},created_by.eq.${user.id}`)
      : orgEventsQuery.eq('created_by', user.id)
    const { data: orgEvents } = await orgEventsQuery
    const eventIds = (orgEvents || []).map((event: { id: string }) => event.id)

    let eventsV2Query = supabase.from('events_v2').select('id, status, start_at, capacity').limit(500)
    eventsV2Query = orgId
      ? eventsV2Query.or(`org_id.eq.${orgId},created_by.eq.${user.id}`)
      : eventsV2Query.eq('created_by', user.id)

    const staffQuery = eventIds.length > 0
      ? orgId
        ? supabase
            .from('staff_members')
            .select('id')
            .or(`and(entity_type.eq.org,entity_id.eq.${orgId}),and(entity_type.eq.event,entity_id.in.(${eventIds.join(',')}))`)
            .limit(500)
        : supabase
            .from('staff_members')
            .select('id')
            .eq('entity_type', 'event')
            .in('entity_id', eventIds)
            .limit(500)
      : orgId
        ? supabase
            .from('staff_members')
            .select('id')
            .eq('entity_type', 'org')
            .eq('entity_id', orgId)
            .limit(500)
        : Promise.resolve({ data: [] })

    const [
      toursResult,
      eventsV2Result,
      staffResult,
      logisticsResult,
      ticketsResult,
      venueBookingsResult,
      artistsResult,
      venuesResult,
      monthFinanceResult,
      travelGroupsResult,
      lodgingBookingsResult,
      rentalAgreementsResult,
    ] = await Promise.allSettled([
      orgId
        ? supabase.from('tours').select('id, status, revenue').eq('org_id', orgId).limit(500)
        : supabase.from('tours').select('id, status, revenue').or(`user_id.eq.${user.id},created_by.eq.${user.id}`).limit(500),
      eventsV2Query,
      staffQuery,
      orgId ? supabase.from('logistics_tasks').select('id, status, type').eq('org_id', orgId).limit(500) : Promise.resolve({ data: [] }),
      eventIds.length > 0
        ? supabase.from('ticket_sales').select('id, quantity, total_amount').in('event_id', eventIds).limit(1000)
        : Promise.resolve({ data: [] }),
      orgId ? supabase.from('venue_booking_requests').select('id, status').eq('org_id', orgId).limit(200) : Promise.resolve({ data: [] }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_type', 'artist'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_type', 'venue'),
      orgId ? supabase.from('financial_transactions').select('amount, type').eq('org_id', orgId).gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()).limit(1000) : Promise.resolve({ data: [] }),
      orgId ? supabase.from('travel_groups').select('id, status, coordination_status, total_members, confirmed_members').eq('org_id', orgId).limit(200) : Promise.resolve({ data: [] }),
      orgId ? supabase.from('lodging_bookings').select('id, status, total_amount').eq('org_id', orgId).limit(200) : Promise.resolve({ data: [] }),
      orgId ? supabase.from('rental_agreements').select('id, status, total_amount').eq('org_id', orgId).limit(200) : Promise.resolve({ data: [] }),
    ])

    const tours = toursResult.status === 'fulfilled' ? (toursResult.value.data || []) : []
    const eventsV2 = eventsV2Result.status === 'fulfilled' ? (eventsV2Result.value.data || []) : []
    const events = eventsV2
    const staff = staffResult.status === 'fulfilled' ? (staffResult.value.data || []) : []
    const logistics = logisticsResult.status === 'fulfilled' ? (logisticsResult.value.data || []) : []
    const tickets = ticketsResult.status === 'fulfilled' ? (ticketsResult.value.data || []) : []
    const venueBookings = venueBookingsResult.status === 'fulfilled' ? (venueBookingsResult.value.data || []) : []

    const totalArtists = artistsResult.status === 'fulfilled' ? ((artistsResult.value as any).count ?? 0) : 0
    const totalVenues = venuesResult.status === 'fulfilled' ? ((venuesResult.value as any).count ?? 0) : 0
    const monthFinances = monthFinanceResult.status === 'fulfilled' ? ((monthFinanceResult.value as any).data || []) : []
    const monthlyRevenue = monthFinances
      .filter((f: any) => f.type === 'income')
      .reduce((sum: number, f: any) => sum + (Number(f.amount) || 0), 0)

    const now = new Date()
    const activeTours = tours.filter((t: any) => t.status === 'active' || t.status === 'in_progress').length
    const upcomingEvents = events.filter((e: any) => e.start_at && new Date(e.start_at) > now).length
    const totalRevenue = tours.reduce((sum: number, t: any) => sum + (Number(t.revenue) || 0), 0)
    const ticketsSold = tickets.reduce((sum: number, t: any) => sum + (Number(t.quantity) || 0), 0)
    const approvedVenueBookings = venueBookings.filter((booking: any) => booking.status === 'approved').length
    const pendingVenueBookings = venueBookings.filter((booking: any) => booking.status === 'pending').length
    const totalCapacity = events.reduce((sum: number, e: any) => sum + (Number(e.capacity) || 0), 0)

    const completedLogistics = logistics.filter((l: any) => l.status === 'completed' || l.status === 'Completed').length
    const transportLogistics = logistics.filter((l: any) => l.type === 'transportation')
    const activeTransport = transportLogistics.filter((l: any) => l.status === 'in_progress' || l.status === 'In Progress').length
    const completedTransport = transportLogistics.filter((l: any) => l.status === 'completed' || l.status === 'Completed').length

    const travelGroups = travelGroupsResult.status === 'fulfilled' ? (travelGroupsResult.value.data || []) : []
    const lodgingBookings = lodgingBookingsResult.status === 'fulfilled' ? (lodgingBookingsResult.value.data || []) : []
    const rentalAgreements = rentalAgreementsResult.status === 'fulfilled' ? (rentalAgreementsResult.value.data || []) : []

    const totalTravelers = travelGroups.reduce((sum: number, g: any) => sum + (Number(g.total_members) || 0), 0)
    const confirmedTravelers = travelGroups.reduce((sum: number, g: any) => sum + (Number(g.confirmed_members) || 0), 0)
    const fullyCoordinated = travelGroups.filter((g: any) => g.coordination_status === 'complete').length

    const response = NextResponse.json({
      success: true,
      stats: {
        totalTours: tours.length,
        activeTours,
        totalEvents: events.length,
        upcomingEvents,
        totalArtists,
        totalVenues,
        totalRevenue,
        monthlyRevenue,
        ticketsSold: ticketsSold + approvedVenueBookings,
        totalCapacity,
        staffMembers: staff.length,
        completedTasks: completedLogistics,
        pendingTasks: logistics.length - completedLogistics + pendingVenueBookings,
        averageRating: 0,
        totalTravelGroups: travelGroups.length,
        totalTravelers,
        confirmedTravelers,
        coordinationCompletionRate: travelGroups.length > 0
          ? Math.round((fullyCoordinated / travelGroups.length) * 100)
          : logistics.length > 0
            ? Math.round((completedLogistics / logistics.length) * 100)
            : 0,
        fullyCoordinatedGroups: fullyCoordinated,
        ticketRevenue: tickets.reduce((sum: number, t: any) => sum + (Number(t.total_amount) || 0), 0),
        approvedVenueBookings,
        pendingVenueBookings,
        activeTransportation: activeTransport,
        completedTransportation: completedTransport,
        logisticsCompletionRate: logistics.length > 0 ? Math.round((completedLogistics / logistics.length) * 100) : 0,
        totalLodgingBookings: lodgingBookings.length,
        activeLodgingBookings: lodgingBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'checked_in').length,
        totalRentalAgreements: rentalAgreements.length,
        activeRentalAgreements: rentalAgreements.filter((r: any) => r.status === 'active').length,
      },
    })
    endTiming({ userId: user.id, queryCount: 13, metadata: { orgId, organizerAccountId: scope?.organizerAccountId } })
    return response
  } catch (error) {
    endTiming({ userId: user.id, metadata: { error: true } })
    console.error('[Dashboard Stats API] Error:', error)
    return NextResponse.json({ success: true, stats: emptyStats })
  }
})
