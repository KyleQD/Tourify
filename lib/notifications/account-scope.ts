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

/**
 * PostgREST `.or()` filter for a combined personal + owned-entity inbox.
 * Empty scope lists safely fall back to the personal inbox rather than widening
 * the query to every notification row for the user.
 */
export function buildNotificationAccountScopesOrFilter(
  userId: string,
  accountScopes: NotificationAccountScope[],
): string {
  const scopes = accountScopes.length > 0
    ? accountScopes
    : [{ userId, targetProfileId: userId, accountType: 'general' }]
  const includeGeneral = scopes.some((scope) => resolveNotificationInboxKind(scope) === 'general')
  const entityProfileIds = [...new Set(
    scopes
      .filter((scope) => resolveNotificationInboxKind(scope) === 'entity')
      .map((scope) => scope.targetProfileId)
      .filter((profileId): profileId is string => Boolean(profileId)),
  )]
  const filters = includeGeneral ? buildGeneralInboxOrFilter(userId).split(',') : []

  if (entityProfileIds.length === 1)
    filters.push(`target_profile_id.eq.${entityProfileIds[0]}`)
  else if (entityProfileIds.length > 1)
    filters.push(`target_profile_id.in.(${entityProfileIds.join(',')})`)

  return filters.join(',') || buildGeneralInboxOrFilter(userId)
}

/** Apply inbox scope to a Supabase query builder that already filters by user_id. */
export function applyNotificationAccountScope<T>(
  query: T,
  scope: NotificationAccountScope,
): T {
  const filterable = query as unknown as {
    eq: (column: string, value: string) => T
    or: (filters: string) => T
  }
  const kind = resolveNotificationInboxKind(scope)

  if (kind === 'entity' && scope.targetProfileId)
    return filterable.eq('target_profile_id', scope.targetProfileId)

  return filterable.or(buildGeneralInboxOrFilter(scope.userId))
}

/** Apply several allowed inbox scopes to one user-filtered Supabase query. */
export function applyNotificationAccountScopes<T>(
  query: T,
  userId: string,
  accountScopes: NotificationAccountScope[],
): T {
  const filterable = query as unknown as { or: (filters: string) => T }
  return filterable.or(buildNotificationAccountScopesOrFilter(userId, accountScopes))
}

export interface NotificationTarget {
  target_profile_id?: string | null
  target_account_type?: string | null
}

/** Client-side companion to the database scope filters. */
export function notificationMatchesAccountScope(
  notification: NotificationTarget,
  scope: NotificationAccountScope,
): boolean {
  if (resolveNotificationInboxKind(scope) === 'general') {
    return (
      normalizeAccountType(notification.target_account_type || 'general') === 'general'
      || !notification.target_profile_id
      || notification.target_profile_id === scope.userId
    )
  }

  return Boolean(
    scope.targetProfileId
    && notification.target_profile_id === scope.targetProfileId
  )
}
