/**
 * Account-scoped notification inbox filters.
 *
 * Personal (general): social + applicant-facing + legacy null-target rows.
 * Entity (org/artist/venue/…): only rows tagged with that profile UUID.
 */

import { normalizeAccountType } from '@/lib/accounts/account-types'

export interface NotificationAccountScope {
  userId: string
  targetProfileId?: string | null
  accountType?: string | null
}

export type NotificationInboxKind = 'general' | 'entity'

export function resolveNotificationInboxKind(
  scope: Pick<NotificationAccountScope, 'accountType' | 'targetProfileId'>
): NotificationInboxKind {
  const accountType = normalizeAccountType(scope.accountType || 'general')
  if (accountType !== 'general' && scope.targetProfileId)
    return 'entity'
  return 'general'
}

/**
 * PostgREST `.or()` filter for personal inbox rows.
 * Includes explicit general targets, recipient-as-profile, and legacy nulls.
 */
export function buildGeneralInboxOrFilter(userId: string): string {
  return [
    'target_account_type.eq.general',
    'target_profile_id.is.null',
    `target_profile_id.eq.${userId}`,
  ].join(',')
}

/** Apply inbox scope to a Supabase query builder that already filters by user_id. */
export function applyNotificationAccountScope<T extends {
  eq: (column: string, value: unknown) => T
  or: (filters: string) => T
}>(query: T, scope: NotificationAccountScope): T {
  const kind = resolveNotificationInboxKind(scope)

  if (kind === 'entity' && scope.targetProfileId)
    return query.eq('target_profile_id', scope.targetProfileId)

  return query.or(buildGeneralInboxOrFilter(scope.userId))
}
