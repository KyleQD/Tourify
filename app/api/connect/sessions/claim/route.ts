import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { hashConnectSessionToken, verifyConnectSessionToken } from '@/lib/connect/connect-session-token'

const claimSessionSchema = z.object({
  ephemeralToken: z.string().min(20),
  transportProof: z.record(z.string(), z.unknown()).optional(),
  deviceContext: z.record(z.string(), z.unknown()).optional(),
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
    const parsedBody = claimSessionSchema.safeParse(await request.json())
    if (!parsedBody.success)
      return NextResponse.json<ApiErrorShape>({
        error: {
          code: 'invalid_request',
          message: 'Invalid connect claim payload',
          retryable: false,
        },
      }, { status: 400 })

    const verification = verifyConnectSessionToken(parsedBody.data.ephemeralToken)
    if (verification.errorCode || !verification.payload)
      return NextResponse.json<ApiErrorShape>({
        error: {
          code: verification.errorCode ?? 'invalid_token',
          message: 'Invalid or expired connect token',
          retryable: false,
        },
      }, { status: 400 })

    if (verification.payload.sharerUserId === user.id)
      return NextResponse.json<ApiErrorShape>({
        error: {
          code: 'cannot_claim_own_session',
          message: 'Cannot claim your own connect session',
          retryable: false,
        },
      }, { status: 400 })

    const tokenHash = hashConnectSessionToken(parsedBody.data.ephemeralToken)
    const { data: session, error: sessionError } = await supabase
      .from('connect_sessions')
      .select('id, sharer_user_id, one_time_claim, claimed_by_user_id, claimed_at, expires_at, status, profile_preview')
      .eq('id', verification.payload.sessionId)
      .eq('token_hash', tokenHash)
      .single()

    if (sessionError || !session)
      return NextResponse.json<ApiErrorShape>({
        error: {
          code: 'session_not_found',
          message: 'Connect session not found',
          retryable: false,
        },
      }, { status: 404 })

    if (new Date(session.expires_at).getTime() <= Date.now())
      return NextResponse.json<ApiErrorShape>({
        error: {
          code: 'session_expired',
          message: 'Connect session has expired',
          retryable: false,
        },
      }, { status: 410 })

    if (session.status === 'revoked')
      return NextResponse.json<ApiErrorShape>({
        error: {
          code: 'session_revoked',
          message: 'Connect session is no longer valid',
          retryable: false,
        },
      }, { status: 410 })

    const hasExistingClaim = Boolean(session.claimed_at && session.claimed_by_user_id)
    const isDifferentClaimer = session.claimed_by_user_id && session.claimed_by_user_id !== user.id
    if (session.one_time_claim && hasExistingClaim && isDifferentClaimer)
      return NextResponse.json<ApiErrorShape>({
        error: {
          code: 'already_claimed',
          message: 'Connect session was already claimed',
          retryable: false,
        },
      }, { status: 409 })

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
        return NextResponse.json<ApiErrorShape>({
          error: {
            code: 'claim_update_failed',
            message: 'Failed to claim connect session',
            retryable: true,
          },
        }, { status: 500 })
    }

    const relationshipStatus = await getRelationshipStatus({
      supabase,
      currentUserId: user.id,
      targetUserId: session.sharer_user_id,
    })

    return NextResponse.json({
      connectSessionId: session.id,
      profilePreview: session.profile_preview,
      relationshipStatus,
      requiresConfirm: true,
    })
  } catch (error) {
    console.error('[Connect Sessions Claim API] POST error:', error)
    return NextResponse.json<ApiErrorShape>({
      error: {
        code: 'internal_error',
        message: 'Internal server error',
        retryable: true,
      },
    }, { status: 500 })
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
