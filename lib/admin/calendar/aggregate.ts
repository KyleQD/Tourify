import type {
  AdminCalendarFilters,
  AdminCalendarItem,
  AdminCalendarKind,
  AdminCalendarPriority,
  AdminCalendarSummary,
} from './types'
import { ADMIN_CALENDAR_KINDS } from './types'
import {
  combineDateAndTime,
  endOfDayIso,
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

async function resolveOrgEventIds(supabase: AnySupabase, orgId: string | null, userId: string): Promise<string[]> {
  let query = supabase.from('events_v2').select('id')
  if (orgId) query = query.or(`org_id.eq.${orgId},created_by.eq.${userId}`)
  else query = query.eq('created_by', userId)
  const { data } = await query
  return (data || []).map((row: { id: string }) => row.id)
}

export async function aggregateAdminCalendarItems(
  args: AggregateCalendarArgs,
): Promise<{ items: AdminCalendarItem[]; summary: AdminCalendarSummary }> {
  const { supabase, userId, orgId, filters } = args
  const { startDate, endDate, types, status, priority } = filters
  const items: AdminCalendarItem[] = []
  let orgEventIds: string[] = []

  const wants = {
    event: shouldInclude('event', types),
    tour: shouldInclude('tour', types),
    task: shouldInclude('task', types),
    shift: shouldInclude('shift', types),
    production: shouldInclude('production', types),
    hiring: shouldInclude('hiring', types),
  }

  // 1. Events
  if (wants.event) {
    try {
      let eventsQuery = supabase
        .from('events_v2')
        .select('id, title, start_at, end_at, status, capacity, created_at, created_by, venue_id, org_id, settings')
        .gte('start_at', startDate)
        .lte('start_at', `${endDate}T23:59:59.999Z`)

      if (orgId) eventsQuery = eventsQuery.or(`org_id.eq.${orgId},created_by.eq.${userId}`)
      else eventsQuery = eventsQuery.eq('created_by', userId)
      if (status) eventsQuery = eventsQuery.eq('status', status)

      const { data: events, error } = await eventsQuery
      if (error) console.error('[Admin Calendar] Events query error:', error)
      else {
        for (const event of events || []) {
          orgEventIds.push(event.id)
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
            meta: { capacity: event.capacity, venueId: event.venue_id },
          })
        }
      }
    } catch (error) {
      console.error('[Admin Calendar] Events fetch error:', error)
    }
  }

  // Resolve org event IDs for production items when events were not loaded in-range
  if (wants.production && orgEventIds.length === 0) {
    try {
      orgEventIds = await resolveOrgEventIds(supabase, orgId, userId)
    } catch (error) {
      console.warn('[Admin Calendar] Failed to resolve org event ids', error)
    }
  } else if (wants.production && orgEventIds.length > 0) {
    // Events query only returns in-range rows; production may need all org event IDs
    try {
      const allIds = await resolveOrgEventIds(supabase, orgId, userId)
      if (allIds.length > 0) orgEventIds = allIds
    } catch {
      // keep in-range ids
    }
  }

  // 2. Tours (multi-day ranges overlapping the window)
  if (wants.tour) {
    try {
      let toursQuery = supabase
        .from('tours')
        .select('id, name, description, start_date, end_date, status, budget, org_id, user_id, created_by')
        .lte('start_date', endDate)
        .gte('end_date', startDate)

      if (orgId) toursQuery = toursQuery.eq('org_id', orgId)
      else toursQuery = toursQuery.or(`user_id.eq.${userId},created_by.eq.${userId}`)
      if (status) toursQuery = toursQuery.eq('status', status)

      const { data: tours, error } = await toursQuery
      if (error) console.error('[Admin Calendar] Tours query error:', error)
      else {
        for (const tour of tours || []) {
          if (!tour.start_date) continue
          const start = toIsoOrNull(tour.start_date) || `${tour.start_date}T00:00:00.000Z`
          const end = tour.end_date
            ? endOfDayIso(String(tour.end_date).slice(0, 10))
            : endOfDayIso(String(tour.start_date).slice(0, 10))
          const itemPriority: AdminCalendarPriority = tour.budget && Number(tour.budget) > 100000 ? 'high' : 'medium'
          pushItem(items, {
            id: `tour-${tour.id}`,
            sourceId: tour.id,
            kind: 'tour',
            title: tour.name || 'Untitled tour',
            start,
            end,
            status: tour.status || 'planning',
            priority: itemPriority,
            href: hrefForKind('tour', tour.id),
            color: getCalendarItemColor('tour', itemPriority),
            allDay: true,
            description: tour.description || null,
            meta: { budget: tour.budget },
          })
        }
      }
    } catch (error) {
      console.warn('[Admin Calendar] Tours table missing or error, skipping', error)
    }
  }

  // 3a. Generic tasks
  if (wants.task) {
    try {
      let tasksQuery = supabase
        .from('tasks')
        .select('id, title, description, status, priority, due_at, created_at, created_by, org_id, event_id')
        .gte('due_at', startDate)
        .lte('due_at', `${endDate}T23:59:59.999Z`)

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
            meta: { source: 'tasks' },
          })
        }
      }
    } catch (error) {
      console.error('[Admin Calendar] Tasks fetch error:', error)
    }

    // 3b. Logistics tasks
    try {
      let logisticsQuery = supabase
        .from('logistics_tasks')
        .select('id, title, description, status, priority, due_date, assigned_to_user_id, created_at, type, org_id, event_id')
        .gte('due_date', startDate)
        .lte('due_date', endDate)

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
              : hrefForKind('task', task.id),
            color: getCalendarItemColor('task', itemPriority),
            allDay: true,
            description: task.description || null,
            meta: { source: 'logistics_tasks', type: task.type },
          })
        }
      }
    } catch (error) {
      console.warn('[Admin Calendar] logistics_tasks missing or error, skipping', error)
    }
  }

  // 4. Staff shifts
  if (wants.shift) {
    try {
      let shiftsQuery = supabase
        .from('staff_shifts')
        .select('id, venue_id, event_id, staff_member_id, shift_date, start_time, end_time, role_assignment, status, notes, created_at, org_id')
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)

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
      const eventIds = orgEventIds
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
              meta: { productionType: item.type, calendarItemId: item.id },
            })
          }
        }
      }
    } catch (error) {
      console.warn('[Admin Calendar] event_calendar_items missing or error, skipping', error)
    }
  }

  // 6. Hiring — interviews / offers / posting deadlines
  if (wants.hiring) {
    try {
      let appsQuery = supabase
        .from('job_applications')
        .select('id, applicant_name, status, interview_scheduled, interview_date, offer_made, offer_date, offer_details, form_responses, applied_at, employer_entity_id, job_posting_id')
        .or(`and(interview_date.gte.${startDate},interview_date.lte.${endDate}T23:59:59.999Z),and(offer_date.gte.${startDate},offer_date.lte.${endDate}T23:59:59.999Z)`)

      if (orgId) appsQuery = appsQuery.eq('employer_entity_id', orgId)

      const { data: applications, error } = await appsQuery
      if (error) {
        // Fallback without dedicated date columns
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

    // Job posting deadlines (application_deadline / closes_at / metadata)
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
        // Soft secondary query for deadline columns if present via RPC-less select *
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

  return { items, summary }
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
