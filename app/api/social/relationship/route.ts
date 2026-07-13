import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { ProductionAuthService } from '@/lib/auth/production-auth'
import {
  loadRelationshipTarget,
  type RelationshipKind,
} from '@/lib/social/relationship-intent'

type RelationshipAction =
  | 'follow'
  | 'unfollow'
  | 'friend_request'
  | 'accept'
  | 'reject'
  | 'cancel'
  | 'unfriend'
  | 'check'

async function getFriendRelationship(supabase: any, viewerId: string, otherUserId: string) {
  const [{ data: outgoing }, { data: incoming }, { data: follow }, { data: reverseFollow }] =
    await Promise.all([
      supabase
        .from('follow_requests')
        .select('id, status')
        .eq('requester_id', viewerId)
        .eq('target_id', otherUserId)
        .maybeSingle(),
      supabase
        .from('follow_requests')
        .select('id, status')
        .eq('requester_id', otherUserId)
        .eq('target_id', viewerId)
        .eq('status', 'pending')
        .maybeSingle(),
      supabase
        .from('follows')
        .select('id')
        .eq('follower_id', viewerId)
        .eq('following_id', otherUserId)
        .maybeSingle(),
      supabase
        .from('follows')
        .select('id')
        .eq('follower_id', otherUserId)
        .eq('following_id', viewerId)
        .maybeSingle(),
    ])

  const isFollowing = Boolean(follow)
  const isFollowedBy = Boolean(reverseFollow)
  let relationship: 'none' | 'pending' | 'incoming' | 'following' | 'friends' = 'none'
  if (isFollowing && isFollowedBy) relationship = 'friends'
  else if (outgoing?.status === 'pending') relationship = 'pending'
  else if (incoming) relationship = 'incoming'
  else if (isFollowing) relationship = 'following'

  return {
    kind: 'friend' as const,
    relationship,
    isFollowing,
    isFollowedBy,
    hasOutgoingRequest: outgoing?.status === 'pending',
    hasIncomingRequest: Boolean(incoming),
    requestStatus: outgoing?.status || null,
  }
}

async function getFollowRelationship(supabase: any, viewerId: string, accountId: string) {
  const { data: row } = await supabase
    .from('account_follows')
    .select('id, created_at')
    .eq('follower_user_id', viewerId)
    .eq('account_id', accountId)
    .maybeSingle()

  return {
    kind: 'follow' as const,
    relationship: row ? ('following' as const) : ('none' as const),
    isFollowing: Boolean(row),
    followedAt: row?.created_at || null,
  }
}

async function followAccount(supabase: any, viewerId: string, accountId: string) {
  const { data, error } = await supabase
    .from('account_follows')
    .insert({
      follower_user_id: viewerId,
      account_id: accountId,
    })
    .select('id')
    .maybeSingle()

  if (error && error.code !== '23505') {
    return {
      error: 'Failed to follow account',
      code: 'follow_failed',
      details: error.message,
      status: 500,
    }
  }

  return {
    success: true,
    kind: 'follow' as const,
    action: error?.code === '23505' ? 'already_following' : 'followed',
    accountId,
    followId: data?.id || null,
  }
}

async function unfollowAccount(supabase: any, viewerId: string, accountId: string) {
  const { error } = await supabase
    .from('account_follows')
    .delete()
    .eq('follower_user_id', viewerId)
    .eq('account_id', accountId)

  if (error) {
    return {
      error: 'Failed to unfollow account',
      code: 'unfollow_failed',
      details: error.message,
      status: 500,
    }
  }

  return {
    success: true,
    kind: 'follow' as const,
    action: 'unfollowed',
    accountId,
  }
}

async function sendFriendRequest(supabase: any, viewerId: string, targetUserId: string) {
  if (viewerId === targetUserId) {
    return { error: 'Cannot friend yourself', code: 'self_request', status: 400 }
  }

  const { data: existingRequest } = await supabase
    .from('follow_requests')
    .select('id, status')
    .eq('requester_id', viewerId)
    .eq('target_id', targetUserId)
    .maybeSingle()

  if (existingRequest?.status === 'pending') {
    return { error: 'Friend request already sent', code: 'already_pending', status: 400 }
  }

  const { data: existingFollow } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', viewerId)
    .eq('following_id', targetUserId)
    .maybeSingle()

  const { data: reverseFollow } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', targetUserId)
    .eq('following_id', viewerId)
    .maybeSingle()

  if (existingFollow && reverseFollow) {
    return { success: true, kind: 'friend' as const, action: 'already_friends' }
  }

  if (existingRequest && (existingRequest.status === 'rejected' || existingRequest.status === 'cancelled')) {
    await supabase.from('follow_requests').delete().eq('id', existingRequest.id)
  }

  const { error } = await supabase.from('follow_requests').insert({
    requester_id: viewerId,
    target_id: targetUserId,
    status: 'pending',
  })

  if (error) {
    return {
      error: 'Failed to send friend request',
      code: 'insert_failed',
      details: error.message,
      status: 500,
    }
  }

  return {
    success: true,
    kind: 'friend' as const,
    action: 'request_sent',
    message: 'Friend request sent',
  }
}

async function acceptFriendRequest(supabase: any, viewerId: string, requesterId: string) {
  const { data: followRequest } = await supabase
    .from('follow_requests')
    .select('id, requester_id')
    .eq('target_id', viewerId)
    .eq('requester_id', requesterId)
    .eq('status', 'pending')
    .maybeSingle()

  if (!followRequest) {
    return { error: 'Friend request not found', code: 'not_found', status: 404 }
  }

  const { error: updateError } = await supabase
    .from('follow_requests')
    .update({
      status: 'accepted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', followRequest.id)
    .eq('status', 'pending')

  const isBrokenPrefsGate =
    !!updateError &&
    (updateError.code === '42703' ||
      /enable_follows|enable_likes|enable_comments|enable_shares|enable_messages|enable_events|enable_system/i.test(
        updateError.message || ''
      ))

  if (updateError && !isBrokenPrefsGate) {
    return {
      error: 'Failed to accept friend request',
      code: 'accept_failed',
      details: updateError.message,
      status: 500,
    }
  }

  if (isBrokenPrefsGate) {
    const { error: deleteError } = await supabase
      .from('follow_requests')
      .delete()
      .eq('id', followRequest.id)
      .eq('status', 'pending')

    if (deleteError) {
      return {
        error: 'Failed to accept friend request',
        code: 'accept_fallback_delete_failed',
        details: deleteError.message,
        status: 500,
      }
    }
  }

  const { error: followError } = await supabase.from('follows').insert({
    follower_id: followRequest.requester_id,
    following_id: viewerId,
  })
  if (followError && followError.code !== '23505') {
    return {
      error: 'Failed to accept friend request',
      code: 'follow_create_failed',
      details: followError.message,
      status: 500,
    }
  }

  const { error: reverseFollowError } = await supabase.from('follows').insert({
    follower_id: viewerId,
    following_id: followRequest.requester_id,
  })
  if (reverseFollowError && reverseFollowError.code !== '23505') {
    return {
      error: 'Failed to accept friend request',
      code: 'reverse_follow_create_failed',
      details: reverseFollowError.message,
      status: 500,
    }
  }

  if (isBrokenPrefsGate) {
    await supabase.from('notifications').insert({
      user_id: followRequest.requester_id,
      type: 'follow_accepted',
      title: 'Friend Request Accepted',
      content: 'Your friend request was accepted',
      summary: 'Friend request accepted',
      related_user_id: viewerId,
      priority: 'normal',
      is_read: false,
    })
  }

  return {
    success: true,
    kind: 'friend' as const,
    action: 'request_accepted',
    usedPrefsFallback: isBrokenPrefsGate,
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await ProductionAuthService.authenticateRequest(request)
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error, code: 'unauthorized' },
        { status: authResult.status }
      )
    }

    const { user, supabase } = authResult
    const body = await request.json()
    const action = String(body.action || '') as RelationshipAction
    const targetAccountId = body.targetAccountId ? String(body.targetAccountId) : null
    const targetUserId = body.targetUserId ? String(body.targetUserId) : null
    const forceKind = (body.intent || body.kind || 'auto') as RelationshipKind | 'auto'

    if (!action) {
      return NextResponse.json(
        { error: 'action is required', code: 'validation_error' },
        { status: 400 }
      )
    }

    if (action === 'check') {
      const target = await loadRelationshipTarget({
        supabase,
        targetAccountId,
        targetUserId,
        forceKind,
      })
      if ('error' in target) {
        return NextResponse.json(
          { error: target.error, code: target.code },
          { status: target.status }
        )
      }

      if (target.kind === 'follow' && target.accountId) {
        const status = await getFollowRelationship(supabase, user.id, target.accountId)
        return NextResponse.json({ ...status, target })
      }

      if (!target.ownerUserId) {
        return NextResponse.json(
          { error: 'Target user not found', code: 'not_found' },
          { status: 404 }
        )
      }

      const status = await getFriendRelationship(supabase, user.id, target.ownerUserId)
      return NextResponse.json({ ...status, target })
    }

    if (action === 'follow' || action === 'unfollow') {
      const target = await loadRelationshipTarget({
        supabase,
        targetAccountId,
        targetUserId,
        forceKind: 'follow',
      })
      if ('error' in target) {
        return NextResponse.json(
          { error: target.error, code: target.code },
          { status: target.status }
        )
      }

      if (!target.accountId) {
        return NextResponse.json(
          {
            error: 'Follow targets must be an artist, venue, or organization account',
            code: 'not_followable',
          },
          { status: 400 }
        )
      }

      if (target.ownerUserId === user.id) {
        return NextResponse.json(
          { error: 'Cannot follow your own account', code: 'self_follow' },
          { status: 400 }
        )
      }

      const result =
        action === 'follow'
          ? await followAccount(supabase, user.id, target.accountId)
          : await unfollowAccount(supabase, user.id, target.accountId)

      if ('error' in result) {
        return NextResponse.json(
          { error: result.error, code: result.code, details: result.details },
          { status: result.status }
        )
      }

      return NextResponse.json({ ...result, target })
    }

    if (action === 'friend_request') {
      const target = await loadRelationshipTarget({
        supabase,
        targetAccountId,
        targetUserId,
        forceKind: 'friend',
      })
      if ('error' in target) {
        return NextResponse.json(
          { error: target.error, code: target.code },
          { status: target.status }
        )
      }
      if (!target.ownerUserId) {
        return NextResponse.json(
          { error: 'Target user not found', code: 'not_found' },
          { status: 404 }
        )
      }

      const result = await sendFriendRequest(supabase, user.id, target.ownerUserId)
      if ('error' in result) {
        return NextResponse.json(
          { error: result.error, code: result.code, details: (result as any).details },
          { status: result.status }
        )
      }
      return NextResponse.json({ ...result, target })
    }

    if (action === 'accept' || action === 'reject') {
      if (!targetUserId) {
        return NextResponse.json(
          { error: 'targetUserId is required', code: 'validation_error' },
          { status: 400 }
        )
      }

      if (action === 'accept') {
        const result = await acceptFriendRequest(supabase, user.id, targetUserId)
        if ('error' in result) {
          return NextResponse.json(
            { error: result.error, code: result.code, details: (result as any).details },
            { status: result.status }
          )
        }
        return NextResponse.json(result)
      }

      const { data: updated, error } = await supabase
        .from('follow_requests')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('target_id', user.id)
        .eq('requester_id', targetUserId)
        .eq('status', 'pending')
        .select('id')

      if (error) {
        return NextResponse.json(
          { error: 'Failed to reject friend request', code: 'reject_failed', details: error.message },
          { status: 500 }
        )
      }
      if (!updated?.length) {
        return NextResponse.json(
          { error: 'Friend request not found', code: 'not_found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, kind: 'friend', action: 'request_rejected' })
    }

    if (action === 'cancel' || action === 'unfriend') {
      if (!targetUserId) {
        return NextResponse.json(
          { error: 'targetUserId is required', code: 'validation_error' },
          { status: 400 }
        )
      }

      await Promise.all([
        supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetUserId),
        supabase
          .from('follows')
          .delete()
          .eq('follower_id', targetUserId)
          .eq('following_id', user.id),
      ])

      await supabase
        .from('follow_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .or(
          `and(requester_id.eq.${user.id},target_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},target_id.eq.${user.id})`
        )

      return NextResponse.json({
        success: true,
        kind: 'friend',
        action: action === 'unfriend' ? 'unfriended' : 'request_cancelled',
      })
    }

    return NextResponse.json(
      {
        error:
          'Invalid action. Use follow, unfollow, friend_request, accept, reject, cancel, unfriend, or check',
        code: 'invalid_action',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Relationship API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'internal_error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetAccountId = searchParams.get('targetAccountId')
  const targetUserId = searchParams.get('targetUserId')
  const intent = (searchParams.get('intent') || 'auto') as RelationshipKind | 'auto'

  const authResult = await ProductionAuthService.authenticateRequest(request)
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error, code: 'unauthorized' },
      { status: authResult.status }
    )
  }

  const { user, supabase } = authResult
  const target = await loadRelationshipTarget({
    supabase,
    targetAccountId,
    targetUserId,
    forceKind: intent,
  })
  if ('error' in target) {
    return NextResponse.json(
      { error: target.error, code: target.code },
      { status: target.status }
    )
  }

  if (target.kind === 'follow' && target.accountId) {
    const status = await getFollowRelationship(supabase, user.id, target.accountId)
    return NextResponse.json({ ...status, target })
  }

  if (!target.ownerUserId) {
    return NextResponse.json(
      { error: 'Target user not found', code: 'not_found' },
      { status: 404 }
    )
  }

  const status = await getFriendRelationship(supabase, user.id, target.ownerUserId)
  return NextResponse.json({ ...status, target })
}
