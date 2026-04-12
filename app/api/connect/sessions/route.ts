import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { jsonError, readJson, requireApiUser } from '@/lib/api/route-helpers'
import { createConnectSessionToken } from '@/lib/connect/connect-session-token'
import { logConnectTelemetryEvent } from '@/lib/connect/telemetry'

const createSessionSchema = z.object({
  handshakeMethod: z.literal('nfc_ble').default('nfc_ble'),
  oneTimeClaim: z.boolean().default(true),
  expiresInSeconds: z.number().int().min(30).max(300).default(120),
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiUser(request)
    if (!authResult.success) return authResult.response

    const { user, supabase } = authResult.auth
    const parsedBody = await readJson(request, createSessionSchema, 'invalid_request', 'Invalid connect session payload')
    if (!parsedBody.success) return parsedBody.response

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url, bio, location, profile_data, show_email, show_phone, show_location')
      .eq('id', user.id)
      .single()

    if (profileError || !profile)
      return jsonError({
        status: 404,
        code: 'profile_not_found',
        message: 'Could not load profile for connect session',
        retryable: true,
      })

    const inPersonSettings = profile.profile_data?.in_person_connect ?? {}
    if (inPersonSettings?.allowInPersonConnect === false)
      return jsonError({
        status: 403,
        code: 'connect_sharing_disabled',
        message: 'In-person connect is disabled in your privacy settings',
        retryable: false,
      })

    const tokenResult = createConnectSessionToken({
      sharerUserId: user.id,
      expiresInSeconds: parsedBody.data.expiresInSeconds,
      oneTimeClaim: parsedBody.data.oneTimeClaim,
    })

    const previewPayload = buildProfilePreview({
      userId: user.id,
      userEmail: user.email ?? null,
      profile,
    })

    const expiresAt = new Date(tokenResult.payload.exp * 1000).toISOString()
    const insertResult = await supabase
      .from('connect_sessions')
      .insert({
        id: tokenResult.payload.sessionId,
        sharer_user_id: user.id,
        token_hash: tokenResult.tokenHash,
        handshake_method: parsedBody.data.handshakeMethod,
        one_time_claim: parsedBody.data.oneTimeClaim,
        expires_at: expiresAt,
        status: 'active',
        profile_preview: previewPayload,
      })
      .select('id, expires_at')
      .single()

    if (insertResult.error) {
      const isMissingTable = insertResult.error.code === '42P01'
      if (isMissingTable)
        return jsonError({
          status: 500,
          code: 'connect_sessions_table_missing',
          message: 'Connect sessions storage is not initialized',
          retryable: false,
        })

      return jsonError({
        status: 500,
        code: 'create_session_failed',
        message: 'Failed to create connect session',
        retryable: true,
      })
    }

    await logConnectTelemetryEvent({
      eventName: 'connect_session_created',
      connectSessionId: insertResult.data.id,
      platform: 'server',
      userId: user.id,
      sessionId: tokenResult.payload.sessionId,
      metadata: {
        handshakeMethod: parsedBody.data.handshakeMethod,
        oneTimeClaim: parsedBody.data.oneTimeClaim,
      },
    })

    const claimPath = `/connect/claim?token=${encodeURIComponent(tokenResult.token)}`
    const webClaimUrl = buildAbsoluteWebClaimUrl(request, claimPath)
    const deepLinkUrl = `tourify://connect/claim?token=${encodeURIComponent(tokenResult.token)}`

    return NextResponse.json({
      connectSessionId: insertResult.data.id,
      ephemeralToken: tokenResult.token,
      expiresAt: insertResult.data.expires_at,
      claimUrl: claimPath,
      webClaimUrl,
      deepLinkUrl,
    }, { status: 201 })
  } catch (error) {
    console.error('[Connect Sessions API] POST error:', error)
    return jsonError({
      status: 500,
      code: 'internal_error',
      message: 'Internal server error',
      retryable: true,
    })
  }
}

function buildAbsoluteWebClaimUrl(request: NextRequest, claimPath: string) {
  const configuredSiteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL
  if (configuredSiteUrl) {
    try {
      const baseUrl = new URL(configuredSiteUrl)
      return new URL(claimPath, `${baseUrl.origin}/`).toString()
    } catch {
      // fall through to request-derived origin
    }
  }

  const requestUrl = new URL(request.url)
  return new URL(claimPath, `${requestUrl.origin}/`).toString()
}

function buildProfilePreview({
  userId,
  userEmail,
  profile,
}: {
  userId: string
  userEmail: string | null
  profile: any
}) {
  const connectSettings = profile.profile_data?.in_person_connect ?? {}
  const canShareEmail = Boolean(profile.show_email && connectSettings.shareEmailOnConnect && userEmail)
  const canSharePhone = Boolean(profile.show_phone && connectSettings.sharePhoneOnConnect && profile.profile_data?.phone)
  const canShareLocation = Boolean(profile.show_location)

  return {
    userId,
    username: profile.username ?? null,
    fullName: profile.full_name ?? profile.profile_data?.name ?? null,
    avatarUrl: profile.avatar_url ?? null,
    bio: profile.bio ?? null,
    location: canShareLocation ? profile.location ?? null : null,
    email: canShareEmail ? userEmail : null,
    phone: canSharePhone ? profile.profile_data.phone : null,
  }
}
