/**
 * CAL-102 — Capability gates for calendar kinds and underlying sources.
 */

import type { AdminCapability } from '@/lib/auth/admin-capabilities'
import { hasAdminCapability } from '@/lib/auth/admin-capabilities'
import type { AdminCalendarKind, AdminCalendarSourceId } from '@/lib/admin/calendar/types'

/** Any of these grants access to the admin calendar surface. */
export const CALENDAR_ENTRY_CAPABILITIES: AdminCapability[] = [
  'event.view',
  'tour.view',
  'logistics.view',
  'workforce.view',
  'hiring.manage',
]

export const CALENDAR_KIND_CAPABILITIES: Record<AdminCalendarKind, AdminCapability[]> = {
  event: ['event.view'],
  tour: ['tour.view'],
  task: ['event.view', 'logistics.view'],
  shift: ['workforce.view'],
  production: ['event.view'],
  hiring: ['hiring.manage'],
  travel: ['logistics.view'],
}

export const CALENDAR_SOURCE_CAPABILITIES: Record<AdminCalendarSourceId, AdminCapability[]> = {
  events_v2: ['event.view'],
  tour_events: ['tour.view', 'event.view'],
  tasks: ['event.view'],
  logistics_tasks: ['logistics.view'],
  catering_services: ['logistics.view'],
  ground_transportation_coordination: ['logistics.view'],
  flight_coordination: ['logistics.view'],
  lodging_bookings: ['logistics.view'],
  staff_shifts: ['workforce.view'],
  event_calendar_items: ['event.view'],
  job_applications: ['hiring.manage'],
  organization_job_postings: ['hiring.manage'],
}

function hasAnyCapability(
  capabilities: readonly AdminCapability[],
  required: readonly AdminCapability[],
): boolean {
  return required.some((cap) => hasAdminCapability(capabilities, cap))
}

export function hasCalendarEntryAccess(capabilities: readonly AdminCapability[]): boolean {
  return hasAnyCapability(capabilities, CALENDAR_ENTRY_CAPABILITIES)
}

export function canAccessCalendarKind(
  capabilities: readonly AdminCapability[],
  kind: AdminCalendarKind,
): boolean {
  return hasAnyCapability(capabilities, CALENDAR_KIND_CAPABILITIES[kind])
}

export function canAccessCalendarSource(
  capabilities: readonly AdminCapability[],
  sourceId: AdminCalendarSourceId,
): boolean {
  return hasAnyCapability(capabilities, CALENDAR_SOURCE_CAPABILITIES[sourceId])
}

export function filterCalendarKindsByCapabilities(args: {
  types?: AdminCalendarKind[]
  capabilities: readonly AdminCapability[]
}): AdminCalendarKind[] | undefined {
  const { types, capabilities } = args
  const base = types && types.length > 0
    ? types
    : (Object.keys(CALENDAR_KIND_CAPABILITIES) as AdminCalendarKind[])

  return base.filter((kind) => canAccessCalendarKind(capabilities, kind))
}
