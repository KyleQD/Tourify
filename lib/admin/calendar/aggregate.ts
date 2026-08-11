import type {
  AdminCalendarContext,
  AdminCalendarFilters,
  AdminCalendarItem,
  AdminCalendarKind,
  AdminCalendarPriority,
  AdminCalendarScopeMode,
  AdminCalendarSourceHealth,
  AdminCalendarSourceId,
  AdminCalendarSummary,
} from './types'
import { ADMIN_CALENDAR_KINDS } from './types'
import {
  combineDateAndTime,
  getCalendarItemColor,
  hrefForKind,
  toIsoOrNull,
} from './helpers'
import type { AdminCapability } from '@/lib/auth/admin-capabilities'
import {
  canAccessCalendarKind,
  canAccessCalendarSource,
} from '@/lib/admin/calendar/source-access'

type AnySupabase = any

export interface AggregateCalendarArgs {
  supabase: AnySupabase
  userId: string
  orgId: string | null
  filters: AdminCalendarFilters
  /** CAL-102 — when set, kinds/sources are gated by capability */
  capabilities?: readonly AdminCapability[] | null
}

export interface AggregateCalendarResult {
  items: AdminCalendarItem[]
  summary: AdminCalendarSummary
  context: AdminCalendarContext | null
  sources: AdminCalendarSourceHealth[]
  isDegraded: boolean
}

function createSourceTracker() {
  const map = new Map<AdminCalendarSourceId, AdminCalendarSourceHealth>()

  function record(args: {
    id: AdminCalendarSourceId
    error?: { code?: string; message?: string } | null
    itemCount?: number
    message?: string | null
  }) {
    const itemCount = args.itemCount ?? 0
    if (args.error) {
      map.set(args.id, {
        id: args.id,
        status: 'degraded',
        itemCount,
        errorCode: args.error.code || 'source_error',
        message: args.error.message || args.message || 'Source query failed',
      })
      return
    }
    map.set(args.id, {
      id: args.id,
      status: itemCount === 0 ? 'empty' : 'ok',
      itemCount,
      errorCode: null,
      message: args.message ?? null,
    })
  }

  function list(): AdminCalendarSourceHealth[] {
    return [...map.values()]
  }

  function isDegraded(): boolean {
    return [...map.values()].some((s) => s.status === 'degraded')
  }

  return { record, list, isDegraded }
}

function shouldInclude(kind: AdminCalendarKind, types?: AdminCalendarKind[]): boolean {
  if (!types || types.length === 0) return true
  return types.includes(kind)
}

function emptySummary(): AdminCalendarSummary {
  return {
    event: 0,
    tour: 0,
    task: 0,
    shift: 0,
    production: 0,
    hiring: 0,
    travel: 0,
  }
}

function pushItem(items: AdminCalendarItem[], item: AdminCalendarItem) {
  items.push(item)
}

function extractJsonDate(source: unknown, keys: string[]): string | null {
  if (!source || typeof source !== 'object') return null
  const record = source as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    const iso = toIsoOrNull(value)
    if (iso) return iso
  }
  return null
}

function resolveScopeMode(filters: AdminCalendarFilters): AdminCalendarScopeMode {
  if (filters.scope === 'tour' || filters.scope === 'event' || filters.scope === 'org')
    return filters.scope
  if (filters.tourId) return 'tour'
  if (filters.eventId) return 'event'
  return 'org'
}

async function resolveTourEventIds(
  supabase: AnySupabase,
  tourId: string,
): Promise<{ eventIds: string[]; error: { code?: string; message?: string } | null }> {
  const { data, error } = await supabase
    .from('tour_events')
    .select('event_id')
    .eq('tour_id', tourId)

  if (error) {
    console.warn('[Admin Calendar] tour_events query error:', error.message)
    return {
      eventIds: [],
      error: { code: error.code, message: error.message },
    }
  }

  return {
    eventIds: (data || [])
      .map((row: { event_id: string | null }) => row.event_id)
      .filter((id: string | null): id is string => Boolean(id)),
    error: null,
  }
}

async function loadTourContext(
  supabase: AnySupabase,
  tourId: string,
  eventIds: string[],
): Promise<AdminCalendarContext> {
  const { data: tour } = await supabase
    .from('tours')
    .select('id, name, status, start_date, end_date')
    .eq('id', tourId)
    .maybeSingle()

  return {
    mode: 'tour',
    id: tourId,
    name: tour?.name || 'Tour',
    status: tour?.status || null,
    startDate: tour?.start_date ? String(tour.start_date).slice(0, 10) : null,
    endDate: tour?.end_date ? String(tour.end_date).slice(0, 10) : null,
    href: hrefForKind('tour', tourId),
    eventIds,
  }
}

async function loadEventContext(
  supabase: AnySupabase,
  eventId: string,
): Promise<AdminCalendarContext> {
  const { data: event } = await supabase
    .from('events_v2')
    .select('id, title, status, start_at, end_at')
    .eq('id', eventId)
    .maybeSingle()

  return {
    mode: 'event',
    id: eventId,
    name: event?.title || 'Event',
    status: event?.status || null,
    startDate: event?.start_at ? String(event.start_at).slice(0, 10) : null,
    endDate: event?.end_at ? String(event.end_at).slice(0, 10) : null,
    href: hrefForKind('event', eventId),
    eventIds: [eventId],
  }
}

async function resolveOrgEventIds(supabase: AnySupabase, orgId: string | null, userId: string): Promise<string[]> {
  let query = supabase.from('events_v2').select('id')
  // CAL-102: signed org scope is exclusive — never OR created_by across orgs
  if (orgId) query = query.eq('org_id', orgId)
  else query = query.eq('created_by', userId)
  const { data } = await query
  return (data || []).map((row: { id: string }) => row.id)
}

function allowKind(
  kind: AdminCalendarKind,
  types: AdminCalendarKind[] | undefined,
  capabilities: readonly AdminCapability[] | null | undefined,
): boolean {
  if (!shouldInclude(kind, types)) return false
  if (!capabilities) return true
  return canAccessCalendarKind(capabilities, kind)
}

function allowSource(
  sourceId: AdminCalendarSourceId,
  capabilities: readonly AdminCapability[] | null | undefined,
): boolean {
  if (!capabilities) return true
  return canAccessCalendarSource(capabilities, sourceId)
}

export async function aggregateAdminCalendarItems(
  args: AggregateCalendarArgs,
): Promise<AggregateCalendarResult> {
  const { supabase, userId, orgId, filters, capabilities } = args
  const { startDate, endDate, types, status, priority, tourId, eventId } = filters
  const scopeMode = resolveScopeMode(filters)
  const items: AdminCalendarItem[] = []
  const sources = createSourceTracker()

  let scopedEventIds: string[] | null = null
  let context: AdminCalendarContext | null = null

  if (scopeMode === 'tour' && tourId) {
    if (allowSource('tour_events', capabilities)) {
      const tourEvents = await resolveTourEventIds(supabase, tourId)
      scopedEventIds = tourEvents.eventIds
      sources.record({
        id: 'tour_events',
        error: tourEvents.error,
        itemCount: tourEvents.eventIds.length,
      })
    } else {
      scopedEventIds = []
    }
    context = await loadTourContext(supabase, tourId, scopedEventIds || [])
  } else if (scopeMode === 'event' && eventId) {
    scopedEventIds = [eventId]
    context = await loadEventContext(supabase, eventId)
  } else {
    context = {
      mode: 'org',
      id: null,
      name: null,
      status: null,
      startDate: null,
      endDate: null,
      href: null,
      eventIds: [],
    }
  }

  const wants = {
    event: allowKind('event', types, capabilities) && scopeMode !== 'event',
    // Parent tour spans are never day-cell items; context chrome replaces them.
    tour: false,
    task: allowKind('task', types, capabilities),
    shift: allowKind('shift', types, capabilities),
    production: allowKind('production', types, capabilities),
    // Hiring is org-overview only (no reliable tour/event FK for MVP).
    hiring: allowKind('hiring', types, capabilities) && scopeMode === 'org',
    travel: allowKind('travel', types, capabilities),
  }

  // 1. Events / shows
  if (
    wants.event
    && allowSource('events_v2', capabilities)
    && !(scopedEventIds && scopedEventIds.length === 0)
  ) {
    try {
      let eventsQuery = supabase
        .from('events_v2')
        .select('id, title, start_at, end_at, status, capacity, created_at, created_by, venue_id, org_id, settings')
        .gte('start_at', startDate)
        .lte('start_at', `${endDate}T23:59:59.999Z`)

      if (scopedEventIds)
        eventsQuery = eventsQuery.in('id', scopedEventIds)
      if (orgId) eventsQuery = eventsQuery.eq('org_id', orgId)
      else eventsQuery = eventsQuery.eq('created_by', userId)
      if (status) eventsQuery = eventsQuery.eq('status', status)

      const { data: events, error } = await eventsQuery
      if (error) {
        console.error('[Admin Calendar] Events query error:', error)
        sources.record({ id: 'events_v2', error, itemCount: 0 })
      } else {
        let eventCount = 0
        for (const event of events || []) {
          const start = toIsoOrNull(event.start_at)
          if (!start) continue
          eventCount += 1
          const end = toIsoOrNull(event.end_at) || start
          const itemPriority: AdminCalendarPriority = 'medium'
          const settings = event.settings && typeof event.settings === 'object'
            ? event.settings as Record<string, unknown>
            : {}
          pushItem(items, {
            id: `event-${event.id}`,
            sourceId: event.id,
            kind: 'event',
            title: event.title || 'Untitled event',
            start,
            end,
            status: event.status || 'scheduled',
            priority: itemPriority,
            href: hrefForKind('event', event.id),
            color: getCalendarItemColor('event', itemPriority),
            allDay: false,
            description: typeof settings.description === 'string' ? settings.description : null,
            location: typeof settings.venue_label === 'string' ? settings.venue_label : null,
            meta: {
              capacity: event.capacity,
              venueId: event.venue_id,
              tourId: tourId || null,
              eventId: event.id,
            },
          })
        }
        sources.record({ id: 'events_v2', itemCount: eventCount })
      }
    } catch (error) {
      console.error('[Admin Calendar] Events fetch error:', error)
      sources.record({
        id: 'events_v2',
        error: { message: error instanceof Error ? error.message : 'events fetch failed' },
      })
    }
  }

  // Resolve event IDs for production / child filters
  let productionEventIds: string[] = []
  if (scopedEventIds) {
    productionEventIds = scopedEventIds
  } else if (wants.production) {
    try {
      productionEventIds = await resolveOrgEventIds(supabase, orgId, userId)
    } catch (error) {
      console.warn('[Admin Calendar] Failed to resolve org event ids', error)
    }
  }

  // 3a. Generic tasks (event-linked)
  if (
    wants.task
    && allowSource('tasks', capabilities)
    && !(scopedEventIds && scopedEventIds.length === 0)
  ) {
    try {
      let tasksQuery = supabase
        .from('tasks')
        .select('id, title, description, status, priority, due_at, created_at, created_by, org_id, event_id')
        .gte('due_at', startDate)
        .lte('due_at', `${endDate}T23:59:59.999Z`)

      if (scopedEventIds)
        tasksQuery = tasksQuery.in('event_id', scopedEventIds)

      if (orgId) tasksQuery = tasksQuery.eq('org_id', orgId)
      else tasksQuery = tasksQuery.eq('created_by', userId)
      if (status) tasksQuery = tasksQuery.eq('status', status)
      if (priority) tasksQuery = tasksQuery.eq('priority', priority)

      const { data: tasks, error } = await tasksQuery
      if (error) {
        console.error('[Admin Calendar] Tasks query error:', error)
        sources.record({ id: 'tasks', error })
      } else {
        let taskCount = 0
        for (const task of tasks || []) {
          const start = toIsoOrNull(task.due_at)
          if (!start) continue
          taskCount += 1
          const itemPriority = (task.priority || 'medium') as AdminCalendarPriority
          pushItem(items, {
            id: `task-${task.id}`,
            sourceId: task.id,
            kind: 'task',
            title: task.title || 'Task',
            start,
            end: start,
            status: task.status || 'todo',
            priority: itemPriority,
            href: task.event_id
              ? `/admin/dashboard/events/${task.event_id}`
              : hrefForKind('task', task.id),
            color: getCalendarItemColor('task', itemPriority),
            allDay: false,
            description: task.description || null,
            meta: {
              source: 'tasks',
              eventId: task.event_id || null,
              tourId: tourId || null,
            },
          })
        }
        sources.record({ id: 'tasks', itemCount: taskCount })
      }
    } catch (error) {
      console.error('[Admin Calendar] Tasks fetch error:', error)
      sources.record({
        id: 'tasks',
        error: { message: error instanceof Error ? error.message : 'tasks skipped' },
      })
    }
  }

  if (wants.task && allowSource('logistics_tasks', capabilities)) {

    // 3b. Logistics tasks
    try {
      let logisticsQuery = supabase
        .from('logistics_tasks')
        .select('id, title, description, status, priority, due_date, assigned_to_user_id, created_at, type, org_id, event_id, tour_id')
        .gte('due_date', startDate)
        .lte('due_date', endDate)

      if (scopeMode === 'tour' && tourId) {
        if (scopedEventIds && scopedEventIds.length > 0)
          logisticsQuery = logisticsQuery.or(`tour_id.eq.${tourId},event_id.in.(${scopedEventIds.join(',')})`)
        else
          logisticsQuery = logisticsQuery.eq('tour_id', tourId)
      } else if (scopeMode === 'event' && eventId) {
        logisticsQuery = logisticsQuery.eq('event_id', eventId)
      }

      if (orgId) logisticsQuery = logisticsQuery.eq('org_id', orgId)
      if (status) logisticsQuery = logisticsQuery.eq('status', status)
      if (priority) logisticsQuery = logisticsQuery.eq('priority', priority)

      const { data: logisticsTasks, error } = await logisticsQuery
      if (error) {
        console.warn('[Admin Calendar] logistics_tasks query error:', error.message)
        sources.record({ id: 'logistics_tasks', error })
      } else {
        let logisticsCount = 0
        for (const task of logisticsTasks || []) {
          const due = task.due_date
          if (!due) continue
          logisticsCount += 1
          const start = toIsoOrNull(due) || combineDateAndTime(String(due).slice(0, 10))
          const itemPriority = (task.priority || 'medium') as AdminCalendarPriority
          pushItem(items, {
            id: `logistics-task-${task.id}`,
            sourceId: task.id,
            kind: 'task',
            title: task.title || 'Logistics task',
            start,
            end: start,
            status: task.status || 'pending',
            priority: itemPriority,
            href: task.event_id
              ? `/admin/dashboard/events/${task.event_id}`
              : tourId || task.tour_id
                ? hrefForKind('tour', tourId || task.tour_id)
                : hrefForKind('task', task.id),
            color: getCalendarItemColor('task', itemPriority),
            allDay: true,
            description: task.description || null,
            meta: {
              source: 'logistics_tasks',
              type: task.type,
              eventId: task.event_id || null,
              tourId: task.tour_id || tourId || null,
            },
          })
        }
        sources.record({ id: 'logistics_tasks', itemCount: logisticsCount })
      }
    } catch (error) {
      console.warn('[Admin Calendar] logistics_tasks missing or error, skipping', error)
      sources.record({
        id: 'logistics_tasks',
        error: { message: error instanceof Error ? error.message : 'logistics_tasks skipped' },
      })
    }
  }

  // 3c. Catering windows stay under Tasks
  if (wants.task && allowSource('catering_services', capabilities)) {
    try {
      const applyCateringScope = (query: any) => {
        let q = query
        if (scopeMode === 'tour' && tourId) {
          if (scopedEventIds && scopedEventIds.length > 0)
            q = q.or(`tour_id.eq.${tourId},event_id.in.(${scopedEventIds.join(',')})`)
          else
            q = q.eq('tour_id', tourId)
        } else if (scopeMode === 'event' && eventId) {
          q = q.eq('event_id', eventId)
        }
        return q
      }

      let cateringQuery = applyCateringScope(
        supabase
          .from('catering_services')
          .select('id, title, window_start, window_end, status, event_id, tour_id, org_id')
          .gte('window_start', startDate)
          .lte('window_start', endDate)
      )
      if (orgId) cateringQuery = cateringQuery.eq('org_id', orgId)
      const { data: cateringRows, error: cateringError } = await cateringQuery
      if (cateringError) {
        sources.record({ id: 'catering_services', error: cateringError })
      } else {
        let cateringCount = 0
        for (const row of cateringRows || []) {
          const start = toIsoOrNull(row.window_start)
          if (!start) continue
          cateringCount += 1
          pushItem(items, {
            id: `logistics-catering-${row.id}`,
            sourceId: row.id,
            kind: 'task',
            title: `Catering: ${row.title}`,
            start,
            end: toIsoOrNull(row.window_end) || start,
            status: row.status || 'requested',
            priority: 'medium',
            href: '/admin/dashboard/logistics?tab=catering',
            color: getCalendarItemColor('task', 'medium'),
            allDay: false,
            meta: {
              source: 'catering_services',
              eventId: row.event_id || null,
              tourId: row.tour_id || tourId || null,
            },
          })
        }
        sources.record({ id: 'catering_services', itemCount: cateringCount })
      }
    } catch (error) {
      console.warn('[Admin Calendar] catering windows skipped', error)
      sources.record({
        id: 'catering_services',
        error: { message: error instanceof Error ? error.message : 'catering skipped' },
      })
    }
  }

  // 3d. Travel arrangements (flights, ground transport, lodging)
  if (wants.travel) {
    try {
      const applyTravelScope = (query: any) => {
        let q = query
        if (scopeMode === 'tour' && tourId) {
          if (scopedEventIds && scopedEventIds.length > 0)
            q = q.or(`tour_id.eq.${tourId},event_id.in.(${scopedEventIds.join(',')})`)
          else
            q = q.eq('tour_id', tourId)
        } else if (scopeMode === 'event' && eventId) {
          q = q.eq('event_id', eventId)
        }
        return q
      }

      let transportRows: any[] | null = null
      let transportError: { code?: string; message?: string } | null = null
      if (allowSource('ground_transportation_coordination', capabilities)) {
        let transportQuery = applyTravelScope(
          supabase
            .from('ground_transportation_coordination')
            .select('id, pickup_location, dropoff_location, pickup_time, estimated_dropoff_time, status, event_id, tour_id, driver_name, org_id')
            .gte('pickup_time', startDate)
            .lte('pickup_time', endDate)
        )
        if (orgId) transportQuery = transportQuery.eq('org_id', orgId)
        const transportResult = await transportQuery
        transportRows = transportResult.data
        transportError = transportResult.error
        if (transportError) {
          sources.record({ id: 'ground_transportation_coordination', error: transportError })
        }
      }
      let transportCount = 0
      for (const row of transportError ? [] : transportRows || []) {
        const start = toIsoOrNull(row.pickup_time)
        if (!start) continue
        transportCount += 1
        const driver = row.driver_name ? ` · ${row.driver_name}` : ''
        pushItem(items, {
          id: `logistics-transport-${row.id}`,
          sourceId: row.id,
          kind: 'travel',
          title: `Transport: ${row.pickup_location} → ${row.dropoff_location}${driver}`,
          start,
          end: toIsoOrNull(row.estimated_dropoff_time) || start,
          status: row.status || 'scheduled',
          priority: 'medium',
          href: '/admin/dashboard/logistics?tab=transportation',
          color: getCalendarItemColor('travel', 'medium'),
          allDay: false,
          meta: {
            source: 'ground_transportation_coordination',
            eventId: row.event_id || null,
            tourId: row.tour_id || tourId || null,
          },
        })
      }
      if (allowSource('ground_transportation_coordination', capabilities) && !transportError)
        sources.record({ id: 'ground_transportation_coordination', itemCount: transportCount })

      let flightRows: any[] | null = null
      let flightError: { code?: string; message?: string } | null = null
      if (allowSource('flight_coordination', capabilities)) {
        let flightQuery = applyTravelScope(
          supabase
            .from('flight_coordination')
            .select(`
            id, airline, flight_number, departure_airport, arrival_airport,
            departure_time, arrival_time, status, event_id, tour_id, org_id,
            flight_passenger_assignments(travel_group_members(member_name))
          `)
            .gte('departure_time', startDate)
            .lte('departure_time', endDate)
        )
        if (orgId) flightQuery = flightQuery.eq('org_id', orgId)
        const flightResult = await flightQuery
        flightRows = flightResult.data
        flightError = flightResult.error
        if (flightError) sources.record({ id: 'flight_coordination', error: flightError })
      }
      let flightCount = 0
      for (const row of flightError ? [] : flightRows || []) {
        const start = toIsoOrNull(row.departure_time)
        if (!start) continue
        flightCount += 1
        const passengers = (row.flight_passenger_assignments || [])
          .map((a: any) => {
            const member = Array.isArray(a.travel_group_members)
              ? a.travel_group_members[0]
              : a.travel_group_members
            return member?.member_name
          })
          .filter(Boolean)
        const passengerLabel = passengers.length ? ` · ${passengers.join(', ')}` : ''
        pushItem(items, {
          id: `logistics-flight-${row.id}`,
          sourceId: row.id,
          kind: 'travel',
          title: `Flight: ${row.airline} ${row.flight_number}${passengerLabel}`,
          start,
          end: toIsoOrNull(row.arrival_time) || start,
          status: row.status || 'scheduled',
          priority: 'high',
          href: '/admin/dashboard/logistics?tab=accommodations',
          color: getCalendarItemColor('travel', 'high'),
          allDay: false,
          description: `${row.departure_airport} → ${row.arrival_airport}`,
          meta: {
            source: 'flight_coordination',
            eventId: row.event_id || null,
            tourId: row.tour_id || tourId || null,
            passengers,
          },
        })
      }
      if (allowSource('flight_coordination', capabilities) && !flightError)
        sources.record({ id: 'flight_coordination', itemCount: flightCount })

      let lodgingRows: any[] | null = null
      let lodgingError: { code?: string; message?: string } | null = null
      if (allowSource('lodging_bookings', capabilities)) {
        let lodgingQuery = applyTravelScope(
          supabase
            .from('lodging_bookings')
            .select('id, primary_guest_name, confirmation_number, check_in_date, check_out_date, status, event_id, tour_id, org_id')
            .gte('check_in_date', startDate.slice(0, 10))
            .lte('check_in_date', endDate.slice(0, 10))
        )
        if (orgId) lodgingQuery = lodgingQuery.eq('org_id', orgId)
        const lodgingResult = await lodgingQuery
        lodgingRows = lodgingResult.data
        lodgingError = lodgingResult.error
        if (lodgingError) sources.record({ id: 'lodging_bookings', error: lodgingError })
      }
      let lodgingCount = 0
      for (const row of lodgingError ? [] : lodgingRows || []) {
        const start = combineDateAndTime(String(row.check_in_date).slice(0, 10))
        if (!start) continue
        lodgingCount += 1
        const conf = row.confirmation_number ? ` · #${row.confirmation_number}` : ''
        pushItem(items, {
          id: `logistics-lodging-${row.id}`,
          sourceId: row.id,
          kind: 'travel',
          title: `Hotel: ${row.primary_guest_name || 'Booking'}${conf}`,
          start,
          end: combineDateAndTime(String(row.check_out_date).slice(0, 10)) || start,
          status: row.status || 'confirmed',
          priority: 'medium',
          href: '/admin/dashboard/logistics?tab=accommodations',
          color: getCalendarItemColor('travel', 'medium'),
          allDay: true,
          meta: {
            source: 'lodging_bookings',
            eventId: row.event_id || null,
            tourId: row.tour_id || tourId || null,
          },
        })
      }
      if (allowSource('lodging_bookings', capabilities) && !lodgingError)
        sources.record({ id: 'lodging_bookings', itemCount: lodgingCount })
    } catch (error) {
      console.warn('[Admin Calendar] travel windows skipped', error)
      for (const id of [
        'ground_transportation_coordination',
        'flight_coordination',
        'lodging_bookings',
      ] as const) {
        if (!sources.list().some((s) => s.id === id)) {
          sources.record({
            id,
            error: { message: error instanceof Error ? error.message : 'travel skipped' },
          })
        }
      }
    }
  }

  // 4. Staff shifts
  if (
    wants.shift
    && allowSource('staff_shifts', capabilities)
    && !(scopedEventIds && scopedEventIds.length === 0)
  ) {
    try {
      let shiftsQuery = supabase
        .from('staff_shifts')
        .select('id, venue_id, event_id, staff_member_id, shift_date, start_time, end_time, role_assignment, status, notes, created_at, org_id')
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)

      if (scopedEventIds)
        shiftsQuery = shiftsQuery.in('event_id', scopedEventIds)
      if (orgId) shiftsQuery = shiftsQuery.eq('org_id', orgId)
      if (status) shiftsQuery = shiftsQuery.eq('status', status)

      const { data: shifts, error } = await shiftsQuery
      if (error) {
        console.warn('[Admin Calendar] staff_shifts query error:', error.message)
        sources.record({ id: 'staff_shifts', error })
      } else {
        let shiftCount = 0
        for (const shift of shifts || []) {
          if (!shift.shift_date) continue
          shiftCount += 1
          const start = combineDateAndTime(String(shift.shift_date).slice(0, 10), shift.start_time)
          const end = combineDateAndTime(String(shift.shift_date).slice(0, 10), shift.end_time || shift.start_time)
          // WORK-103 — attach canonical assignment identity when resolvable.
          let assignmentMeta: Record<string, unknown> = {}
          if (shift.staff_member_id || shift.id) {
            try {
              const { enrichShiftMetaWithAssignment } = await import(
                '@/lib/admin/workforce-assignment.service'
              )
              assignmentMeta = await enrichShiftMetaWithAssignment({
                supabase,
                staffMemberId: shift.staff_member_id,
                staffShiftId: shift.id,
                orgId: orgId || shift.org_id || null,
              })
            } catch {
              assignmentMeta = {}
            }
          }

          pushItem(items, {
            id: `shift-${shift.id}`,
            sourceId: shift.id,
            kind: 'shift',
            title:
              (typeof assignmentMeta.roleTitle === 'string' && assignmentMeta.roleTitle)
              || shift.role_assignment
              || 'Staff shift',
            start,
            end,
            status: shift.status || 'scheduled',
            priority: 'medium',
            href: hrefForKind('shift', shift.id),
            color: getCalendarItemColor('shift', 'medium'),
            allDay: false,
            description: shift.notes || null,
            meta: {
              source: 'staff_shifts',
              eventId: shift.event_id,
              venueId: shift.venue_id,
              staffMemberId: shift.staff_member_id,
              tourId: tourId || null,
              userId: assignmentMeta.userId ?? null,
              employmentAssignmentId: assignmentMeta.employmentAssignmentId ?? null,
              assignmentStatus: assignmentMeta.assignmentStatus ?? null,
              roleTitle: assignmentMeta.roleTitle ?? shift.role_assignment ?? null,
            },
          })
        }
        sources.record({ id: 'staff_shifts', itemCount: shiftCount })
      }
    } catch (error) {
      console.warn('[Admin Calendar] staff_shifts missing or error, skipping', error)
      sources.record({
        id: 'staff_shifts',
        error: { message: error instanceof Error ? error.message : 'staff_shifts skipped' },
      })
    }
  }

  // 5. Event HQ production calendar items
  if (wants.production && allowSource('event_calendar_items', capabilities)) {
    try {
      const eventIds = productionEventIds
      if (eventIds.length > 0) {
        const { data: productionItems, error } = await supabase
          .from('event_calendar_items')
          .select('id, event_id, title, description, start_time, end_time, type, location, color, is_all_day, metadata')
          .in('event_id', eventIds)
          .gte('start_time', startDate)
          .lte('start_time', `${endDate}T23:59:59.999Z`)

        if (error) {
          console.warn('[Admin Calendar] event_calendar_items query error:', error.message)
          sources.record({ id: 'event_calendar_items', error })
        } else {
          let productionCount = 0
          for (const item of productionItems || []) {
            const start = toIsoOrNull(item.start_time)
            if (!start) continue
            productionCount += 1
            const end = toIsoOrNull(item.end_time) || start
            pushItem(items, {
              id: `production-${item.id}`,
              sourceId: item.event_id,
              kind: 'production',
              title: item.title || item.type || 'Production item',
              start,
              end,
              status: item.type || 'custom',
              priority: 'medium',
              href: hrefForKind('production', item.event_id),
              color: item.color || getCalendarItemColor('production', 'medium'),
              allDay: Boolean(item.is_all_day),
              description: item.description || null,
              location: item.location || null,
              meta: {
                source: 'event_calendar_items',
                productionType: item.type,
                calendarItemId: item.id,
                eventId: item.event_id,
                tourId: tourId || null,
              },
            })
          }
          sources.record({ id: 'event_calendar_items', itemCount: productionCount })
        }
      } else {
        sources.record({
          id: 'event_calendar_items',
          itemCount: 0,
          message: 'No scoped events for production calendar items',
        })
      }
    } catch (error) {
      console.warn('[Admin Calendar] event_calendar_items missing or error, skipping', error)
      sources.record({
        id: 'event_calendar_items',
        error: { message: error instanceof Error ? error.message : 'event_calendar_items skipped' },
      })
    }
  }

  // 6. Hiring — interviews / offers from migrated columns + JSON dates (org overview)
  if (wants.hiring && allowSource('job_applications', capabilities)) {
    try {
      // CAL-101: only select columns present in deployed job_applications schema
      let appsQuery = supabase
        .from('job_applications')
        .select('id, applicant_name, status, interview_scheduled, offer_made, offer_details, form_responses, applied_at, employer_entity_id, job_posting_id')
        .limit(200)

      if (orgId) appsQuery = appsQuery.eq('employer_entity_id', orgId)

      const { data: applications, error } = await appsQuery
      if (error) {
        console.warn('[Admin Calendar] job_applications query error:', error.message)
        sources.record({ id: 'job_applications', error })
      } else {
        let hiringCount = 0
        for (const app of applications || []) {
          const interviewDate =
            extractJsonDate(app.offer_details, ['interview_date', 'interviewAt', 'interview_at'])
            || extractJsonDate(app.form_responses, ['interview_date', 'interviewAt'])
          const offerDate =
            extractJsonDate(app.offer_details, ['offer_date', 'offerAt', 'offer_at'])
            || extractJsonDate(app.form_responses, ['offer_date', 'offerAt'])

          if (interviewDate && app.interview_scheduled !== false) {
            const day = interviewDate.slice(0, 10)
            if (day >= startDate && day <= endDate) {
              hiringCount += 1
              pushItem(items, {
                id: `hiring-interview-${app.id}`,
                sourceId: app.id,
                kind: 'hiring',
                title: `Interview: ${app.applicant_name || 'Candidate'}`,
                start: interviewDate,
                end: interviewDate,
                status: app.status || 'pending',
                priority: 'high',
                href: hrefForKind('hiring', app.id),
                color: getCalendarItemColor('hiring', 'high'),
                allDay: false,
                meta: { applicationId: app.id, hiringKind: 'interview' },
              })
            }
          }

          if (offerDate && app.offer_made !== false) {
            const day = offerDate.slice(0, 10)
            if (day >= startDate && day <= endDate) {
              hiringCount += 1
              pushItem(items, {
                id: `hiring-offer-${app.id}`,
                sourceId: app.id,
                kind: 'hiring',
                title: `Offer: ${app.applicant_name || 'Candidate'}`,
                start: offerDate,
                end: offerDate,
                status: app.status || 'pending',
                priority: 'medium',
                href: hrefForKind('hiring', app.id),
                color: getCalendarItemColor('hiring', 'medium'),
                allDay: true,
                meta: { applicationId: app.id, hiringKind: 'offer' },
              })
            }
          }
        }
        sources.record({ id: 'job_applications', itemCount: hiringCount })
      }
    } catch (error) {
      console.warn('[Admin Calendar] hiring applications missing or error, skipping', error)
      sources.record({
        id: 'job_applications',
        error: { message: error instanceof Error ? error.message : 'hiring skipped' },
      })
    }
  }

  if (wants.hiring && allowSource('organization_job_postings', capabilities)) {
    try {
      // CAL-101: postings table has no application_deadline column — mark empty/ok only
      let postingsQuery = supabase
        .from('organization_job_postings')
        .select('id, title, status, organization_id, created_at, updated_at')
        .eq('status', 'published')
        .limit(100)

      if (orgId) postingsQuery = postingsQuery.eq('organization_id', orgId)

      const { data: postings, error } = await postingsQuery
      if (error) {
        console.warn('[Admin Calendar] organization_job_postings query error:', error.message)
        sources.record({ id: 'organization_job_postings', error })
      } else {
        sources.record({
          id: 'organization_job_postings',
          itemCount: 0,
          message: 'Deadline fields not in deployed schema; posting dates omitted',
        })
        void postings
      }
    } catch (error) {
      console.warn('[Admin Calendar] job posting deadlines missing or error, skipping', error)
      sources.record({
        id: 'organization_job_postings',
        error: { message: error instanceof Error ? error.message : 'postings skipped' },
      })
    }
  }

  items.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  const summary = emptySummary()
  for (const item of items) {
    if (ADMIN_CALENDAR_KINDS.includes(item.kind))
      summary[item.kind] += 1
  }

  return {
    items,
    summary,
    context,
    sources: sources.list(),
    isDegraded: sources.isDegraded(),
  }
}

export async function resolveCalendarOrgId(
  supabase: AnySupabase,
  userId: string,
): Promise<string | null> {
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (membership?.org_id) return membership.org_id as string

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_entity_id')
    .eq('user_id', userId)
    .maybeSingle()

  return (profile?.current_entity_id as string | undefined) ?? null
}
