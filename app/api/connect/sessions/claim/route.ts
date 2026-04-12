import { NextRequest, NextResponse } from 'next/server'
import { jsonError, readJson, requireApiUser } from '@/lib/api/route-helpers'
import { hashConnectSessionToken, verifyConnectSessionToken } from '@/lib/connect/connect-session-token'
import { logConnectTelemetryEvent } from '@/lib/connect/telemetry'
import { claimConnectSessionRequestSchema } from '@tourify/api-contracts'

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response

    const { user, supabase } = authResult.auth
    const parsedBody = await readJson(request, claimConnectSessionRequestSchema, 'invalid_request', 'Invalid connect claim payload')
    if (!parsedBody.success) return parsedBody.response

    const verification = verifyConnectSessionToken(parsedBody.data.ephemeralToken)
    if (verification.errorCode || !verification.payload) {
      await logConnectTelemetryEvent({
        eventName: 'connect_session_claim_rejected',
        platform: String(parsedBody.data.deviceContext?.platform || 'unknown'),
        userId: user.id,
        metadata: {
          reason: verification.errorCode ?? 'invalid_token',
        },
      })

      return jsonError({
        status: 400,
        code: verification.errorCode ?? 'invalid_token',
        message: 'Invalid or expired connect token',
        retryable: false,
      })
    }

    if (verification.payload.sharerUserId === user.id)
      return jsonError({
        status: 400,
        code: 'cannot_claim_own_session',
        message: 'Cannot claim your own connect session',
        retryable: false,
      })

    const tokenHash = hashConnectSessionToken(parsedBody.data.ephemeralToken)
    const { data: session, error: sessionError } = await supabase
      .from('connect_sessions')
      .select('id, sharer_user_id, one_time_claim, claimed_by_user_id, claimed_at, expires_at, status, profile_preview')
      .eq('id', verification.payload.sessionId)
      .eq('token_hash', tokenHash)
      .single()

    if (sessionError || !session)
      return jsonError({
        status: 404,
        code: 'session_not_found',
        message: 'Connect session not found',
        retryable: false,
      })

    if (new Date(session.expires_at).getTime() <= Date.now())
      return jsonError({
        status: 410,
        code: 'session_expired',
        message: 'Connect session has expired',
        retryable: false,
      })

    if (session.status === 'revoked')
      return jsonError({
        status: 410,
        code: 'session_revoked',
        message: 'Connect session is no longer valid',
        retryable: false,
      })

    const hasExistingClaim = Boolean(session.claimed_at && session.claimed_by_user_id)
    const isDifferentClaimer = session.claimed_by_user_id && session.claimed_by_user_id !== user.id
    if (session.one_time_claim && hasExistingClaim && isDifferentClaimer)
      return jsonError({
        status: 409,
        code: 'already_claimed',
        message: 'Connect session was already claimed',
        retryable: false,
      })

    if (!session.claimed_by_user_id) {
      const { error: claimUpdateError } = await supabase
        .from('connect_sessions')
        .update({
          claimed_by_user_id: user.id,
          claimed_at: new Date().toISOString(),
          status: 'claimed',
          last_transport_proof: parsedBody.data.transportProof ?? null,
          last_device_context: parsedBody.data.deviceContext ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id)
        .is('claimed_by_user_id', null)

      if (claimUpdateError)
        return jsonError({
          status: 500,
          code: 'claim_update_failed',
          message: 'Failed to claim connect session',
          retryable: true,
        })
    }

    const relationshipStatus = await getRelationshipStatus({
      supabase,
      currentUserId: user.id,
      targetUserId: session.sharer_user_id,
    })

    await logConnectTelemetryEvent({
      eventName: 'connect_session_claimed',
      connectSessionId: session.id,
      platform: String(parsedBody.data.deviceContext?.platform || 'unknown'),
      userId: user.id,
      metadata: {
        relationshipStatus,
      },
    })

    return NextResponse.json({
      connectSessionId: session.id,
      profilePreview: session.profile_preview,
      relationshipStatus,
      requiresConfirm: true,
    })
  } catch (error) {
    console.error('[Connect Sessions Claim API] POST error:', error)
    return jsonError({
      status: 500,
      code: 'internal_error',
      message: 'Internal server error',
      retryable: true,
    })
  }
}

async function getRelationshipStatus({
  supabase,
  currentUserId,
  targetUserId,
}: {
  supabase: any
  currentUserId: string
  targetUserId: string
}) {
  const [{ data: outboundFollow }, { data: outboundRequest }, { data: inboundRequest }] = await Promise.all([
    supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .maybeSingle(),
    supabase
      .from('follow_requests')
      .select('id')
      .eq('requester_id', currentUserId)
      .eq('target_id', targetUserId)
      .eq('status', 'pending')
      .maybeSingle(),
    supabase
      .from('follow_requests')
      .select('id')
      .eq('requester_id', targetUserId)
      .eq('target_id', currentUserId)
      .eq('status', 'pending')
      .maybeSingle(),
  ])

  if (outboundFollow)
    return 'following'

  if (outboundRequest)
    return 'pending_outbound'

  if (inboundRequest)
    return 'pending_inbound'

  return 'none'
}
