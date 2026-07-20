import {
  normalizeCollaboratorInvites,
  normalizeTaggedUserIds,
} from '@/lib/feed/post-collaborator-helpers'

export { normalizeCollaboratorInvites, normalizeTaggedUserIds }

export async function insertFeedPostCollaborators({
  supabase,
  postId,
  invitedByUserId,
  invites,
}: {
  supabase: any
  postId: string
  invitedByUserId: string
  invites: Array<{ userId: string; profileId?: string | null }>
}) {
  if (invites.length === 0) return []

  const rows = invites.map((invite) => ({
    post_id: postId,
    collaborator_user_id: invite.userId,
    collaborator_profile_id: invite.profileId || null,
    status: 'invited',
    invited_by_user_id: invitedByUserId,
  }))

  const { data, error } = await supabase
    .from('feed_post_collaborators')
    .upsert(rows, { onConflict: 'post_id,collaborator_user_id', ignoreDuplicates: true })
    .select('id, post_id, collaborator_user_id, collaborator_profile_id, status')

  if (error) {
    console.warn('[feed collaborators] insert failed:', error)
    return []
  }

  return data || []
}

export async function notifyTaggedUsers({
  taggedUserIds,
  actorUserId,
  postId,
  actorName,
}: {
  taggedUserIds: string[]
  actorUserId: string
  postId: string
  actorName?: string
}) {
  const { OptimizedNotificationService } = await import(
    '@/lib/services/optimized-notification-service'
  )

  await Promise.allSettled(
    taggedUserIds.map((userId) =>
      OptimizedNotificationService.createNotification({
        userId,
        type: 'mention',
        title: 'You were tagged in a post',
        content: `${actorName || 'Someone'} tagged you in a post`,
        summary: 'Tagged in a post',
        relatedUserId: actorUserId,
        relatedContentId: postId,
        relatedContentType: 'post',
        metadata: { kind: 'post_tag' },
      }).catch(() => null)
    )
  )
}

export async function notifyCollaboratorInvites({
  invites,
  actorUserId,
  postId,
  actorName,
}: {
  invites: Array<{ userId: string }>
  actorUserId: string
  postId: string
  actorName?: string
}) {
  const { OptimizedNotificationService } = await import(
    '@/lib/services/optimized-notification-service'
  )

  await Promise.allSettled(
    invites.map((invite) =>
      OptimizedNotificationService.createNotification({
        userId: invite.userId,
        type: 'collaboration_invite',
        title: 'Collaborative post invitation',
        content: `${actorName || 'Someone'} invited you to share a post through your network`,
        summary: 'Approve collaborative post',
        relatedUserId: actorUserId,
        relatedContentId: postId,
        relatedContentType: 'post',
        metadata: { kind: 'feed_post_collab' },
        priority: 'normal',
      }).catch(() => null)
    )
  )
}
