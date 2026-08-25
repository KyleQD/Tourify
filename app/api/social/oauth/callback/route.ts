import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  decodeSocialOAuthState,
  verifySignedOAuthState,
} from '@/lib/admin/content-hub/oauth-state'
import {
  encryptIntegrationSecret,
} from '@/lib/marketplace/integration-credentials'

type Platform = 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'twitter'

function adminRedirect(origin: string, accountId: string | undefined, params: Record<string, string>) {
  const url = new URL('/admin/dashboard/content', origin)
  url.searchParams.set('tab', 'platforms')
  if (accountId) url.searchParams.set('account', accountId)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return NextResponse.redirect(url.toString())
}

function artistRedirect(origin: string, params: Record<string, string>) {
  const url = new URL('/artist/content', origin)
  url.searchParams.set('tab', 'socials')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return NextResponse.redirect(url.toString())
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateRaw = url.searchParams.get('state')

  // Legacy decode is used ONLY to pre-read org context for error redirects;
  // every security decision below uses the verified signed payload.
  const legacy = decodeSocialOAuthState(stateRaw)
  const organizerAccountIdEarly = legacy?.organizerAccountId
  const isOrgEarly = legacy?.scope === 'organization'

  if (!code) {
    if (isOrgEarly) return adminRedirect(url.origin, organizerAccountIdEarly, { oauth_error: 'Missing code' })
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return NextResponse.redirect(`${url.origin}/login`)

  // VEN-268 — signed state is mandatory. Unsigned/legacy states fail closed;
  // the initiating actor must be the one completing the exchange, and states
  // expire after ten minutes.
  const signed = verifySignedOAuthState(stateRaw, user.id)
  if (!signed) {
    if (isOrgEarly) return adminRedirect(url.origin, organizerAccountIdEarly, { oauth_error: 'Invalid or expired OAuth state' })
    return artistRedirect(url.origin, { oauth_error: 'Invalid or expired OAuth state' })
  }

  const platform = signed.platform as Platform
  const redirect_uri = `${url.origin}/api/social/oauth/callback?platform=${platform}`

  const returnTo = signed.returnTo || 'artist'
  const organizerAccountId = signed.organizerAccountId
  const isOrg = signed.scope === 'organization'

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) return NextResponse.redirect(`${url.origin}/login`)

  const fnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/social-oauth`
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      platform,
      code,
      redirect_uri,
      scope: isOrg ? 'organization' : 'artist',
      organizer_account_id: organizerAccountId,
      ops_org_id: signed.opsOrgId,
      persist: !isOrg,
      // VEN-268 — PKCE verifier from the signed state (Twitter S256 flow).
      ...(signed.codeVerifier ? { code_verifier: signed.codeVerifier } : {}),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    if (isOrg) {
      return adminRedirect(url.origin, organizerAccountId, {
        oauth_error: err.slice(0, 300),
      })
    }
    return artistRedirect(url.origin, { oauth_error: err.slice(0, 300) })
  }

  if (isOrg) {
    if (!organizerAccountId || !signed.opsOrgId) {
      return adminRedirect(url.origin, organizerAccountId, {
        oauth_error: 'Missing organization context',
      })
    }

    const payload = (await res.json().catch(() => ({}))) as {
      access_token?: string
      refresh_token?: string | null
      expires_in?: number
      account_handle?: string
    }

    if (!payload.access_token) {
      return adminRedirect(url.origin, organizerAccountId, {
        oauth_error: 'Token exchange returned no access token',
      })
    }

    let tokenEnvelope: ReturnType<typeof encryptIntegrationSecret> | null = null
    let refreshEnvelope: ReturnType<typeof encryptIntegrationSecret> | null = null
    try {
      tokenEnvelope = encryptIntegrationSecret(payload.access_token)
      if (payload.refresh_token) {
        refreshEnvelope = encryptIntegrationSecret(payload.refresh_token)
      }
    } catch (encryptError) {
      console.error('[social-oauth-callback] encryption failed', encryptError)
    }

    // Types lag the live table (organizer_account_id / ops_org_id added via
    // execute_sql); loose cast mirrors other pre-regeneration shims.
    const orgUpsert = {
      organizer_account_id: organizerAccountId,
      ops_org_id: signed.opsOrgId,
      platform,
      account_handle: payload.account_handle || '',
      access_token: payload.access_token,
      refresh_token: payload.refresh_token ?? null,
      token_envelope: tokenEnvelope,
      refresh_token_envelope: refreshEnvelope,
      token_expires_at: payload.expires_in
        ? new Date(Date.now() + payload.expires_in * 1000).toISOString()
        : null,
      is_connected: true,
      last_sync: new Date().toISOString(),
      connected_by: user.id,
      analytics: ['youtube', 'tiktok', 'twitter'].includes(platform)
        ? {
            status: 'unsupported',
            platform,
            synced_at: new Date().toISOString(),
            error: `${platform} analytics API not implemented yet`,
          }
        : {
            platform,
            synced_at: new Date().toISOString(),
          },
    } as Record<string, unknown>

    const { error: upsertError } = await supabase
      .from('organization_social_integrations')
      .upsert(orgUpsert as never, { onConflict: 'organizer_account_id,platform' })

    if (upsertError) {
      return adminRedirect(url.origin, organizerAccountId, {
        oauth_error: upsertError.message,
      })
    }

    return adminRedirect(url.origin, organizerAccountId, { connected: '1' })
  }

  return artistRedirect(url.origin, { connected: '1' })
}
