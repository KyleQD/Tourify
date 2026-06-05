import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest, checkAdminPermissions } from '@/lib/auth/api-auth'

function ok(data: unknown) {
  return NextResponse.json({ success: true, data })
}

function okMsg(message: string, data?: unknown) {
  return NextResponse.json({ success: true, message, data: data ?? {} })
}

function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

async function requireAuth(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) return { auth: null as never, denied: err('Unauthorized', 401) }
  const isAdmin = await checkAdminPermissions(auth.user)
  if (!isAdmin) return { auth: null as never, denied: err('Forbidden', 403) }
  return { auth, denied: null }
}

function params(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  return {
    type: sp.get('type') || 'providers',
    status: sp.get('status'),
    provider_id: sp.get('provider_id'),
    event_id: sp.get('event_id'),
    tour_id: sp.get('tour_id'),
    date_from: sp.get('date_from'),
    date_to: sp.get('date_to'),
    limit: Math.min(parseInt(sp.get('limit') || '50', 10) || 50, 500),
    offset: parseInt(sp.get('offset') || '0', 10) || 0,
    action: sp.get('action'),
    id: sp.get('id'),
  }
}

async function safeJson(request: NextRequest) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { auth, denied } = await requireAuth(request)
  if (denied) return denied

  const p = params(request)

  try {
    switch (p.type) {
      case 'providers':
        return await getProviders(auth.supabase, p)
      case 'room_types':
        return await getRoomTypes(auth.supabase, p)
      case 'bookings':
        return await getBookings(auth.supabase, p)
      case 'guest_assignments':
        return await getGuestAssignments(auth.supabase, p)
      case 'payments':
        return await getPayments(auth.supabase, p)
      case 'calendar_events':
        return await getCalendarEvents(auth.supabase, p)
      case 'availability':
        return await getAvailability(auth.supabase, p)
      case 'analytics':
        return await getAnalytics(auth.supabase, p)
      case 'utilization':
        return await getUtilization(auth.supabase, p)
      default:
        return err(`Unknown type: ${p.type}`)
    }
  } catch (error: any) {
    console.error(`[Lodging API] GET type=${p.type} error:`, error)
    return err(error.message || 'Internal server error', 500)
  }
}

async function getProviders(supabase: any, p: ReturnType<typeof params>) {
  let query = supabase
    .from('lodging_providers')
    .select('*')
    .order('created_at', { ascending: false })
    .range(p.offset, p.offset + p.limit - 1)

  if (p.status) query = query.eq('status', p.status)
  if (p.provider_id) query = query.eq('id', p.provider_id)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getRoomTypes(supabase: any, p: ReturnType<typeof params>) {
  let query = supabase
    .from('lodging_room_types')
    .select('*, lodging_providers(name, type, city, state)')
    .order('created_at', { ascending: false })
    .range(p.offset, p.offset + p.limit - 1)

  if (p.provider_id) query = query.eq('provider_id', p.provider_id)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getBookings(supabase: any, p: ReturnType<typeof params>) {
  let query = supabase
    .from('lodging_bookings')
    .select('*, lodging_providers(name, type, city, state), lodging_room_types(name, capacity, bed_configuration), events(name), tours(name)')
    .order('check_in_date', { ascending: false })
    .range(p.offset, p.offset + p.limit - 1)

  if (p.status) query = query.eq('status', p.status)
  if (p.provider_id) query = query.eq('provider_id', p.provider_id)
  if (p.event_id) query = query.eq('event_id', p.event_id)
  if (p.tour_id) query = query.eq('tour_id', p.tour_id)
  if (p.date_from) query = query.gte('check_in_date', p.date_from)
  if (p.date_to) query = query.lte('check_out_date', p.date_to)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getGuestAssignments(supabase: any, p: ReturnType<typeof params>) {
  let query = supabase
    .from('lodging_guest_assignments')
    .select('*, lodging_bookings(booking_number, check_in_date, check_out_date), staff_profiles:profiles(first_name, last_name), venue_crew_members(name), venue_team_members(name)')
    .order('created_at', { ascending: false })
    .range(p.offset, p.offset + p.limit - 1)

  if (p.status) query = query.eq('status', p.status)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getPayments(supabase: any, p: ReturnType<typeof params>) {
  let query = supabase
    .from('lodging_payments')
    .select('*, lodging_bookings(booking_number, primary_guest_name), staff_profiles:profiles(first_name, last_name)')
    .order('payment_date', { ascending: false })
    .range(p.offset, p.offset + p.limit - 1)

  if (p.status) query = query.eq('status', p.status)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getCalendarEvents(supabase: any, p: ReturnType<typeof params>) {
  let query = supabase
    .from('lodging_calendar_events')
    .select('*, lodging_bookings(booking_number, primary_guest_name, lodging_providers(name))')
    .order('start_time', { ascending: true })
    .range(p.offset, p.offset + p.limit - 1)

  if (p.date_from) query = query.gte('start_time', p.date_from)
  if (p.date_to) query = query.lte('end_time', p.date_to)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getAvailability(supabase: any, p: ReturnType<typeof params>) {
  let query = supabase
    .from('lodging_availability')
    .select('*, lodging_providers(name, type), lodging_room_types(name, capacity, base_rate)')
    .order('date_from', { ascending: true })
    .range(p.offset, p.offset + p.limit - 1)

  if (p.provider_id) query = query.eq('provider_id', p.provider_id)
  if (p.date_from) query = query.gte('date_from', p.date_from)
  if (p.date_to) query = query.lte('date_to', p.date_to)

  const { data, error } = await query
  if (error) throw error
  return ok(data || [])
}

async function getAnalytics(supabase: any, _p: ReturnType<typeof params>) {
  const { data: bookings, error: bErr } = await supabase
    .from('lodging_bookings')
    .select('id, status, payment_status, total_amount, paid_amount, total_nights, total_guests, provider_id, event_id, tour_id, check_in_date')

  if (bErr) throw bErr

  const { data: providers, error: pErr } = await supabase
    .from('lodging_providers')
    .select('id, status, rating')

  if (pErr) throw pErr

  const rows = bookings || []
  const providerRows = providers || []

  const totalBookings = rows.length
  const uniqueProviders = new Set(rows.map((r: any) => r.provider_id).filter(Boolean)).size
  const uniqueEvents = new Set(rows.map((r: any) => r.event_id).filter(Boolean)).size
  const uniqueTours = new Set(rows.map((r: any) => r.tour_id).filter(Boolean)).size
  const totalRevenue = rows.reduce((s: number, r: any) => s + (r.total_amount || 0), 0)
  const totalPaid = rows.reduce((s: number, r: any) => s + (r.paid_amount || 0), 0)
  const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0
  const totalNights = rows.reduce((s: number, r: any) => s + (r.total_nights || 0), 0)
  const totalGuests = rows.reduce((s: number, r: any) => s + (r.total_guests || 0), 0)
  const avgGuestsPerBooking = totalBookings > 0 ? totalGuests / totalBookings : 0
  const confirmedBookings = rows.filter((r: any) => r.status === 'confirmed').length
  const activeBookings = rows.filter((r: any) => ['confirmed', 'checked_in'].includes(r.status)).length
  const cancelledBookings = rows.filter((r: any) => r.status === 'cancelled').length
  const paidBookings = rows.filter((r: any) => r.payment_status === 'paid').length
  const overdueBookings = rows.filter((r: any) => r.payment_status === 'overdue').length
  const activeProviders = providerRows.filter((p: any) => p.status === 'active').length
  const ratedProviders = providerRows.filter((p: any) => typeof p.rating === 'number' && p.rating > 0)
  const avgProviderRating = ratedProviders.length > 0
    ? ratedProviders.reduce((s: number, p: any) => s + p.rating, 0) / ratedProviders.length
    : 0

  const now = new Date()
  const analytics = [{
    month: now.toLocaleString('default', { month: 'long' }),
    quarter: `Q${Math.ceil((now.getMonth() + 1) / 3)}`,
    year: now.getFullYear().toString(),
    total_bookings: totalBookings,
    unique_providers: uniqueProviders,
    unique_events: uniqueEvents,
    unique_tours: uniqueTours,
    total_revenue: Math.round(totalRevenue * 100) / 100,
    total_paid: Math.round(totalPaid * 100) / 100,
    avg_booking_value: Math.round(avgBookingValue * 100) / 100,
    total_nights: totalNights,
    total_guests: totalGuests,
    avg_guests_per_booking: Math.round(avgGuestsPerBooking * 100) / 100,
    confirmed_bookings: confirmedBookings,
    active_bookings: activeBookings,
    cancelled_bookings: cancelledBookings,
    paid_bookings: paidBookings,
    overdue_bookings: overdueBookings,
    active_providers: activeProviders,
    avg_provider_rating: Math.round(avgProviderRating * 100) / 100,
  }]

  return ok(analytics)
}

async function getUtilization(supabase: any, _p: ReturnType<typeof params>) {
  const { data: avail, error: aErr } = await supabase
    .from('lodging_availability')
    .select('provider_id, room_type_id, rooms_available, rooms_reserved, rooms_blocked, date_from, date_to')

  if (aErr) throw aErr

  const { data: roomTypes, error: rtErr } = await supabase
    .from('lodging_room_types')
    .select('id, provider_id, name, capacity, base_rate, lodging_providers(id, name, type, city, state)')

  if (rtErr) throw rtErr

  const { data: bookings, error: bErr } = await supabase
    .from('lodging_bookings')
    .select('provider_id, room_type_id, total_amount, total_guests')

  if (bErr) throw bErr

  const rtMap = new Map<string, any>()
  for (const rt of (roomTypes || [])) {
    rtMap.set(rt.id, rt)
  }

  const utilByKey = new Map<string, any>()

  for (const a of (avail || [])) {
    const key = `${a.provider_id}::${a.room_type_id}`
    const daySpan = Math.max(1, Math.ceil(
      (new Date(a.date_to).getTime() - new Date(a.date_from).getTime()) / 86_400_000
    ))
    if (!utilByKey.has(key)) {
      const rt = rtMap.get(a.room_type_id)
      const provider = rt?.lodging_providers
      utilByKey.set(key, {
        provider_id: a.provider_id,
        provider_name: provider?.name || '',
        provider_type: provider?.type || '',
        city: provider?.city || '',
        state: provider?.state || '',
        room_type_id: a.room_type_id,
        room_type_name: rt?.name || '',
        capacity: rt?.capacity || 0,
        base_rate: rt?.base_rate || 0,
        total_availability_days: 0,
        total_rooms_available: 0,
        total_rooms_reserved: 0,
        total_rooms_blocked: 0,
        utilization_percentage: 0,
        total_bookings: 0,
        total_revenue: 0,
        avg_booking_value: 0,
        total_guests: 0,
        avg_guests_per_booking: 0,
      })
    }
    const u = utilByKey.get(key)!
    u.total_availability_days += daySpan
    u.total_rooms_available += (a.rooms_available || 0)
    u.total_rooms_reserved += (a.rooms_reserved || 0)
    u.total_rooms_blocked += (a.rooms_blocked || 0)
  }

  for (const b of (bookings || [])) {
    const key = `${b.provider_id}::${b.room_type_id}`
    const u = utilByKey.get(key)
    if (!u) continue
    u.total_bookings += 1
    u.total_revenue += (b.total_amount || 0)
    u.total_guests += (b.total_guests || 0)
  }

  const result = Array.from(utilByKey.values()).map(u => {
    const totalSupply = u.total_rooms_available + u.total_rooms_reserved + u.total_rooms_blocked
    u.utilization_percentage = totalSupply > 0
      ? Math.round((u.total_rooms_reserved / totalSupply) * 10000) / 100
      : 0
    u.avg_booking_value = u.total_bookings > 0
      ? Math.round((u.total_revenue / u.total_bookings) * 100) / 100
      : 0
    u.avg_guests_per_booking = u.total_bookings > 0
      ? Math.round((u.total_guests / u.total_bookings) * 100) / 100
      : 0
    u.total_revenue = Math.round(u.total_revenue * 100) / 100
    return u
  })

  return ok(result)
}

// ---------------------------------------------------------------------------
// POST
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const { auth, denied } = await requireAuth(request)
  if (denied) return denied

  const body = await safeJson(request)
  if (!body?.action) return err('Missing action in request body')

  try {
    const { action, ...fields } = body

    switch (action) {
      case 'create_provider':
        return await createRow(auth.supabase, 'lodging_providers', fields, 'Provider created')
      case 'create_room_type':
        return await createRow(auth.supabase, 'lodging_room_types', fields, 'Room type created')
      case 'create_booking':
        return await createRow(auth.supabase, 'lodging_bookings', fields, 'Booking created')
      case 'create_guest_assignment':
        return await createRow(auth.supabase, 'lodging_guest_assignments', fields, 'Guest assignment created')
      case 'create_payment':
        return await createRow(auth.supabase, 'lodging_payments', fields, 'Payment created')
      case 'create_calendar_event':
        return await createRow(auth.supabase, 'lodging_calendar_events', fields, 'Calendar event created')
      case 'create_availability':
        return await createRow(auth.supabase, 'lodging_availability', fields, 'Availability created')
      default:
        return err(`Unknown action: ${action}`)
    }
  } catch (error: any) {
    console.error('[Lodging API] POST error:', error)
    return err(error.message || 'Failed to create record', 500)
  }
}

async function createRow(supabase: any, table: string, fields: Record<string, unknown>, message: string) {
  delete fields.id
  const { data, error } = await supabase
    .from(table)
    .insert(fields)
    .select('*')
    .single()

  if (error) throw error
  return okMsg(message, data)
}

// ---------------------------------------------------------------------------
// PUT
// ---------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  const { auth, denied } = await requireAuth(request)
  if (denied) return denied

  const body = await safeJson(request)
  if (!body?.action) return err('Missing action in request body')
  if (!body?.id) return err('Missing id in request body')

  try {
    const { action, id, ...fields } = body

    switch (action) {
      case 'update_provider':
        return await updateRow(auth.supabase, 'lodging_providers', id, fields, 'Provider updated')
      case 'update_room_type':
        return await updateRow(auth.supabase, 'lodging_room_types', id, fields, 'Room type updated')
      case 'update_booking':
        return await updateRow(auth.supabase, 'lodging_bookings', id, fields, 'Booking updated')
      case 'update_guest_assignment':
        return await updateRow(auth.supabase, 'lodging_guest_assignments', id, fields, 'Guest assignment updated')
      case 'update_payment':
        return await updateRow(auth.supabase, 'lodging_payments', id, fields, 'Payment updated')
      case 'update_calendar_event':
        return await updateRow(auth.supabase, 'lodging_calendar_events', id, fields, 'Calendar event updated')
      case 'update_availability':
        return await updateRow(auth.supabase, 'lodging_availability', id, fields, 'Availability updated')
      default:
        return err(`Unknown action: ${action}`)
    }
  } catch (error: any) {
    console.error('[Lodging API] PUT error:', error)
    return err(error.message || 'Failed to update record', 500)
  }
}

async function updateRow(supabase: any, table: string, id: string, fields: Record<string, unknown>, message: string) {
  fields.updated_at = new Date().toISOString()
  const { data, error } = await supabase
    .from(table)
    .update(fields)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return okMsg(message, data)
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const { auth, denied } = await requireAuth(request)
  if (denied) return denied

  const p = params(request)
  if (!p.action) return err('Missing action query param')
  if (!p.id) return err('Missing id query param')

  try {
    const tableMap: Record<string, string> = {
      delete_provider: 'lodging_providers',
      delete_room_type: 'lodging_room_types',
      delete_booking: 'lodging_bookings',
      delete_guest_assignment: 'lodging_guest_assignments',
      delete_payment: 'lodging_payments',
      delete_calendar_event: 'lodging_calendar_events',
      delete_availability: 'lodging_availability',
    }

    const table = tableMap[p.action]
    if (!table) return err(`Unknown action: ${p.action}`)

    const { error } = await auth.supabase
      .from(table)
      .delete()
      .eq('id', p.id)

    if (error) throw error

    const label = p.action.replace('delete_', '').replace(/_/g, ' ')
    return okMsg(`${label.charAt(0).toUpperCase() + label.slice(1)} deleted`)
  } catch (error: any) {
    console.error('[Lodging API] DELETE error:', error)
    return err(error.message || 'Failed to delete record', 500)
  }
}
