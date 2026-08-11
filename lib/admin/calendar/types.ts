export type AdminCalendarKind =
  | 'event'
  | 'tour'
  | 'task'
  | 'shift'
  | 'production'
  | 'hiring'
  | 'travel'

export type AdminCalendarScopeMode = 'tour' | 'event' | 'org'

export type AdminCalendarPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface AdminCalendarItem {
  id: string
  sourceId: string
  kind: AdminCalendarKind
  title: string
  start: string
  end: string
  status: string
  priority: AdminCalendarPriority
  href: string
  color: string
  allDay: boolean
  description?: string | null
  location?: string | null
  meta?: Record<string, unknown>
}

export interface AdminCalendarContext {
  mode: AdminCalendarScopeMode
  id: string | null
  name: string | null
  status: string | null
  startDate: string | null
  endDate: string | null
  href: string | null
  eventIds: string[]
}

export interface AdminCalendarFilters {
  startDate: string
  endDate: string
  types?: AdminCalendarKind[]
  status?: string
  priority?: AdminCalendarPriority
  scope?: AdminCalendarScopeMode
  tourId?: string
  eventId?: string
}

export interface AdminCalendarSummary {
  event: number
  tour: number
  task: number
  shift: number
  production: number
  hiring: number
  travel: number
}

/** CAL-101 — Stable calendar source ids aligned to deployed tables. */
export type AdminCalendarSourceId =
  | 'events_v2'
  | 'tour_events'
  | 'tasks'
  | 'logistics_tasks'
  | 'catering_services'
  | 'ground_transportation_coordination'
  | 'flight_coordination'
  | 'lodging_bookings'
  | 'staff_shifts'
  | 'event_calendar_items'
  | 'job_applications'
  | 'organization_job_postings'

export type AdminCalendarSourceStatus = 'ok' | 'empty' | 'degraded'

export interface AdminCalendarSourceHealth {
  id: AdminCalendarSourceId
  status: AdminCalendarSourceStatus
  itemCount: number
  errorCode?: string | null
  message?: string | null
}

export interface AdminCalendarResponse {
  success: boolean
  items: AdminCalendarItem[]
  total: number
  orgId: string | null
  filters: AdminCalendarFilters
  summary: AdminCalendarSummary
  context: AdminCalendarContext | null
  /** CAL-101 — per-source health; degraded ≠ empty calendar */
  sources?: AdminCalendarSourceHealth[]
  isDegraded?: boolean
}

export const ADMIN_CALENDAR_KINDS: AdminCalendarKind[] = [
  'event',
  'tour',
  'task',
  'shift',
  'production',
  'hiring',
  'travel',
]

export const TOUR_SCOPE_KINDS: AdminCalendarKind[] = [
  'event',
  'task',
  'shift',
  'production',
  'travel',
]

export const EVENT_SCOPE_KINDS: AdminCalendarKind[] = [
  'task',
  'shift',
  'production',
  'travel',
]

export const ORG_SCOPE_KINDS: AdminCalendarKind[] = [
  'event',
  'task',
  'shift',
  'production',
  'hiring',
  'travel',
]

export const KIND_LABELS: Record<AdminCalendarKind, string> = {
  event: 'Events',
  tour: 'Tours',
  task: 'Tasks',
  shift: 'Shifts',
  production: 'Production',
  hiring: 'Hiring',
  travel: 'Travel',
}

export const SCOPED_KIND_LABELS: Record<AdminCalendarKind, string> = {
  event: 'Shows',
  tour: 'Tours',
  task: 'Tasks',
  shift: 'Shifts',
  production: 'Production',
  hiring: 'Hiring',
  travel: 'Travel',
}

export const KIND_COLORS: Record<AdminCalendarKind, string> = {
  event: 'blue',
  tour: 'purple',
  task: 'orange',
  shift: 'indigo',
  production: 'emerald',
  hiring: 'pink',
  travel: 'cyan',
}

export function kindsForScope(scope?: AdminCalendarScopeMode | null): AdminCalendarKind[] {
  if (scope === 'tour') return [...TOUR_SCOPE_KINDS]
  if (scope === 'event') return [...EVENT_SCOPE_KINDS]
  return [...ORG_SCOPE_KINDS]
}
