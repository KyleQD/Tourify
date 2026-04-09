import { hasEntityPermission } from '@/lib/services/rbac'

/** Post jobs and manage venue staffing listings (entity-scoped). */
export async function canManageVenueStaffing(input: { userId: string; venueId: string }) {
  return hasEntityPermission({
    userId: input.userId,
    entityType: 'Venue',
    entityId: input.venueId,
    permission: 'ASSIGN_EVENT_ROLES',
  })
}

/** Review applications and run onboarding for a venue (same gate as posting in current product). */
export async function canReviewStaffingApplications(input: { userId: string; venueId: string }) {
  return canManageVenueStaffing(input)
}
