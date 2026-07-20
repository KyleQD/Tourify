import type {
  AdminCalendarContext,
  AdminCalendarFilters,
  AdminCalendarItem,
  AdminCalendarKind,
  AdminCalendarPriority,
  AdminCalendarScopeMode,
  AdminCalendarSummary,
} from './types'
import { ADMIN_CALENDAR_KINDS } from './types'
import {
  combineDateAndTime,
  getCalendarItemColor,
  hrefForKind,
  toIsoOrNull,
} from './helpers'

type AnySupabase = any

export interface AggregateCalendarArgs {
  supabase: AnySupabase
  userId: string
  orgId: string | null
  filters: AdminCalendarFilters
}

export interface AggregateCalendarResult {
  items: AdminCalendarItem[]
  summary: AdminCalendarSummary
  context: AdminCalendarContext | null
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

async function resolveTourEventIds(supabase: AnySupabase, tourId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('tour_events')
    .select('event_id')
    .eq('tour_id', tourId)

  if (error) {
    console.warn('[Admin Calendar] tour_events query error:', error.message)
    return []
  }

  return (data || [])
    .map((row: { event_id: string | null }) => row.event_id)
    .filter((id: string | null): id is string => Boolean(id))
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
  if (orgId) query = query.or(`org_id.eq.${orgId},created_by.eq.${userId}`)
  else query = query.eq('created_by', userId)
  const { data } = await query
  return (data || []).map((row: { id: string }) => row.id)
}

export async function aggregateAdminCalendarItems(
  args: AggregateCalendarArgs,
): Promise<AggregateCalendarResult> {
  const { supabase, userId, orgId, filters } = args
  const { startDate, endDate, types, status, priority, tourId, eventId } = filters
  const scopeMode = resolveScopeMode(filters)
  const items: AdminCalendarItem[] = []

  let scopedEventIds: string[] | null = null
  let context: AdminCalendarContext | null = null

  if (scopeMode === 'tour' && tourId) {
    scopedEventIds = await resolveTourEventIds(supabase, tourId)
    context = await loadTourContext(supabase, tourId, scopedEventIds)
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
    event: shouldInclude('event', types) && scopeMode !== 'event',
    // Parent tour spans are never day-cell items; context chrome replaces them.
    tour: false,
    task: shouldInclude('task', types),
    shift: shouldInclude('shift', types),
    production: shouldInclude('production', types),
    // Hiring is org-overview only (no reliable tour/event FK for MVP).
    hiring: shouldInclude('hiring', types) && scopeMode === 'org',
  }

  // 1. Events / shows
  if (wants.event && !(scopedEventIds && scopedEventIds.length === 0)) {
    try {
      let eventsQuery = supabase
        .from('events_v2')
        .select('id, title, start_at, end_at, status, capacity, created_at, created_by, venue_id, org_id, settings')
        .gte('start_at', startDate)
        .lte('start_at', `${endDate}T23:59:59.999Z`)

      if (scopedEventIds)
        eventsQuery = eventsQuery.in('id', scopedEventIds)
      if (orgId) eventsQuery = eventsQuery.or(`org_id.eq.${orgId},created_by.eq.${userId}`)
      else eventsQuery = eventsQuery.eq('created_by', userId)
      if (status) eventsQuery = eventsQuery.eq('status', status)

      const { data: events, error } = await eventsQuery
      if (error) console.error('[Admin Calendar] Events query error:', error)
      else {
        for (const event of events || []) {
          const start = toIsoOrNull(event.start_at)
          if (!start) continue
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
      }
    } catch (error) {
      console.error('[Admin Calendar] Events fetch error:', error)
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
  if (wants.task && !(scopedEventIds && scopedEventIds.length === 0)) {
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
      if (error) console.error('[Admin Calendar] Tasks query error:', error)
      else {
        for (const task of tasks || []) {
          const start = toIsoOrNull(task.due_at)
          if (!start) continue
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
      }
    } catch (error) {
      console.error('[Admin Calendar] Tasks fetch error:', error)
    }
  }

  if (wants.task) {

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
      if (error) console.warn('[Admin Calendar] logistics_tasks query error:', error.message)
      else {
        for (const task of logisticsTasks || []) {
          const due = task.due_date
          if (!due) continue
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
      }
    } catch (error) {
      console.warn('[Admin Calendar] logistics_tasks missing or error, skipping', error)
    }

    // 3c. Travel / lodging / catering windows (permission-filtered by event/tour scope)
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

      let transportQuery = applyTravelScope(
        supabase
          .from('ground_transportation_coordination')
          .select('id, pickup_location, dropoff_location, pickup_time, estimated_dropoff_time, status, event_id, tour_id')
          .gte('pickup_time', startDate)
          .lte('pickup_time', endDate)
      )
      const { data: transportRows } = await transportQuery
      for (const row of transportRows || []) {
        const start = toIsoOrNull(row.pickup_time)
        if (!start) continue
        pushItem(items, {
          id: `logistics-transport-${row.id}`,
          sourceId: row.id,
          kind: 'task',
          title: `Transport: ${row.pickup_location} → ${row.dropoff_location}`,
          start,
          end: toIsoOrNull(row.estimated_dropoff_time) || start,
          status: row.status || 'scheduled',
          priority: 'medium',
          href: '/admin/dashboard/logistics?tab=transportation',
          color: getCalendarItemColor('task', 'medium'),
          allDay: false,
          meta: {
            source: 'ground_transportation_coordination',
            eventId: row.event_id || null,
            tourId: row.tour_id || tourId || null,
          },
        })
      }

      let flightQuery = applyTravelScope(
        supabase
          .from('flight_coordination')
          .select('id, airline, flight_number, departure_airport, arrival_airport, departure_time, arrival_time, status, event_id, tour_id')
          .gte('departure_time', startDate)
          .lte('departure_time', endDate)
      )
      const { data: flightRows } = await flightQuery
      for (const row of flightRows || []) {
        const start = toIsoOrNull(row.departure_time)
        if (!start) continue
        pushItem(items, {
          id: `logistics-flight-${row.id}`,
          sourceId: row.id,
          kind: 'task',
          title: `Flight: ${row.airline} ${row.flight_number}`,
          start,
          end: toIsoOrNull(row.arrival_time) || start,
          status: row.status || 'scheduled',
          priority: 'high',
          href: '/admin/dashboard/logistics?tab=accommodations',
          color: getCalendarItemColor('task', 'high'),
          allDay: false,
          description: `${row.departure_airport} → ${row.arrival_airport}`,
          meta: {
            source: 'flight_coordination',
            eventId: row.event_id || null,
            tourId: row.tour_id || tourId || null,
          },
        })
      }

      let lodgingQuery = applyTravelScope(
        supabase
          .from('lodging_bookings')
          .select('id, primary_guest_name, check_in_date, check_out_date, status, event_id, tour_id')
          .gte('check_in_date', startDate.slice(0, 10))
          .lte('check_in_date', endDate.slice(0, 10))
      )
      const { data: lodgingRows } = await lodgingQuery
      for (const row of lodgingRows || []) {
        const start = combineDateAndTime(String(row.check_in_date).slice(0, 10))
        if (!start) continue
        pushItem(items, {
          id: `logistics-lodging-${row.id}`,
          sourceId: row.id,
          kind: 'task',
          title: `Hotel: ${row.primary_guest_name || 'Booking'}`,
          start,
          end: combineDateAndTime(String(row.check_out_date).slice(0, 10)) || start,
          status: row.status || 'confirmed',
          priority: 'medium',
          href: '/admin/dashboard/logistics?tab=accommodations',
          color: getCalendarItemColor('task', 'medium'),
          allDay: true,
          meta: {
            source: 'lodging_bookings',
            eventId: row.event_id || null,
            tourId: row.tour_id || tourId || null,
          },
        })
      }

      let cateringQuery = applyTravelScope(
        supabase
          .from('catering_services')
          .select('id, title, window_start, window_end, status, event_id, tour_id')
          .gte('window_start', startDate)
          .lte('window_start', endDate)
      )
      const { data: cateringRows } = await cateringQuery
      for (const row of cateringRows || []) {
        const start = toIsoOrNull(row.window_start)
        if (!start) continue
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
    } catch (error) {
      console.warn('[Admin Calendar] logistics travel/catering windows skipped', error)
    }
  }

  // 4. Staff shifts
  if (wants.shift && !(scopedEventIds && scopedEventIds.length === 0)) {
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
      if (error) console.warn('[Admin Calendar] staff_shifts query error:', error.message)
      else {
        for (const shift of shifts || []) {
          if (!shift.shift_date) continue
          const start = combineDateAndTime(String(shift.shift_date).slice(0, 10), shift.start_time)
          const end = combineDateAndTime(String(shift.shift_date).slice(0, 10), shift.end_time || shift.start_time)
          pushItem(items, {
            id: `shift-${shift.id}`,
            sourceId: shift.id,
            kind: 'shift',
            title: shift.role_assignment || 'Staff shift',
            start,
            end,
            status: shift.status || 'scheduled',
            priority: 'medium',
            href: hrefForKind('shift', shift.id),
            color: getCalendarItemColor('shift', 'medium'),
            allDay: false,
            description: shift.notes || null,
            meta: {
              eventId: shift.event_id,
              venueId: shift.venue_id,
              staffMemberId: shift.staff_member_id,
              tourId: tourId || null,
            },
          })
        }
      }
    } catch (error) {
      console.warn('[Admin Calendar] staff_shifts missing or error, skipping', error)
    }
  }

  // 5. Event HQ production calendar items
  if (wants.production) {
    try {
      const eventIds = productionEventIds
      if (eventIds.length > 0) {
        const { data: productionItems, error } = await supabase
          .from('event_calendar_items')
          .select('id, event_id, title, description, start_time, end_time, type, location, color, is_all_day, metadata')
          .in('event_id', eventIds)
          .gte('start_time', startDate)
          .lte('start_time', `${endDate}T23:59:59.999Z`)

        if (error) console.warn('[Admin Calendar] event_calendar_items query error:', error.message)
        else {
          for (const item of productionItems || []) {
            const start = toIsoOrNull(item.start_time)
            if (!start) continue
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
                productionType: item.type,
                calendarItemId: item.id,
                eventId: item.event_id,
                tourId: tourId || null,
              },
            })
          }
        }
      }
    } catch (error) {
      console.warn('[Admin Calendar] event_calendar_items missing or error, skipping', error)
    }
  }

  // 6. Hiring — interviews / offers / posting deadlines (org overview only)
  if (wants.hiring) {
    try {
      let appsQuery = supabase
        .from('job_applications')
        .select('id, applicant_name, status, interview_scheduled, interview_date, offer_made, offer_date, offer_details, form_responses, applied_at, employer_entity_id, job_posting_id')
        .or(`and(interview_date.gte.${startDate},interview_date.lte.${endDate}T23:59:59.999Z),and(offer_date.gte.${startDate},offer_date.lte.${endDate}T23:59:59.999Z)`)

      if (orgId) appsQuery = appsQuery.eq('employer_entity_id', orgId)

      const { data: applications, error } = await appsQuery
      if (error) {
        let fallbackQuery = supabase
          .from('job_applications')
          .select('id, applicant_name, status, interview_scheduled, offer_made, offer_details, form_responses, applied_at, employer_entity_id, job_posting_id')
          .limit(200)

        if (orgId) fallbackQuery = fallbackQuery.eq('employer_entity_id', orgId)

        const fallback = await fallbackQuery
        if (fallback.error) {
          console.warn('[Admin Calendar] job_applications query error:', fallback.error.message)
        } else {
          for (const app of fallback.data || []) {
            const interviewDate =
              extractJsonDate(app.offer_details, ['interview_date', 'interviewAt', 'interview_at'])
              || extractJsonDate(app.form_responses, ['interview_date', 'interviewAt'])
            const offerDate =
              extractJsonDate(app.offer_details, ['offer_date', 'offerAt', 'offer_at'])
              || extractJsonDate(app.form_responses, ['offer_date', 'offerAt'])

            for (const [label, iso] of [
              ['Interview', interviewDate],
              ['Offer', offerDate],
            ] as const) {
              if (!iso) continue
              const day = iso.slice(0, 10)
              if (day < startDate || day > endDate) continue
              pushItem(items, {
                id: `hiring-${label.toLowerCase()}-${app.id}`,
                sourceId: app.id,
                kind: 'hiring',
                title: `${label}: ${app.applicant_name || 'Candidate'}`,
                start: iso,
                end: iso,
                status: app.status || 'pending',
                priority: 'medium',
                href: hrefForKind('hiring', app.id),
                color: getCalendarItemColor('hiring', 'medium'),
                allDay: false,
                meta: { applicationId: app.id, hiringKind: label.toLowerCase() },
              })
            }
          }
        }
      } else {
        for (const app of applications || []) {
          const interviewDate =
            toIsoOrNull(app.interview_date)
            || extractJsonDate(app.offer_details, ['interview_date', 'interviewAt'])
          const offerDate =
            toIsoOrNull(app.offer_date)
            || extractJsonDate(app.offer_details, ['offer_date', 'offerAt'])

          if (interviewDate && app.interview_scheduled !== false) {
            const day = interviewDate.slice(0, 10)
            if (day >= startDate && day <= endDate) {
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
      }
    } catch (error) {
      console.warn('[Admin Calendar] hiring applications missing or error, skipping', error)
    }

    try {
      let postingsQuery = supabase
        .from('organization_job_postings')
        .select('id, title, status, organization_id, created_at, updated_at')
        .eq('status', 'published')
        .limit(100)

      if (orgId) postingsQuery = postingsQuery.eq('organization_id', orgId)

      const { data: postings, error } = await postingsQuery
      if (error) console.warn('[Admin Calendar] organization_job_postings query error:', error.message)
      else {
        for (const posting of postings || []) {
          const deadline =
            toIsoOrNull((posting as { application_deadline?: string }).application_deadline)
            || toIsoOrNull((posting as { closes_at?: string }).closes_at)
            || extractJsonDate((posting as { metadata?: unknown }).metadata, ['application_deadline', 'closes_at', 'deadline'])

          if (!deadline) continue
          const day = deadline.slice(0, 10)
          if (day < startDate || day > endDate) continue
          pushItem(items, {
            id: `hiring-deadline-${posting.id}`,
            sourceId: posting.id,
            kind: 'hiring',
            title: `Deadline: ${posting.title || 'Job posting'}`,
            start: deadline,
            end: deadline,
            status: posting.status || 'published',
            priority: 'high',
            href: `/admin/dashboard/jobs/${posting.id}`,
            color: getCalendarItemColor('hiring', 'high'),
            allDay: true,
            meta: { hiringKind: 'deadline', postingId: posting.id },
          })
        }
      }
    } catch (error) {
      console.warn('[Admin Calendar] job posting deadlines missing or error, skipping', error)
    }
  }

  items.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  const summary = emptySummary()
  for (const item of items) {
    if (ADMIN_CALENDAR_KINDS.includes(item.kind))
      summary[item.kind] += 1
  }

  return { items, summary, context }
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
