import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user)
      return NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 })

    const body = await request.json()
    const { target_user_id } = body

    if (!target_user_id)
      return NextResponse.json(
        { error: 'target_user_id is required', code: 'validation_error' },
        { status: 400 }
      )

    if (target_user_id === user.id)
      return NextResponse.json(
        { error: 'Cannot send request to yourself', code: 'self_request' },
        { status: 400 }
      )

    const { data: existingFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', target_user_id)
      .maybeSingle()

    if (existingFollow) {
      return NextResponse.json({
        error: 'Already following this user',
        code: 'already_following',
        details: 'You are already connected to this user',
      }, { status: 409 })
    }

    const { data: existingRequest } = await supabase
      .from('follow_requests')
      .select('id, status')
      .eq('requester_id', user.id)
      .eq('target_id', target_user_id)
      .maybeSingle()

    if (existingRequest?.status === 'pending') {
      return NextResponse.json({
        success: true,
        message: 'Connection request already pending',
        action: 'request_pending',
      })
    }

    if (existingRequest?.status === 'accepted') {
      return NextResponse.json({
        error: 'Already following this user',
        code: 'already_accepted',
      }, { status: 409 })
    }

    // Re-send after reject/cancel: delete + insert so notify trigger fires on INSERT
    if (existingRequest && (existingRequest.status === 'rejected' || existingRequest.status === 'cancelled')) {
      const { error: deleteError } = await supabase
        .from('follow_requests')
        .delete()
        .eq('id', existingRequest.id)

      if (deleteError) {
        console.error('Error clearing previous follow request:', deleteError)
        return NextResponse.json({
          error: 'Failed to create connection request',
          code: 'reset_failed',
          details: deleteError.message,
        }, { status: 500 })
      }
    }

    const { error: requestError } = await supabase
      .from('follow_requests')
      .insert({
        requester_id: user.id,
        target_id: target_user_id,
        status: 'pending',
      })

    if (requestError) {
      const code = requestError.code
      const message = requestError.message || ''
      const isMissingTable =
        code === '42P01' || /relation .*follow_requests.* does not exist/i.test(message)

      if (!isMissingTable) {
        console.error('Error creating follow request:', requestError)
        return NextResponse.json({
          error: 'Failed to create connection request',
          code: 'insert_failed',
          details: requestError.message,
        }, { status: 500 })
      }

      const { error: followError } = await supabase
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: target_user_id,
        })

      if (followError) {
        console.error('Error creating follow:', followError)
        return NextResponse.json({
          error: 'Failed to create connection',
          code: 'follow_insert_failed',
          details: followError.message,
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Now following this user',
        action: 'follow_created',
      })
    }

    // Rely on trigger_follow_request_notification for notify-on-insert (no duplicate insert)
    return NextResponse.json({
      success: true,
      message: 'Connection request sent successfully',
      action: 'request_created',
    })
  } catch (error) {
    console.error('Simple connection request API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      code: 'internal_error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
