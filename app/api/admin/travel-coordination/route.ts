import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'

function ok(data: unknown, message?: string) {
  return NextResponse.json({ success: true, data, ...(message ? { message } : {}) })
}

function err(msg: string, status = 500) {
  return NextResponse.json({ success: false, error: msg }, { status })
}

async function requireAuth(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return { denied: err('Unauthorized', 401), auth: null }
  const isAdmin = await checkAdminPermissions(auth.user)
  if (!isAdmin) return { denied: err('Forbidden', 403), auth: null }
  return { denied: null, auth }
}

// =============================================================================
// GET
// =============================================================================

export async function GET(request: NextRequest) {
  const { denied, auth } = await requireAuth(request)
  if (denied || !auth) return denied!

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'groups'
  const limit = Math.min(Number(searchParams.get('limit') || '50'), 200)
  const offset = Number(searchParams.get('offset') || '0')
  const status = searchParams.get('status')
  const groupType = searchParams.get('group_type')
  const eventId = searchParams.get('event_id')
  const tourId = searchParams.get('tour_id')
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  try {
    switch (type) {
      case 'groups':
        return await getGroups(auth.supabase, { limit, offset, status, groupType, eventId, tourId, dateFrom, dateTo })
      case 'group_members':
        return await getGroupMembers(auth.supabase, { limit, offset, status, groupType })
      case 'flights':
        return await getFlights(auth.supabase, { limit, offset, status, eventId, tourId, dateFrom, dateTo })
      case 'flight_passengers':
        return await getFlightPassengers(auth.supabase, { limit, offset, status })
      case 'transportation':
        return await getTransportation(auth.supabase, { limit, offset, status, eventId, tourId, dateFrom, dateTo })
      case 'transportation_passengers':
        return await getTransportationPassengers(auth.supabase, { limit, offset, status })
      case 'hotel_assignments':
        return await getHotelAssignments(auth.supabase, { limit, offset, status })
      case 'timeline':
        return await getTimeline(auth.supabase, { limit, offset, dateFrom, dateTo })
      case 'analytics':
        return await getAnalytics(auth.supabase)
      case 'utilization':
        return await getUtilization(auth.supabase, { limit, offset })
      default:
        return err(`Unknown type: ${type}`, 400)
    }
  } catch (error: any) {
    console.error(`[Travel Coordination] GET (${type}) error:`, error)
    return err(error.message || 'Failed to fetch travel coordination data')
  }
}

// =============================================================================
// POST
// =============================================================================

export async function POST(request: NextRequest) {
  const { denied, auth } = await requireAuth(request)
  if (denied || !auth) return denied!

  try {
    const body = await request.json()
    const { action, ...payload } = body

    switch (action) {
      case 'create_travel_group': {
        const { action: _, ...groupData } = body
        const { data, error } = await auth.supabase
          .from('travel_groups')
          .insert({ ...groupData, created_by: auth.user.id })
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Travel group created successfully')
      }

      case 'create_group_member': {
        const { action: _, ...memberData } = body
        const { data, error } = await auth.supabase
          .from('travel_group_members')
          .insert(memberData)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Group member added successfully')
      }

      case 'bulk_create_group_members': {
        const { group_id, members } = body
        if (!group_id || !Array.isArray(members) || members.length === 0)
          return err('group_id and a non-empty members array are required', 400)

        const rows = members.map((m: Record<string, unknown>) => ({ ...m, group_id }))
        const { data, error } = await auth.supabase
          .from('travel_group_members')
          .insert(rows)
          .select('*')
        if (error) throw error
        return ok(data, `${data.length} group members added successfully`)
      }

      case 'create_flight': {
        const { action: _, ...flightData } = body
        const { data, error } = await auth.supabase
          .from('flight_coordination')
          .insert({ ...flightData, assigned_by: auth.user.id })
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Flight created successfully')
      }

      case 'create_ground_transportation': {
        const { action: _, ...transportData } = body
        const { data, error } = await auth.supabase
          .from('ground_transportation_coordination')
          .insert({ ...transportData, assigned_by: auth.user.id })
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Ground transportation created successfully')
      }

      case 'create_flight_passenger': {
        const { action: _, ...assignmentData } = body
        const { data, error } = await auth.supabase
          .from('flight_passenger_assignments')
          .insert(assignmentData)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Passenger assigned to flight')
      }

      case 'create_transportation_passenger': {
        const { action: _, ...assignmentData } = body
        const { data, error } = await auth.supabase
          .from('transportation_passenger_assignments')
          .insert(assignmentData)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Passenger assigned to transportation')
      }

      case 'create_hotel_assignment': {
        const { action: _, ...assignmentData } = body
        const { data, error } = await auth.supabase
          .from('hotel_room_assignments')
          .insert(assignmentData)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Hotel room assigned successfully')
      }

      case 'create_timeline_entry': {
        const { action: _, ...timelineData } = body
        const { data, error } = await auth.supabase
          .from('travel_coordination_timeline')
          .insert({ ...timelineData, created_by: auth.user.id })
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Timeline entry created successfully')
      }

      case 'auto_coordinate_group': {
        const { group_id } = body
        if (!group_id) return err('group_id is required', 400)

        const { data: group, error: groupError } = await auth.supabase
          .from('travel_groups')
          .select('*')
          .eq('id', group_id)
          .single()
        if (groupError) throw groupError

        const now = new Date()
        const end = new Date(now.getTime() + 60 * 60 * 1000)

        await auth.supabase
          .from('travel_coordination_timeline')
          .insert({
            entry_type: 'meeting',
            title: `Coordinate ${group.name}`,
            description: 'Auto-coordination review task generated from Logistics.',
            start_time: now.toISOString(),
            end_time: end.toISOString(),
            timezone: 'UTC',
            group_id,
            affected_members: group.total_members || 0,
            event_id: group.event_id,
            tour_id: group.tour_id,
            created_by: auth.user.id,
          })

        await auth.supabase
          .from('travel_groups')
          .update({ coordination_status: 'transport_arranged', updated_at: new Date().toISOString() })
          .eq('id', group_id)

        return ok(
          { group_id, status: 'transport_arranged', message: 'Auto-coordination task created' },
          `Auto-coordination task created for group "${group.name}"`
        )
      }

      default:
        return err(`Unknown action: ${action}`, 400)
    }
  } catch (error: any) {
    console.error('[Travel Coordination] POST error:', error)
    return err(error.message || 'Failed to process travel coordination request')
  }
}

// =============================================================================
// PUT
// =============================================================================

export async function PUT(request: NextRequest) {
  const { denied, auth } = await requireAuth(request)
  if (denied || !auth) return denied!

  try {
    const body = await request.json()
    const { action, id, ...updateData } = body

    if (!id) return err('id is required', 400)

    switch (action) {
      case 'update_travel_group': {
        const { data, error } = await auth.supabase
          .from('travel_groups')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Travel group updated successfully')
      }

      case 'update_flight': {
        const { data, error } = await auth.supabase
          .from('flight_coordination')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Flight updated successfully')
      }

      case 'update_ground_transportation': {
        const { data, error } = await auth.supabase
          .from('ground_transportation_coordination')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Ground transportation updated successfully')
      }

      case 'update_hotel_assignment': {
        const { data, error } = await auth.supabase
          .from('hotel_room_assignments')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select('*')
          .single()
        if (error) throw error
        return ok(data, 'Hotel assignment updated successfully')
      }

      default:
        return err(`Unknown action: ${action}`, 400)
    }
  } catch (error: any) {
    console.error('[Travel Coordination] PUT error:', error)
    return err(error.message || 'Failed to update travel coordination data')
  }
}

// =============================================================================
// DELETE
// =============================================================================

export async function DELETE(request: NextRequest) {
  const { denied, auth } = await requireAuth(request)
  if (denied || !auth) return denied!

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  const id = searchParams.get('id')

  if (!id) return err('id is required', 400)

  try {
    switch (action) {
      case 'delete_travel_group': {
        const { error } = await auth.supabase
          .from('travel_groups')
          .delete()
          .eq('id', id)
        if (error) throw error
        return ok(null, 'Travel group deleted successfully')
      }

      default:
        return err(`Unknown action: ${action}`, 400)
    }
  } catch (error: any) {
    console.error('[Travel Coordination] DELETE error:', error)
    return err(error.message || 'Failed to delete travel coordination data')
  }
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

interface Pagination { limit: number; offset: number }
interface GroupFilters extends Pagination { status?: string | null; groupType?: string | null; eventId?: string | null; tourId?: string | null; dateFrom?: string | null; dateTo?: string | null }

async function getGroups(supabase: any, f: GroupFilters) {
  let query = supabase
    .from('travel_groups')
    .select('*')
    .order('arrival_date', { ascending: true })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.status) query = query.eq('status', f.status)
  if (f.groupType) query = query.eq('group_type', f.groupType)
  if (f.eventId) query = query.eq('event_id', f.eventId)
  if (f.tourId) query = query.eq('tour_id', f.tourId)
  if (f.dateFrom) query = query.gte('arrival_date', f.dateFrom)
  if (f.dateTo) query = query.lte('departure_date', f.dateTo)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getGroupMembers(supabase: any, f: Pagination & { status?: string | null; groupType?: string | null }) {
  let query = supabase
    .from('travel_group_members')
    .select(`
      *,
      travel_groups(name, group_type, department),
      staff_profiles:staff_id(first_name, last_name, email),
      venue_crew_members:crew_member_id(name, specialty),
      venue_team_members:team_member_id(name, role)
    `)
    .order('created_at', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.status) query = query.eq('status', f.status)
  if (f.groupType) query = query.eq('travel_groups.group_type', f.groupType)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getFlights(supabase: any, f: GroupFilters) {
  let query = supabase
    .from('flight_coordination')
    .select('*, travel_groups:group_id(name, group_type, department)')
    .order('departure_time', { ascending: true })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.status) query = query.eq('status', f.status)
  if (f.eventId) query = query.eq('event_id', f.eventId)
  if (f.tourId) query = query.eq('tour_id', f.tourId)
  if (f.dateFrom) query = query.gte('departure_time', f.dateFrom)
  if (f.dateTo) query = query.lte('departure_time', f.dateTo)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getFlightPassengers(supabase: any, f: Pagination & { status?: string | null }) {
  let query = supabase
    .from('flight_passenger_assignments')
    .select(`
      *,
      flight_coordination:flight_id(flight_number, airline, departure_airport, arrival_airport),
      travel_group_members:group_member_id(member_name, member_email, member_role)
    `)
    .order('created_at', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.status) query = query.eq('status', f.status)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getTransportation(supabase: any, f: GroupFilters) {
  let query = supabase
    .from('ground_transportation_coordination')
    .select('*, travel_groups:group_id(name, group_type, department), flight_coordination:flight_id(flight_number, airline)')
    .order('pickup_time', { ascending: true })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.status) query = query.eq('status', f.status)
  if (f.eventId) query = query.eq('event_id', f.eventId)
  if (f.tourId) query = query.eq('tour_id', f.tourId)
  if (f.dateFrom) query = query.gte('pickup_time', f.dateFrom)
  if (f.dateTo) query = query.lte('pickup_time', f.dateTo)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getTransportationPassengers(supabase: any, f: Pagination & { status?: string | null }) {
  let query = supabase
    .from('transportation_passenger_assignments')
    .select(`
      *,
      ground_transportation_coordination:transportation_id(transport_type, provider_name, pickup_location, dropoff_location),
      travel_group_members:group_member_id(member_name, member_email, member_role)
    `)
    .order('created_at', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.status) query = query.eq('status', f.status)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getHotelAssignments(supabase: any, f: Pagination & { status?: string | null }) {
  let query = supabase
    .from('hotel_room_assignments')
    .select(`
      *,
      lodging_bookings:lodging_booking_id(booking_number, lodging_providers(name)),
      travel_group_members:group_member_id(member_name, member_email, member_role)
    `)
    .order('created_at', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.status) query = query.eq('status', f.status)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getTimeline(supabase: any, f: Pagination & { dateFrom?: string | null; dateTo?: string | null }) {
  let query = supabase
    .from('travel_coordination_timeline')
    .select('*, travel_groups:group_id(name, group_type)')
    .order('start_time', { ascending: true })
    .range(f.offset, f.offset + f.limit - 1)

  if (f.dateFrom) query = query.gte('start_time', f.dateFrom)
  if (f.dateTo) query = query.lte('start_time', f.dateTo)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getAnalytics(supabase: any) {
  const now = new Date().toISOString()

  const [groupsRes, flightsRes, transportRes, hotelRes] = await Promise.all([
    supabase.from('travel_groups').select('id, status, coordination_status, total_members, confirmed_members'),
    supabase.from('flight_coordination').select('id, status, total_cost, booked_seats'),
    supabase.from('ground_transportation_coordination').select('id, status, total_cost, assigned_passengers'),
    supabase.from('hotel_room_assignments').select('id, check_in_status, status'),
  ])

  if (groupsRes.error) throw groupsRes.error
  if (flightsRes.error) throw flightsRes.error
  if (transportRes.error) throw transportRes.error
  if (hotelRes.error) throw hotelRes.error

  const groups = groupsRes.data || []
  const flights = flightsRes.data || []
  const transport = transportRes.data || []
  const hotel = hotelRes.data || []

  const totalTravelers = groups.reduce((sum: number, g: any) => sum + (g.total_members || 0), 0)
  const confirmedMembers = groups.reduce((sum: number, g: any) => sum + (g.confirmed_members || 0), 0)
  const arrivedGroups = groups.filter((g: any) => g.status === 'arrived').length
  const fullyCoordinated = groups.filter((g: any) => g.coordination_status === 'complete').length
  const completedFlights = flights.filter((f: any) => f.status === 'landed').length
  const completedTransport = transport.filter((t: any) => t.status === 'completed').length
  const checkedIn = hotel.filter((h: any) => h.check_in_status === 'checked_in').length
  const totalFlightCost = flights.reduce((sum: number, f: any) => sum + (f.total_cost || 0), 0)
  const totalTransportCost = transport.reduce((sum: number, t: any) => sum + (t.total_cost || 0), 0)

  const analytics = [{
    date: now.slice(0, 10),
    week: `W${Math.ceil(new Date().getDate() / 7)}`,
    month: now.slice(0, 7),
    total_groups: groups.length,
    total_travelers: totalTravelers,
    arrived_groups: arrivedGroups,
    fully_coordinated_groups: fullyCoordinated,
    total_flights: flights.length,
    total_flight_passengers: flights.reduce((sum: number, f: any) => sum + (f.booked_seats || 0), 0),
    completed_flights: completedFlights,
    total_transport_runs: transport.length,
    total_transport_passengers: transport.reduce((sum: number, t: any) => sum + (t.assigned_passengers || 0), 0),
    completed_transport: completedTransport,
    total_hotel_bookings: hotel.length,
    total_room_assignments: hotel.length,
    checked_in_guests: checkedIn,
    total_flight_cost: totalFlightCost,
    total_transport_cost: totalTransportCost,
    total_hotel_cost: 0,
    total_travel_cost: totalFlightCost + totalTransportCost,
    coordination_completion_rate: groups.length > 0 ? Math.round((fullyCoordinated / groups.length) * 100) : 0,
    arrival_success_rate: totalTravelers > 0 ? Math.round((confirmedMembers / totalTravelers) * 100) : 0,
  }]

  return ok(analytics)
}

async function getUtilization(supabase: any, f: Pagination) {
  const { data: groups, error: groupsError } = await supabase
    .from('travel_groups')
    .select('id, name, group_type, department, priority_level, total_members, confirmed_members, coordination_status, status')
    .order('priority_level', { ascending: false })
    .range(f.offset, f.offset + f.limit - 1)

  if (groupsError) throw groupsError
  if (!groups || groups.length === 0) return ok([])

  const groupIds = groups.map((g: any) => g.id)

  const [flightsRes, transportRes, hotelRes] = await Promise.all([
    supabase.from('flight_coordination').select('id, group_id, total_cost, booked_seats, total_seats'),
    supabase.from('ground_transportation_coordination').select('id, group_id, total_cost, assigned_passengers, vehicle_capacity'),
    supabase.from('hotel_room_assignments').select('id, group_member_id, travel_group_members!inner(group_id)'),
  ])

  const flights = flightsRes.data || []
  const transport = transportRes.data || []
  const hotelRaw = hotelRes.data || []

  const utilization = groups.map((g: any) => {
    const gFlights = flights.filter((f: any) => f.group_id === g.id)
    const gTransport = transport.filter((t: any) => t.group_id === g.id)
    const gHotel = hotelRaw.filter((h: any) => h.travel_group_members?.group_id === g.id)

    const flightSeatsBooked = gFlights.reduce((s: number, f: any) => s + (f.booked_seats || 0), 0)
    const flightSeatsTotal = gFlights.reduce((s: number, f: any) => s + (f.total_seats || 0), 0)
    const transportPassengers = gTransport.reduce((s: number, t: any) => s + (t.assigned_passengers || 0), 0)
    const transportCapacity = gTransport.reduce((s: number, t: any) => s + (t.vehicle_capacity || 0), 0)
    const flightCost = gFlights.reduce((s: number, f: any) => s + (f.total_cost || 0), 0)
    const transportCost = gTransport.reduce((s: number, t: any) => s + (t.total_cost || 0), 0)

    return {
      group_id: g.id,
      group_name: g.name,
      group_type: g.group_type,
      department: g.department,
      priority_level: g.priority_level,
      total_members: g.total_members,
      confirmed_members: g.confirmed_members,
      total_flights: gFlights.length,
      flight_passengers: flightSeatsBooked,
      flight_utilization_percentage: flightSeatsTotal > 0 ? Math.round((flightSeatsBooked / flightSeatsTotal) * 100) : 0,
      total_transport_runs: gTransport.length,
      transport_passengers: transportPassengers,
      transport_utilization_percentage: transportCapacity > 0 ? Math.round((transportPassengers / transportCapacity) * 100) : 0,
      total_hotel_bookings: gHotel.length,
      hotel_guests: gHotel.length,
      hotel_utilization_percentage: g.total_members > 0 ? Math.round((gHotel.length / g.total_members) * 100) : 0,
      coordination_status: g.coordination_status,
      group_status: g.status,
      total_flight_cost: flightCost,
      total_transport_cost: transportCost,
      total_hotel_cost: 0,
      total_group_cost: flightCost + transportCost,
      confirmation_rate: g.total_members > 0 ? Math.round((g.confirmed_members / g.total_members) * 100) : 0,
    }
  })

  return ok(utilization)
}
