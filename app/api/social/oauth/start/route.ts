import { NextResponse } from 'next/server'
import { encodeSocialOAuthState } from '@/lib/admin/content-hub/oauth-state'

const PROVIDER_CONFIG: Record<string, { auth_url: string; scope: string; client_id_env: string }> = {
  instagram: {
    auth_url: 'https://www.facebook.com/v19.0/dialog/oauth',
    scope: 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement',
    client_id_env: 'FACEBOOK_APP_ID',
  },
  facebook: {
    auth_url: 'https://www.facebook.com/v19.0/dialog/oauth',
    scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content',
    client_id_env: 'FACEBOOK_APP_ID',
  },
  youtube: {
    auth_url: 'https://accounts.google.com/o/oauth2/v2/auth',
    scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload',
    client_id_env: 'GOOGLE_CLIENT_ID',
  },
  tiktok: {
    auth_url: 'https://www.tiktok.com/v2/auth/authorize',
    scope: 'user.info.basic,video.list',
    client_id_env: 'TIKTOK_CLIENT_KEY',
  },
  twitter: {
    auth_url: 'https://twitter.com/i/oauth2/authorize',
    scope: 'tweet.read tweet.write users.read offline.access',
    client_id_env: 'TWITTER_CLIENT_ID',
  },
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const platform = url.searchParams.get('platform') || ''
  const redirect =
    url.searchParams.get('redirect') || `${url.origin}/api/social/oauth/callback?platform=${platform}`
  const scopeParam = url.searchParams.get('scope') === 'organization' ? 'organization' : 'artist'
  const returnTo = url.searchParams.get('return_to') === 'admin' ? 'admin' : 'artist'
  const organizerAccountId = url.searchParams.get('organizer_account_id') || undefined
  const opsOrgId = url.searchParams.get('ops_org_id') || undefined

  const cfg = PROVIDER_CONFIG[platform]
  if (!cfg) return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })

  if (scopeParam === 'organization' && (!organizerAccountId || !opsOrgId)) {
    return NextResponse.json(
      { error: 'organizer_account_id and ops_org_id are required for organization OAuth' },
      { status: 400 },
    )
  }

  const clientId = process.env[cfg.client_id_env as keyof NodeJS.ProcessEnv] as string
  if (!clientId) {
    return NextResponse.json(
      { error: `Provider not configured: missing ${cfg.client_id_env}` },
      { status: 503 },
    )
  }

  const state = encodeSocialOAuthState({
    nonce: Math.random().toString(36).slice(2),
    scope: scopeParam,
    returnTo,
    organizerAccountId,
    opsOrgId,
    platform,
  })

  const authUrl = new URL(cfg.auth_url)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirect)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', cfg.scope)
  if (platform === 'twitter') {
    const verifier = process.env.TWITTER_CODE_CHALLENGE || 'challenge'
    authUrl.searchParams.set('code_challenge', verifier)
    authUrl.searchParams.set('code_challenge_method', 'plain')
  }
  if (platform === 'youtube') {
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
  }
  authUrl.searchParams.set('state', state)

  return NextResponse.redirect(authUrl.toString())
}
