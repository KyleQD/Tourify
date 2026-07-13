export type AdminCalendarKind =
  | 'event'
  | 'tour'
  | 'task'
  | 'shift'
  | 'production'
  | 'hiring'

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

export interface AdminCalendarFilters {
  startDate: string
  endDate: string
  types?: AdminCalendarKind[]
  status?: string
  priority?: AdminCalendarPriority
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
}

export const ADMIN_CALENDAR_KINDS: AdminCalendarKind[] = [
  'event',
  'tour',
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

export const KIND_COLORS: Record<AdminCalendarKind, string> = {
  event: 'blue',
  tour: 'purple',
  task: 'orange',
  shift: 'indigo',
  production: 'emerald',
  hiring: 'pink',
}
