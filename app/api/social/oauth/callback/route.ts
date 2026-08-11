import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { decodeSocialOAuthState } from '@/lib/admin/content-hub/oauth-state'
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
  const state = decodeSocialOAuthState(stateRaw)
  const platform = (state?.platform || url.searchParams.get('platform') || 'instagram') as Platform
  const redirect_uri = `${url.origin}/api/social/oauth/callback?platform=${platform}`

  const returnTo = state?.returnTo || 'artist'
  const organizerAccountId = state?.organizerAccountId
  const isOrg = state?.scope === 'organization'

  if (!code) {
    if (isOrg) return adminRedirect(url.origin, organizerAccountId, { oauth_error: 'Missing code' })
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) return NextResponse.redirect(`${url.origin}/login`)

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
      ops_org_id: state?.opsOrgId,
      persist: !isOrg,
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
    if (!organizerAccountId || !state?.opsOrgId) {
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

    const { error: upsertError } = await supabase.from('organization_social_integrations').upsert(
      {
        organizer_account_id: organizerAccountId,
        ops_org_id: state.opsOrgId,
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
      },
      { onConflict: 'organizer_account_id,platform' },
    )

    if (upsertError) {
      return adminRedirect(url.origin, organizerAccountId, {
        oauth_error: upsertError.message,
      })
    }

    return adminRedirect(url.origin, organizerAccountId, { connected: '1' })
  }

  return artistRedirect(url.origin, { connected: '1' })
}
