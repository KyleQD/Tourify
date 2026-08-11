/**
 * CAL-102 — Protected-field projection for calendar items and ICS feeds.
 */

import type { AdminCapability } from '@/lib/auth/admin-capabilities'
import { hasAdminCapability } from '@/lib/auth/admin-capabilities'
import type { AdminCalendarItem } from '@/lib/admin/calendar/types'

/** Meta keys that identify people / assignment internals. */
export const CALENDAR_PROTECTED_META_KEYS = [
  'passengers',
  'staffMemberId',
  'userId',
  'employmentAssignmentId',
  'assignmentStatus',
  'roleTitle',
] as const

export type CalendarProjectionMode = 'admin' | 'feed'

export function canViewCalendarProtectedFields(
  capabilities: readonly AdminCapability[],
): boolean {
  return (
    hasAdminCapability(capabilities, 'logistics.manage')
    || hasAdminCapability(capabilities, 'workforce.manage')
    || hasAdminCapability(capabilities, 'hiring.manage')
    || hasAdminCapability(capabilities, 'event.manage')
  )
}

function redactTravelTitle(title: string): string {
  // Strip " · Name" passenger/driver suffixes added by aggregate.
  return title.replace(/\s·\s.+$/, '')
}

function redactHiringTitle(title: string, kind: AdminCalendarItem['kind']): string {
  if (kind !== 'hiring') return title
  if (title.startsWith('Interview:')) return 'Interview'
  if (title.startsWith('Offer:')) return 'Offer'
  return 'Hiring item'
}

export function projectCalendarItem(args: {
  item: AdminCalendarItem
  capabilities?: readonly AdminCapability[] | null
  mode?: CalendarProjectionMode
}): AdminCalendarItem {
  const mode = args.mode || 'admin'
  const canViewProtected =
    mode === 'admin'
    && args.capabilities
    && canViewCalendarProtectedFields(args.capabilities)

  if (canViewProtected) return args.item

  const meta = { ...(args.item.meta || {}) }
  for (const key of CALENDAR_PROTECTED_META_KEYS) {
    if (key in meta) meta[key] = null
  }

  let title = args.item.title
  if (args.item.kind === 'travel') title = redactTravelTitle(title)
  if (args.item.kind === 'hiring') title = redactHiringTitle(title, args.item.kind)

  return {
    ...args.item,
    title,
    description: mode === 'feed' ? null : (args.item.kind === 'shift' ? null : args.item.description),
    meta,
  }
}

export function projectCalendarItems(args: {
  items: AdminCalendarItem[]
  capabilities?: readonly AdminCapability[] | null
  mode?: CalendarProjectionMode
}): AdminCalendarItem[] {
  return args.items.map((item) =>
    projectCalendarItem({
      item,
      capabilities: args.capabilities,
      mode: args.mode,
    }),
  )
}
