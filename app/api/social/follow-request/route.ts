import { NextRequest, NextResponse } from 'next/server'
import { ProductionAuthService } from '@/lib/auth/production-auth'

export async function POST(request: NextRequest) {
  try {
    const authResult = await ProductionAuthService.authenticateRequest(request)
    
    if ('error' in authResult) {
      console.error('❌ Authentication failed:', authResult.error)
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { user, supabase } = authResult

    const { targetUserId, action } = await request.json()

    if (!targetUserId || !action) {
      return NextResponse.json(
        { error: 'Target user ID and action are required' },
        { status: 400 }
      )
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'Cannot send follow request to yourself' },
        { status: 400 }
      )
    }

    if (action === 'send') {
      // Check if follow request already exists
      const { data: existingRequest } = await supabase
        .from('follow_requests')
        .select('id, status')
        .eq('requester_id', user.id)
        .eq('target_id', targetUserId)
        .single()

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          return NextResponse.json(
            { error: 'Follow request already sent' },
            { status: 400 }
          )
        } else if (existingRequest.status === 'accepted') {
          return NextResponse.json(
            { error: 'Already following this user' },
            { status: 400 }
          )
        }
      }

      // Check if already following
      const { data: existingFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single()

      if (existingFollow) {
        return NextResponse.json(
          { error: 'Already following this user' },
          { status: 400 }
        )
      }

      // Create follow request if the table exists; otherwise gracefully follow directly
      const insertResult = await supabase
        .from('follow_requests')
        .insert({
          requester_id: user.id,
          target_id: targetUserId,
          status: 'pending'
        })

      if (insertResult.error) {
        const code = insertResult.error.code
        const message = insertResult.error.message || ''
        const isMissingTable = code === '42P01' || /relation .*follow_requests.* does not exist/i.test(message)

        if (!isMissingTable) {
          console.error('Error creating follow request:', insertResult.error)
          return NextResponse.json(
            { error: 'Failed to send follow request' },
            { status: 500 }
          )
        }

        // Fallback: directly create follow when follow_requests table is absent
        const followInsert = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: targetUserId
          })
          .select('id')
          .single()

        if (followInsert.error) {
          // 23505 = unique_violation → already followed
          if (followInsert.error.code === '23505') {
            return NextResponse.json({
              success: true,
              action: 'already_following',
              message: 'Already following this user'
            })
          }

          console.error('Error creating direct follow:', followInsert.error)
          return NextResponse.json(
            { error: 'Failed to follow user' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          action: 'follow_created',
          message: 'Now following this user'
        })
      }

      // Create in-app notification for the recipient
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: targetUserId,
          type: 'follow_request',
          title: 'New Follow Request',
          content: 'You have received a new follow request',
          summary: 'New follow request received',
          related_user_id: user.id,
          priority: 'normal',
          is_read: false
        })

      if (notificationError) {
        console.error('Failed to create follow request notification:', notificationError)
        // Don't fail the follow request if notification creation fails
        // Log the error but continue
      } else {
        console.log('Follow request notification created successfully')
      }

      return NextResponse.json({ 
        success: true, 
        action: 'request_sent',
        message: 'Follow request sent successfully'
      })

    } else if (action === 'accept') {
      // Check if user is the target of the request
      const { data: followRequest } = await supabase
        .from('follow_requests')
        .select('id, requester_id')
        .eq('target_id', user.id)
        .eq('requester_id', targetUserId)
        .eq('status', 'pending')
        .single()

      if (!followRequest) {
        return NextResponse.json(
          { error: 'Follow request not found' },
          { status: 404 }
        )
      }

      // Accept the request by creating a follow relationship
      const { error: followError } = await supabase
        .from('follows')
        .insert({
          follower_id: followRequest.requester_id,
          following_id: user.id
        })

      if (followError) {
        console.error('Error creating follow relationship:', followError)
        return NextResponse.json(
          { error: 'Failed to accept follow request' },
          { status: 500 }
        )
      }

      // Update the follow request status
      const { error: updateError } = await supabase
        .from('follow_requests')
        .update({ status: 'accepted' })
        .eq('id', followRequest.id)

      if (updateError) {
        console.error('Error updating follow request:', updateError)
      }

      return NextResponse.json({ 
        success: true, 
        action: 'request_accepted',
        message: 'Follow request accepted'
      })

    } else if (action === 'reject') {
      // Reject the follow request
      const { error } = await supabase
        .from('follow_requests')
        .update({ status: 'rejected' })
        .eq('target_id', user.id)
        .eq('requester_id', targetUserId)
        .eq('status', 'pending')

      if (error) {
        console.error('Error rejecting follow request:', error)
        return NextResponse.json(
          { error: 'Failed to reject follow request' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        action: 'request_rejected',
        message: 'Follow request rejected'
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "send", "accept", or "reject"' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Follow request API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
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
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { user, supabase } = authResult

    // Check follow request / relationship status
    if (action === 'check' && targetUserId) {
      const { data: request } = await supabase
        .from('follow_requests')
        .select('id, status')
        .eq('requester_id', user.id)
        .eq('target_id', targetUserId)
        .single()

      const { data: follow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single()

      const { data: reverseFollow } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', targetUserId)
        .eq('following_id', user.id)
        .single()

      const isFollowing = !!follow
      const isFollowedBy = !!reverseFollow

      let relationship: 'none' | 'pending' | 'following' | 'friends' = 'none'
      if (isFollowing && isFollowedBy) relationship = 'friends'
      else if (isFollowing) relationship = 'following'
      else if (request?.status === 'pending') relationship = 'pending'

      return NextResponse.json({ 
        hasRequest: !!request,
        requestStatus: request?.status || null,
        isFollowing,
        isFollowedBy,
        relationship
      })
    }

    // Get pending follow requests for the current user
    if (action === 'pending') {
      const { data: requests, error } = await supabase
        .from('follow_requests')
        .select(`
          id,
          requester_id,
          created_at,
          profiles:requester_id (
            id,
            username,
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('target_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching follow requests:', error)
        return NextResponse.json(
          { error: 'Failed to fetch follow requests' },
          { status: 500 }
        )
      }

      return NextResponse.json({ requests })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Follow request fetch API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
