import { NextRequest, NextResponse } from 'next/server'
import { ProductionAuthService } from '@/lib/auth/production-auth'
import { presentFollowRequests } from '@/lib/social/follow-request-presenter'

export async function POST(request: NextRequest) {
  try {
    const authResult = await ProductionAuthService.authenticateRequest(request)

    if ('error' in authResult) {
      console.error('❌ Authentication failed:', authResult.error)
      return NextResponse.json(
        { error: authResult.error, code: 'unauthorized' },
        { status: authResult.status }
      )
    }

    const { user, supabase } = authResult
    const { targetUserId, action } = await request.json()

    if (!targetUserId || !action) {
      return NextResponse.json(
        { error: 'Target user ID and action are required', code: 'validation_error' },
        { status: 400 }
      )
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'Cannot send follow request to yourself', code: 'self_request' },
        { status: 400 }
      )
    }

    if (action === 'send') {
      const { data: existingRequest } = await supabase
        .from('follow_requests')
        .select('id, status')
        .eq('requester_id', user.id)
        .eq('target_id', targetUserId)
        .maybeSingle()

      if (existingRequest?.status === 'pending') {
        return NextResponse.json(
          { error: 'Follow request already sent', code: 'already_pending' },
          { status: 400 }
        )
      }

      if (existingRequest?.status === 'accepted') {
        return NextResponse.json(
          { error: 'Already following this user', code: 'already_accepted' },
          { status: 400 }
        )
      }

      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle()

      if (existingFollow) {
        return NextResponse.json({
          error: 'Already following this user',
          code: 'already_following',
        }, { status: 400 })
      }

      // Auto-accept when the target artist persona opts in via settings.auto_accept_follows
      const { data: artistPersona } = await supabase
        .from('artist_profiles')
        .select('settings')
        .eq('user_id', targetUserId)
        .maybeSingle()

      const artistSettings =
        artistPersona?.settings && typeof artistPersona.settings === 'object'
          ? (artistPersona.settings as Record<string, unknown>)
          : null
      const shouldAutoAccept = artistSettings?.auto_accept_follows === true

      if (shouldAutoAccept) {
        if (existingRequest && (existingRequest.status === 'rejected' || existingRequest.status === 'cancelled' || existingRequest.status === 'pending')) {
          await supabase.from('follow_requests').delete().eq('id', existingRequest.id)
        }

        const followInsert = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          })
          .select('id')
          .single()

        if (followInsert.error) {
          if (followInsert.error.code === '23505') {
            return NextResponse.json({
              success: true,
              action: 'already_following',
              message: 'Already following this user',
            })
          }

          console.error('Error creating auto-accepted follow:', followInsert.error)
          return NextResponse.json(
            {
              error: 'Failed to follow user',
              code: 'follow_insert_failed',
              details: followInsert.error.message,
            },
            { status: 500 }
          )
        }

        await supabase.from('follow_requests').insert({
          requester_id: user.id,
          target_id: targetUserId,
          status: 'accepted',
        })

        return NextResponse.json({
          success: true,
          action: 'follow_created',
          message: 'Now following this artist',
        })
      }

      // Re-send after reject/cancel: delete + insert so notify trigger fires on INSERT
      if (existingRequest && (existingRequest.status === 'rejected' || existingRequest.status === 'cancelled')) {
        const { error: deleteError } = await supabase
          .from('follow_requests')
          .delete()
          .eq('id', existingRequest.id)

        if (deleteError) {
          console.error('Error clearing previous follow request:', deleteError)
          return NextResponse.json(
            {
              error: 'Failed to send follow request',
              code: 'reset_failed',
              details: deleteError.message,
            },
            { status: 500 }
          )
        }
      }

      const insertResult = await supabase
        .from('follow_requests')
        .insert({
          requester_id: user.id,
          target_id: targetUserId,
          status: 'pending',
        })

      if (insertResult.error) {
        const code = insertResult.error.code
        const message = insertResult.error.message || ''
        const isMissingTable =
          code === '42P01' || /relation .*follow_requests.* does not exist/i.test(message)

        if (!isMissingTable) {
          console.error('Error creating follow request:', insertResult.error)
          return NextResponse.json(
            {
              error: 'Failed to send follow request',
              code: 'insert_failed',
              details: insertResult.error.message,
            },
            { status: 500 }
          )
        }

        const followInsert = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          })
          .select('id')
          .single()

        if (followInsert.error) {
          if (followInsert.error.code === '23505') {
            return NextResponse.json({
              success: true,
              action: 'already_following',
              message: 'Already following this user',
            })
          }

          console.error('Error creating direct follow:', followInsert.error)
          return NextResponse.json(
            {
              error: 'Failed to follow user',
              code: 'follow_insert_failed',
              details: followInsert.error.message,
            },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          action: 'follow_created',
          message: 'Now following this user',
        })
      }

      // Rely on trigger_follow_request_notification (SECURITY DEFINER) for notify-on-insert.
      return NextResponse.json({
        success: true,
        action: 'request_sent',
        message: 'Follow request sent successfully',
      })
    }

    if (action === 'accept') {
      const { data: followRequest } = await supabase
        .from('follow_requests')
        .select('id, requester_id')
        .eq('target_id', user.id)
        .eq('requester_id', targetUserId)
        .eq('status', 'pending')
        .maybeSingle()

      if (!followRequest) {
        return NextResponse.json(
          { error: 'Follow request not found', code: 'not_found' },
          { status: 404 }
        )
      }

      // Status update first — trigger_follow_request_accepted creates follows + follow_accepted notify.
      // Live DBs whose notification_preferences lack enable_* columns crash should_send_notification
      // (42703: prefs.enable_follows). Fall back to delete + direct follows when that happens.
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
        console.error('Error updating follow request:', updateError)
        return NextResponse.json(
          {
            error: 'Failed to accept follow request',
            code: 'accept_failed',
            details: updateError.message,
          },
          { status: 500 }
        )
      }

      if (isBrokenPrefsGate) {
        console.warn('Accept update hit broken notification prefs gate; using delete fallback', {
          code: updateError?.code,
          message: updateError?.message,
        })

        const { error: deleteError } = await supabase
          .from('follow_requests')
          .delete()
          .eq('id', followRequest.id)
          .eq('status', 'pending')

        if (deleteError) {
          console.error('Error deleting follow request after prefs-gate failure:', deleteError)
          return NextResponse.json(
            {
              error: 'Failed to accept follow request',
              code: 'accept_fallback_delete_failed',
              details: deleteError.message,
            },
            { status: 500 }
          )
        }
      }

      // Ensure follow exists even if trigger is missing (idempotent)
      const { error: followError } = await supabase.from('follows').insert({
        follower_id: followRequest.requester_id,
        following_id: user.id,
      })

      if (followError && followError.code !== '23505') {
        console.error('Error creating follow relationship:', followError)
        return NextResponse.json(
          {
            error: 'Failed to accept follow request',
            code: 'follow_create_failed',
            details: followError.message,
          },
          { status: 500 }
        )
      }

      // Mutual follow so accepted connections unlock open DMs
      const { error: reverseFollowError } = await supabase.from('follows').insert({
        follower_id: user.id,
        following_id: followRequest.requester_id,
      })

      if (reverseFollowError && reverseFollowError.code !== '23505') {
        console.error('Error creating reverse follow relationship:', reverseFollowError)
        return NextResponse.json(
          {
            error: 'Failed to accept follow request',
            code: 'reverse_follow_create_failed',
            details: reverseFollowError.message,
          },
          { status: 500 }
        )
      }

      if (isBrokenPrefsGate) {
        // Best-effort acceptance notify (trigger skipped when we delete instead of update)
        await supabase.from('notifications').insert({
          user_id: followRequest.requester_id,
          type: 'follow_accepted',
          title: 'Follow Request Accepted',
          content: 'Your follow request was accepted',
          summary: 'Follow request accepted',
          related_user_id: user.id,
          priority: 'normal',
          is_read: false,
        })
      }

      return NextResponse.json({
        success: true,
        action: 'request_accepted',
        message: 'Follow request accepted',
        usedPrefsFallback: isBrokenPrefsGate,
      })
    }

    if (action === 'cancel' || action === 'remove') {
      const { data: asRequester } = await supabase
        .from('follow_requests')
        .select('id, requester_id, target_id, status')
        .eq('requester_id', user.id)
        .eq('target_id', targetUserId)
        .in('status', action === 'remove' ? ['accepted', 'pending'] : ['pending', 'accepted'])
        .maybeSingle()

      const { data: asTarget } = asRequester
        ? { data: null }
        : await supabase
            .from('follow_requests')
            .select('id, requester_id, target_id, status')
            .eq('requester_id', targetUserId)
            .eq('target_id', user.id)
            .in('status', action === 'remove' ? ['accepted', 'pending'] : ['pending', 'accepted'])
            .maybeSingle()

      const followRequest = asRequester || asTarget

      if (!followRequest) {
        // Still clear follow edges on remove even if request row is missing
        if (action === 'remove') {
          const [{ error: unfollowErrorA }, { error: unfollowErrorB }] = await Promise.all([
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

          const unfollowError = unfollowErrorA || unfollowErrorB
          if (unfollowError) {
            console.error('Error removing follow edges:', unfollowError)
            return NextResponse.json(
              {
                error: 'Failed to remove connection',
                code: 'unfollow_failed',
                details: unfollowError.message,
              },
              { status: 500 }
            )
          }

          return NextResponse.json({
            success: true,
            action: 'connection_removed',
            message: 'Connection removed',
          })
        }

        return NextResponse.json(
          { error: 'Follow request not found', code: 'not_found' },
          { status: 404 }
        )
      }

      if (followRequest.status === 'pending' && followRequest.requester_id !== user.id) {
        return NextResponse.json(
          { error: 'Only the requester can cancel a pending request', code: 'forbidden' },
          { status: 403 }
        )
      }

      const otherUserId =
        followRequest.requester_id === user.id
          ? followRequest.target_id
          : followRequest.requester_id

      if (followRequest.status === 'accepted' || action === 'remove') {
        const [{ error: unfollowErrorA }, { error: unfollowErrorB }] = await Promise.all([
          supabase
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', otherUserId),
          supabase
            .from('follows')
            .delete()
            .eq('follower_id', otherUserId)
            .eq('following_id', user.id),
        ])

        const unfollowError = unfollowErrorA || unfollowErrorB
        if (unfollowError) {
          console.error('Error removing follow edges:', unfollowError)
          return NextResponse.json(
            {
              error: 'Failed to remove connection',
              code: 'unfollow_failed',
              details: unfollowError.message,
            },
            { status: 500 }
          )
        }
      }

      const { error: updateError } = await supabase
        .from('follow_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', followRequest.id)

      if (updateError) {
        console.error('Error cancelling follow request:', updateError)
        return NextResponse.json(
          {
            error: 'Failed to cancel connection',
            code: 'cancel_failed',
            details: updateError.message,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: followRequest.status === 'accepted' || action === 'remove'
          ? 'connection_removed'
          : 'request_cancelled',
        message:
          followRequest.status === 'accepted' || action === 'remove'
            ? 'Connection removed'
            : 'Follow request cancelled',
      })
    }

    if (action === 'reject') {
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
        console.error('Error rejecting follow request:', error)
        return NextResponse.json(
          {
            error: 'Failed to reject follow request',
            code: 'reject_failed',
            details: error.message,
          },
          { status: 500 }
        )
      }

      if (!updated || updated.length === 0) {
        return NextResponse.json(
          { error: 'Follow request not found', code: 'not_found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        action: 'request_rejected',
        message: 'Follow request rejected',
      })
    }

    return NextResponse.json(
      {
        error: 'Invalid action. Use "send", "accept", "reject", "cancel", or "remove"',
        code: 'invalid_action',
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Follow request API error:', error)
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
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const targetUserId = searchParams.get('targetUserId')

    const authResult = await ProductionAuthService.authenticateRequest(request)

    if ('error' in authResult) {
      console.error('❌ Authentication failed:', authResult.error)
      return NextResponse.json(
        { error: authResult.error, code: 'unauthorized' },
        { status: authResult.status }
      )
    }

    const { user, supabase } = authResult

    if (action === 'check' && targetUserId) {
      const { data: requestRow } = await supabase
        .from('follow_requests')
        .select('id, status')
        .eq('requester_id', user.id)
        .eq('target_id', targetUserId)
        .maybeSingle()

      const { data: follow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .maybeSingle()

      const { data: reverseFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', targetUserId)
        .eq('following_id', user.id)
        .maybeSingle()

      const isFollowing = !!follow
      const isFollowedBy = !!reverseFollow

      let relationship: 'none' | 'pending' | 'following' | 'friends' = 'none'
      if (isFollowing && isFollowedBy) relationship = 'friends'
      else if (isFollowing) relationship = 'following'
      else if (requestRow?.status === 'pending') relationship = 'pending'

      return NextResponse.json({
        hasRequest: !!requestRow,
        requestStatus: requestRow?.status || null,
        isFollowing,
        isFollowedBy,
        relationship,
      })
    }

    if (action === 'pending') {
      // Two-query pattern: follow_requests.requester_id FK → auth.users, not profiles.
      // PostgREST cannot embed profiles through that FK.
      const { data: rows, error } = await supabase
        .from('follow_requests')
        .select('id, requester_id, created_at')
        .eq('target_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching follow requests:', error)
        return NextResponse.json(
          {
            error: 'Failed to fetch follow requests',
            code: 'fetch_failed',
            details: error.message,
          },
          { status: 500 }
        )
      }

      const followRequestRows = (rows || []) as Array<{ id: string; requester_id: string; created_at: string }>
      const requesterIds = [...new Set(followRequestRows.map((row) => row.requester_id))]
      let profiles: Array<{
        id: string
        username: string
        full_name: string | null
        avatar_url: string | null
        is_verified?: boolean | null
      }> = []

      if (requesterIds.length > 0) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, is_verified')
          .in('id', requesterIds)

        if (profileError) {
          console.error('Error fetching requester profiles:', profileError)
          return NextResponse.json(
            {
              error: 'Failed to fetch follow requests',
              code: 'profile_fetch_failed',
              details: profileError.message,
            },
            { status: 500 }
          )
        }

        profiles = profileRows || []
      }

      const requests = presentFollowRequests({
        rows: rows || [],
        profiles,
      })

      return NextResponse.json({ requests })
    }

    return NextResponse.json(
      { error: 'Invalid action', code: 'invalid_action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Follow request fetch API error:', error)
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
