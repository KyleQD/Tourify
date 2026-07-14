import type { AdminCalendarKind, AdminCalendarPriority } from './types'
import { KIND_COLORS } from './types'

export function getCalendarItemColor(
  kind: AdminCalendarKind,
  priority: AdminCalendarPriority = 'medium',
): string {
  if (priority === 'urgent') return 'red'
  if (priority === 'high') {
    if (kind === 'task' || kind === 'hiring') return 'orange'
    return 'orange'
  }
  return KIND_COLORS[kind] || 'blue'
}

export function parseCalendarKinds(raw: string | null | undefined): AdminCalendarKind[] | undefined {
  if (!raw?.trim()) return undefined
  const allowed = new Set(['event', 'tour', 'task', 'shift', 'production', 'hiring'])
  const kinds = raw
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part): part is AdminCalendarKind => allowed.has(part))
  return kinds.length > 0 ? kinds : undefined
}

export function toIsoOrNull(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString()
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toISOString()
  }
  return null
}

export function combineDateAndTime(dateValue: string, timeValue?: string | null): string {
  const time = timeValue && /^\d{1,2}:\d{2}/.test(timeValue)
    ? timeValue.length === 5
      ? `${timeValue}:00`
      : timeValue
    : '09:00:00'
  const iso = toIsoOrNull(`${dateValue}T${time}`)
  return iso || new Date(`${dateValue}T09:00:00Z`).toISOString()
}

export function endOfDayIso(dateValue: string): string {
  return toIsoOrNull(`${dateValue}T23:59:59`) || `${dateValue}T23:59:59.000Z`
}

export function hrefForKind(kind: AdminCalendarKind, sourceId: string): string {
  switch (kind) {
    case 'event':
      return `/admin/dashboard/events/${sourceId}`
    case 'tour':
      return `/admin/dashboard/tours/${sourceId}`
    case 'task':
      return `/admin/dashboard/logistics`
    case 'shift':
      return `/admin/dashboard/staff?tab=scheduling`
    case 'production':
      return `/admin/dashboard/events/${sourceId}/hq`
    case 'hiring':
      return `/admin/dashboard/candidates`
    default:
      return '/admin/dashboard/calendar'
  }
}
