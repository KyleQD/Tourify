// deno-lint-ignore-file no-explicit-any
import { createClient } from "jsr:@supabase/supabase-js@2"

type Platform = 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'twitter'

interface RequestBody {
  platform: Platform
  code: string
  redirect_uri: string
  scope?: 'artist' | 'organization'
  organizer_account_id?: string
  ops_org_id?: string
  /** When false, return tokens without writing artist_social_integrations */
  persist?: boolean
}

function getEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

async function exchangeToken(platform: Platform, code: string, redirectUri: string) {
  switch (platform) {
    case 'facebook':
    case 'instagram': {
      const clientId = getEnv('FACEBOOK_APP_ID')
      const clientSecret = getEnv('FACEBOOK_APP_SECRET')
      const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
      tokenUrl.searchParams.set('client_id', clientId)
      tokenUrl.searchParams.set('client_secret', clientSecret)
      tokenUrl.searchParams.set('redirect_uri', redirectUri)
      tokenUrl.searchParams.set('code', code)
      const res = await fetch(tokenUrl, { method: 'GET' })
      if (!res.ok) throw new Error(`Facebook token error: ${res.status}`)
      const data = await res.json()
      return {
        access_token: data.access_token as string,
        refresh_token: null as string | null,
        expires_in: data.expires_in as number | undefined,
        account_handle: '',
      }
    }
    case 'youtube': {
      const clientId = getEnv('GOOGLE_CLIENT_ID')
      const clientSecret = getEnv('GOOGLE_CLIENT_SECRET')
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      })
      if (!res.ok) throw new Error(`Google token error: ${res.status}`)
      const data = await res.json()
      return {
        access_token: data.access_token as string,
        refresh_token: (data.refresh_token as string | null) ?? null,
        expires_in: data.expires_in as number | undefined,
        account_handle: '',
      }
    }
    case 'tiktok': {
      const clientKey = getEnv('TIKTOK_CLIENT_KEY')
      const clientSecret = getEnv('TIKTOK_CLIENT_SECRET')
      const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      })
      if (!res.ok) throw new Error(`TikTok token error: ${res.status}`)
      const data = await res.json()
      return {
        access_token: data.access_token as string,
        refresh_token: (data.refresh_token as string | null) ?? null,
        expires_in: data.expires_in as number | undefined,
        account_handle: '',
      }
    }
    case 'twitter': {
      const clientId = getEnv('TWITTER_CLIENT_ID')
      const clientSecret = getEnv('TWITTER_CLIENT_SECRET')
      const basic = btoa(`${clientId}:${clientSecret}`)
      const res = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          authorization: `Basic ${basic}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code_verifier: getEnv('TWITTER_CODE_VERIFIER'),
        }),
      })
      if (!res.ok) throw new Error(`Twitter token error: ${res.status}`)
      const data = await res.json()
      return {
        access_token: data.access_token as string,
        refresh_token: (data.refresh_token as string | null) ?? null,
        expires_in: data.expires_in as number | undefined,
        account_handle: '',
      }
    }
  }
}

async function resolveAccountHandle(platform: Platform, accessToken: string): Promise<string> {
  try {
    if (platform === 'instagram' || platform === 'facebook') {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=id,name,username&access_token=${accessToken}`,
      )
      const data = await res.json().catch(() => ({}))
      return String(data.username || data.name || data.id || '')
    }
    if (platform === 'youtube') {
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        { headers: { authorization: `Bearer ${accessToken}` } },
      )
      const data = await res.json().catch(() => ({}))
      return String(data?.items?.[0]?.snippet?.title || '')
    }
  } catch {
    // best-effort handle lookup
  }
  return ''
}

function getSupabaseFromAuthHeader(req: Request) {
  const supabaseUrl = getEnv('SUPABASE_URL')
  const anonKey = getEnv('SUPABASE_ANON_KEY')
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })
  const body = (await req.json()) as RequestBody
  const supabase = getSupabaseFromAuthHeader(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const tokens = await exchangeToken(body.platform, body.code, body.redirect_uri)
    const account_handle = await resolveAccountHandle(body.platform, tokens.access_token)
    const scope = body.scope === 'organization' ? 'organization' : 'artist'
    const persist = body.persist !== false && scope === 'artist'

    if (scope === 'organization') {
      return new Response(
        JSON.stringify({
          success: true,
          scope: 'organization',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in,
          account_handle,
        }),
        { headers: { 'content-type': 'application/json' } },
      )
    }

    if (persist) {
      const { error } = await supabase.from('artist_social_integrations').upsert(
        {
          user_id: user.id,
          platform: body.platform,
          account_handle,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          token_expires_at: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : null,
          is_connected: true,
          last_sync: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform' },
      )
      if (error) throw error
    }

    return new Response(JSON.stringify({ success: true, scope: 'artist' }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Token exchange failed' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}

Deno.serve(handler)
