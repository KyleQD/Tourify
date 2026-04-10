import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

const confirmSessionSchema = z.object({
  connectSessionId: z.string().uuid(),
  intent: z.literal('send_follow_request'),
})

interface ApiErrorShape {
  error: {
    code: string
    message: string
    retryable: boolean
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    if (!authResult)
      return NextResponse.json<ApiErrorShape>({
        error: {
          code: 'unauthorized',
          message: 'Authentication required',
          retryable: false,
        },
      }, { status: 401 })

    const { user, supabase } = authResult
    const parsedBody = confirmSessionSchema.safeParse(await request.json())
    if (!parsedBody.success)
      return NextResponse.json<ApiErrorShape>({
        error: {
          code: 'invalid_request',
          message: 'Invalid connect confirm payload',
          retryable: false,
        },
      }, { status: 400 })

    const { data: session, error: sessionError } = await supabase
      .from('connect_sessions')
      .select('id, sharer_user_id, claimed_by_user_id, expires_at, status')
      .eq('id', parsedBody.data.connectSessionId)
      .single()

    if (sessionError || !session)
      return NextResponse.json<ApiErrorShape>({
        error: {
          code: 'session_not_found',
          message: 'Connect session not found',
          retryable: false,
        },
      }, { status: 404 })

    if (session.claimed_by_user_id !== user.id)
      return NextResponse.json<ApiErrorShape>({
        error: {
          code: 'session_not_claimed_by_user',
          message: 'You must claim this connect session before confirming',
          retryable: false,
        },
      }, { status: 403 })

    if (new Date(session.expires_at).getTime() <= Date.now())
      return NextResponse.json<ApiErrorShape>({
        error: {
          code: 'session_expired',
          message: 'Connect session has expired',
          retryable: false,
        },
      }, { status: 410 })

    const followRequestResult = await sendFollowRequestIfNeeded({
      supabase,
      requesterId: user.id,
      targetUserId: session.sharer_user_id,
    })

    if (!followRequestResult.success)
      return NextResponse.json<ApiErrorShape>({
        error: {
          code: followRequestResult.code ?? 'follow_request_failed',
          message: followRequestResult.message ?? 'Failed to send follow request',
          retryable: followRequestResult.retryable ?? true,
        },
      }, { status: followRequestResult.statusCode ?? 500 })

    await supabase
      .from('connect_sessions')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    return NextResponse.json({
      success: true,
      followRequestId: followRequestResult.followRequestId,
      relationshipStatus: followRequestResult.relationshipStatus,
    })
  } catch (error) {
    console.error('[Connect Sessions Confirm API] POST error:', error)
    return NextResponse.json<ApiErrorShape>({
      error: {
        code: 'internal_error',
        message: 'Internal server error',
        retryable: true,
      },
    }, { status: 500 })
  }
}

async function sendFollowRequestIfNeeded({
  supabase,
  requesterId,
  targetUserId,
}: {
  supabase: any
  requesterId: string
  targetUserId: string
}) {
  if (requesterId === targetUserId)
    return {
      success: false,
      code: 'cannot_follow_self',
      message: 'Cannot send follow request to yourself',
      retryable: false,
      statusCode: 400,
    }

  const { data: existingFollow } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', requesterId)
    .eq('following_id', targetUserId)
    .maybeSingle()

  if (existingFollow)
    return {
      success: true,
      followRequestId: null,
      relationshipStatus: 'following',
    }

  const { data: existingRequest } = await supabase
    .from('follow_requests')
    .select('id, status')
    .eq('requester_id', requesterId)
    .eq('target_id', targetUserId)
    .maybeSingle()

  if (existingRequest?.status === 'pending')
    return {
      success: true,
      followRequestId: existingRequest.id,
      relationshipStatus: 'pending_outbound',
    }

  const { data: newRequest, error: insertError } = await supabase
    .from('follow_requests')
    .insert({
      requester_id: requesterId,
      target_id: targetUserId,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError) {
    const isMissingTable = insertError.code === '42P01'
    if (isMissingTable) {
      const { error: followInsertError } = await supabase
        .from('follows')
        .insert({
          follower_id: requesterId,
          following_id: targetUserId,
        })

      if (followInsertError)
        return {
          success: false,
          code: 'follow_create_failed',
          message: 'Failed to create follow connection',
          retryable: true,
          statusCode: 500,
        }

      return {
        success: true,
        followRequestId: null,
        relationshipStatus: 'following',
      }
    }

    return {
      success: false,
      code: 'follow_request_create_failed',
      message: 'Failed to send follow request',
      retryable: true,
      statusCode: 500,
    }
  }

  return {
    success: true,
    followRequestId: newRequest.id,
    relationshipStatus: 'pending_outbound',
  }
}
