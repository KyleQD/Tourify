/**
 * SEC-201 — Routes that must not use owner-only tour.user_id / created_by gates.
 * Canonical path: withAdminCapability + assertAdminTourAccess / requireTourAccess.
 */

export const SEC201_RETIRED_OWNER_ONLY_ROUTES = [
  'app/api/tours/[id]/route.ts',
  'app/api/tours/[id]/events/route.ts',
  'app/api/tours/[id]/events/[eventId]/route.ts',
  'app/api/tours/planner/route.ts',
] as const

/** Forbidden ownership patterns that deny org collaborators. */
export const SEC201_FORBIDDEN_OWNER_PATTERNS = [
  'tour.user_id !== user.id',
  'existingTour.user_id !== user.id',
  'user_id.eq.${user.id},created_by.eq.${user.id}',
  'Verify tour ownership',
  'owns this tour',
] as const

export function assertSec201SourceRetiredOwnerOnly(source: string): {
  ok: boolean
  failures: string[]
} {
  const failures: string[] = []
  for (const pattern of SEC201_FORBIDDEN_OWNER_PATTERNS) {
    if (source.includes(pattern))
      failures.push(`forbidden owner-only pattern: ${pattern}`)
  }
  if (!source.includes('assertAdminTourAccess') && !source.includes('requireTourAccess'))
    failures.push('missing assertAdminTourAccess / requireTourAccess')
  return { ok: failures.length === 0, failures }
}
