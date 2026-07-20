/**
 * Account-scoped messaging inbox filters.
 *
 * Conversations stay between auth user ids, but each side is tagged with
 * profile_id + account_type so artist/org/venue inboxes can be selected
 * independently from the personal (general) inbox.
 */

import { normalizeAccountType, type ProfileType } from '@/lib/accounts/account-types'

export interface MessagingAccountScope {
  userId: string
  profileId?: string | null
  accountType?: string | null
}

export type MessagingInboxKind = 'general' | 'entity'

export interface ConversationAccountSides {
  participant_1: string
  participant_2: string
  participant_1_profile_id?: string | null
  participant_1_account_type?: string | null
  participant_2_profile_id?: string | null
  participant_2_account_type?: string | null
}

export function resolveMessagingInboxKind(
  scope: Pick<MessagingAccountScope, 'accountType' | 'profileId'>
): MessagingInboxKind {
  const accountType = normalizeAccountType(scope.accountType || 'general')
  if (accountType !== 'general' && scope.profileId)
    return 'entity'
  return 'general'
}

/**
 * PostgREST `.or()` filter for conversations belonging to an inbox account.
 * Must be combined with a participant membership filter separately when needed;
 * this filter alone matches rows where the viewing user's side is the inbox.
 */
export function buildConversationInboxOrFilter(scope: MessagingAccountScope): string {
  const kind = resolveMessagingInboxKind(scope)
  const userId = scope.userId

  if (kind === 'entity' && scope.profileId) {
    const profileId = scope.profileId
    return [
      `and(participant_1.eq.${userId},participant_1_profile_id.eq.${profileId})`,
      `and(participant_2.eq.${userId},participant_2_profile_id.eq.${profileId})`,
    ].join(',')
  }

  // Personal inbox: explicit general, or legacy null account tags.
  return [
    `and(participant_1.eq.${userId},participant_1_account_type.eq.general)`,
    `and(participant_2.eq.${userId},participant_2_account_type.eq.general)`,
    `and(participant_1.eq.${userId},participant_1_account_type.is.null)`,
    `and(participant_2.eq.${userId},participant_2_account_type.is.null)`,
  ].join(',')
}

/** Apply inbox scope to a conversations query builder. */
export function applyConversationAccountScope<T extends {
  or: (filters: string) => T
}>(query: T, scope: MessagingAccountScope): T {
  return query.or(buildConversationInboxOrFilter(scope))
}

export function normalizeMessagingAccountType(accountType?: string | null): ProfileType {
  return normalizeAccountType(accountType || 'general')
}

export function resolveSenderAccountSide(input: {
  userId: string
  profileId?: string | null
  accountType?: string | null
}): { profileId: string; accountType: ProfileType } {
  const accountType = normalizeMessagingAccountType(input.accountType)
  if (accountType === 'general')
    return { profileId: input.userId, accountType: 'general' }
  return {
    profileId: input.profileId || input.userId,
    accountType,
  }
}

export function resolveRecipientAccountSide(input: {
  userId: string
  profileId?: string | null
  accountType?: string | null
}): { profileId: string; accountType: ProfileType } {
  return resolveSenderAccountSide(input)
}

/** Match an existing conversation for a directed account-aware pair (either order). */
export function buildAccountAwareConversationPairFilter(input: {
  senderId: string
  recipientId: string
  senderProfileId: string
  recipientProfileId: string
}): string {
  const { senderId, recipientId, senderProfileId, recipientProfileId } = input
  return [
    `and(participant_1.eq.${senderId},participant_2.eq.${recipientId},participant_1_profile_id.eq.${senderProfileId},participant_2_profile_id.eq.${recipientProfileId})`,
    `and(participant_1.eq.${recipientId},participant_2.eq.${senderId},participant_1_profile_id.eq.${recipientProfileId},participant_2_profile_id.eq.${senderProfileId})`,
  ].join(',')
}

export function conversationBelongsToInbox(
  conversation: ConversationAccountSides,
  scope: MessagingAccountScope
): boolean {
  const kind = resolveMessagingInboxKind(scope)
  const userId = scope.userId

  const sideForUser =
    conversation.participant_1 === userId
      ? {
          profileId: conversation.participant_1_profile_id ?? conversation.participant_1,
          accountType: conversation.participant_1_account_type ?? 'general',
        }
      : conversation.participant_2 === userId
        ? {
            profileId: conversation.participant_2_profile_id ?? conversation.participant_2,
            accountType: conversation.participant_2_account_type ?? 'general',
          }
        : null

  if (!sideForUser) return false

  if (kind === 'entity' && scope.profileId)
    return sideForUser.profileId === scope.profileId

  const type = normalizeMessagingAccountType(sideForUser.accountType)
  return type === 'general'
}
