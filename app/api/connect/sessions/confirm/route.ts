import { NextRequest, NextResponse } from 'next/server'
import { jsonError, readJson, requireApiUser } from '@/lib/api/route-helpers'
import { logConnectTelemetryEvent } from '@/lib/connect/telemetry'
import { confirmConnectSessionRequestSchema } from '@tourify/api-contracts'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response

    const { user, supabase } = authResult.auth
    const parsedBody = await readJson(request, confirmConnectSessionRequestSchema, 'invalid_request', 'Invalid connect confirm payload')
    if (!parsedBody.success) return parsedBody.response

    const { data: session, error: sessionError } = await supabase
      .from('connect_sessions')
      .select('id, sharer_user_id, claimed_by_user_id, expires_at, status, last_device_context')
      .eq('id', parsedBody.data.connectSessionId)
      .single()

    if (sessionError || !session)
      return jsonError({
        status: 404,
        code: 'session_not_found',
        message: 'Connect session not found',
        retryable: false,
      })

    if (session.claimed_by_user_id !== user.id)
      return jsonError({
        status: 403,
        code: 'session_not_claimed_by_user',
        message: 'You must claim this connect session before confirming',
        retryable: false,
      })

    if (new Date(session.expires_at).getTime() <= Date.now())
      return jsonError({
        status: 410,
        code: 'session_expired',
        message: 'Connect session has expired',
        retryable: false,
      })

    const followRequestResult = await sendFollowRequestIfNeeded({
      supabase,
      requesterId: user.id,
      targetUserId: session.sharer_user_id,
    })

    if (!followRequestResult.success)
      return jsonError({
        status: followRequestResult.statusCode ?? 500,
        code: followRequestResult.code ?? 'follow_request_failed',
        message: followRequestResult.message ?? 'Failed to send follow request',
        retryable: followRequestResult.retryable ?? true,
      })

    const sessionDeviceContext =
      session.last_device_context && typeof session.last_device_context === 'object'
        ? (session.last_device_context as { platform?: unknown })
        : null
    const telemetryPlatform =
      String(parsedBody.data.deviceContext?.platform || '') ||
      String(sessionDeviceContext?.platform || 'unknown')

    await supabase
      .from('connect_sessions')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    await logConnectTelemetryEvent({
      eventName: 'connect_session_confirmed',
      connectSessionId: session.id,
      platform: telemetryPlatform,
      userId: user.id,
      metadata: {
        relationshipStatus: followRequestResult.relationshipStatus,
        hasFollowRequestId: Boolean(followRequestResult.followRequestId),
      },
    })

    return NextResponse.json({
      success: true,
      followRequestId: followRequestResult.followRequestId,
      relationshipStatus: followRequestResult.relationshipStatus,
    })
  } catch (error) {
    console.error('[Connect Sessions Confirm API] POST error:', error)
    return jsonError({
      status: 500,
      code: 'internal_error',
      message: 'Internal server error',
      retryable: true,
    })
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
