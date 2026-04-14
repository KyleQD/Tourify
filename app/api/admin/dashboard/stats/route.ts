import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (_request, { supabase }) => {
  try {
    const [
      toursResult,
      eventsV2Result,
      legacyEventsResult,
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
      supabase.from('tours').select('id, status, revenue'),
      supabase.from('events_v2').select('id, status, start_at, capacity'),
      supabase.from('events').select('id, status, start_date, capacity'),
      supabase.from('staff_members').select('id'),
      supabase.from('logistics_tasks').select('id, status, type'),
      supabase.from('ticket_sales').select('id, quantity, total_amount'),
      supabase.from('venue_booking_requests').select('id, status'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_type', 'artist'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_type', 'venue'),
      supabase.from('financial_transactions').select('amount, type').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from('travel_groups').select('id, status, coordination_status, total_members, confirmed_members'),
      supabase.from('lodging_bookings').select('id, status, total_amount'),
      supabase.from('rental_agreements').select('id, status, total_amount'),
    ])

    const tours = toursResult.status === 'fulfilled' ? (toursResult.value.data || []) : []
    const eventsV2 = eventsV2Result.status === 'fulfilled' ? (eventsV2Result.value.data || []) : []
    const legacyEvents = legacyEventsResult.status === 'fulfilled' ? (legacyEventsResult.value.data || []) : []
    const events = [
      ...eventsV2,
      ...legacyEvents.map((event: any) => ({
        ...event,
        start_at: event.start_date || null,
      })),
    ]
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

    const stats = {
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
      coordinationCompletionRate: travelGroups.length > 0 ? Math.round((fullyCoordinated / travelGroups.length) * 100) : (logistics.length > 0 ? Math.round((completedLogistics / logistics.length) * 100) : 0),
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
    }

    return NextResponse.json({ success: true, stats })
  } catch (error) {
    console.error('[Dashboard Stats API] Error:', error)
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
    return NextResponse.json({ success: true, stats: emptyStats })
  }
})
