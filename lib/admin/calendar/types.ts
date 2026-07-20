export type AdminCalendarKind =
  | 'event'
  | 'tour'
  | 'task'
  | 'shift'
  | 'production'
  | 'hiring'

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
}

export interface AdminCalendarResponse {
  success: boolean
  items: AdminCalendarItem[]
  total: number
  orgId: string | null
  filters: AdminCalendarFilters
  summary: AdminCalendarSummary
  context: AdminCalendarContext | null
}

export const ADMIN_CALENDAR_KINDS: AdminCalendarKind[] = [
  'event',
  'tour',
  'task',
  'shift',
  'production',
  'hiring',
]

export const TOUR_SCOPE_KINDS: AdminCalendarKind[] = [
  'event',
  'task',
  'shift',
  'production',
]

export const EVENT_SCOPE_KINDS: AdminCalendarKind[] = [
  'task',
  'shift',
  'production',
]

export const ORG_SCOPE_KINDS: AdminCalendarKind[] = [
  'event',
  'task',
  'shift',
  'production',
  'hiring',
]

export const KIND_LABELS: Record<AdminCalendarKind, string> = {
  event: 'Events',
  tour: 'Tours',
  task: 'Tasks',
  shift: 'Shifts',
  production: 'Production',
  hiring: 'Hiring',
}

export const SCOPED_KIND_LABELS: Record<AdminCalendarKind, string> = {
  event: 'Shows',
  tour: 'Tours',
  task: 'Tasks',
  shift: 'Shifts',
  production: 'Production',
  hiring: 'Hiring',
}

export const KIND_COLORS: Record<AdminCalendarKind, string> = {
  event: 'blue',
  tour: 'purple',
  task: 'orange',
  shift: 'indigo',
  production: 'emerald',
  hiring: 'pink',
}

export function kindsForScope(scope?: AdminCalendarScopeMode | null): AdminCalendarKind[] {
  if (scope === 'tour') return [...TOUR_SCOPE_KINDS]
  if (scope === 'event') return [...EVENT_SCOPE_KINDS]
  return [...ORG_SCOPE_KINDS]
}
