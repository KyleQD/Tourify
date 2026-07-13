// deno-lint-ignore-file no-explicit-any
import { createClient } from "jsr:@supabase/supabase-js@2"

type Platform = 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'twitter'

interface NormalizedAnalytics {
  status: 'synced' | 'unsupported' | 'needs_oauth' | 'error'
  platform: Platform
  followers?: number
  engagement?: number
  impressions?: number
  reach?: number
  profile_views?: number
  subscribers?: number
  views?: number
  growth?: number
  error?: string
  raw?: unknown
  synced_at: string
}

function getEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing env ${name}`)
  return v
}

function getSupabaseFromAuthHeader(req: Request) {
  const supabaseUrl = getEnv('SUPABASE_URL')
  const anonKey = getEnv('SUPABASE_ANON_KEY')
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '') || ''
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
}

function getServiceClient() {
  return createClient(getEnv('SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))
}

function metricFromInsights(payload: any, names: string[]): number {
  const rows = Array.isArray(payload?.data) ? payload.data : []
  for (const name of names) {
    const match = rows.find((row: any) => row?.name === name)
    const value = match?.values?.[0]?.value
    if (typeof value === 'number' && Number.isFinite(value)) return value
  }
  return 0
}

async function fetchInstagramAnalytics(accessToken: string): Promise<NormalizedAnalytics> {
  const synced_at = new Date().toISOString()
  try {
    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,username,followers_count,media_count&access_token=${accessToken}`
    )
    const me = await meRes.json()
    if (!meRes.ok || me?.error) {
      return {
        status: 'error',
        platform: 'instagram',
        error: me?.error?.message || 'Instagram profile fetch failed',
        raw: me,
        synced_at,
      }
    }

    const insightsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/insights?metric=impressions,reach,profile_views&period=day&access_token=${accessToken}`
    )
    const insights = await insightsRes.json().catch(() => ({}))

    const impressions = metricFromInsights(insights, ['impressions'])
    const reach = metricFromInsights(insights, ['reach'])
    const profile_views = metricFromInsights(insights, ['profile_views'])
    const followers = Number(me.followers_count) || 0
    const engagement = reach > 0 ? Math.round((reach / Math.max(followers, 1)) * 1000) / 10 : 0

    return {
      status: 'synced',
      platform: 'instagram',
      followers,
      engagement,
      impressions,
      reach,
      profile_views,
      growth: 0,
      raw: { me, insights },
      synced_at,
    }
  } catch (e) {
    return {
      status: 'error',
      platform: 'instagram',
      error: String(e),
      synced_at,
    }
  }
}

async function fetchFacebookAnalytics(accessToken: string): Promise<NormalizedAnalytics> {
  const synced_at = new Date().toISOString()
  try {
    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,fan_count,followers_count&access_token=${accessToken}`
    )
    const me = await meRes.json()
    if (!meRes.ok || me?.error) {
      return {
        status: 'error',
        platform: 'facebook',
        error: me?.error?.message || 'Facebook page fetch failed',
        raw: me,
        synced_at,
      }
    }

    const insightsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/insights?metric=page_impressions,page_engaged_users,page_fans&period=day&access_token=${accessToken}`
    )
    const insights = await insightsRes.json().catch(() => ({}))

    const impressions = metricFromInsights(insights, ['page_impressions'])
    const engaged = metricFromInsights(insights, ['page_engaged_users'])
    const followers =
      Number(me.followers_count) ||
      Number(me.fan_count) ||
      metricFromInsights(insights, ['page_fans']) ||
      0

    return {
      status: 'synced',
      platform: 'facebook',
      followers,
      engagement: engaged,
      impressions,
      reach: engaged,
      growth: 0,
      raw: { me, insights },
      synced_at,
    }
  } catch (e) {
    return {
      status: 'error',
      platform: 'facebook',
      error: String(e),
      synced_at,
    }
  }
}

function unsupportedAnalytics(platform: Platform): NormalizedAnalytics {
  return {
    status: 'unsupported',
    platform,
    followers: 0,
    subscribers: 0,
    views: 0,
    growth: 0,
    synced_at: new Date().toISOString(),
    error: `${platform} analytics API not implemented yet`,
  }
}

async function fetchAnalytics(platform: Platform, accessToken: string): Promise<NormalizedAnalytics> {
  if (!accessToken) {
    return {
      status: 'needs_oauth',
      platform,
      synced_at: new Date().toISOString(),
      error: 'Missing access token',
    }
  }
  if (platform === 'instagram') return fetchInstagramAnalytics(accessToken)
  if (platform === 'facebook') return fetchFacebookAnalytics(accessToken)
  return unsupportedAnalytics(platform)
}

function followersFromAnalytics(platform: Platform, analytics: NormalizedAnalytics): number {
  if (analytics.status !== 'synced') return 0
  if (platform === 'youtube') return Number(analytics.subscribers) || 0
  return Number(analytics.followers) || 0
}

async function syncUserIntegrations(
  client: ReturnType<typeof createClient>,
  userId: string,
  rows: any[]
) {
  let totalFollowers = 0
  for (const row of rows) {
    if (!row.access_token) {
      await client
        .from('artist_social_integrations')
        .update({
          analytics: {
            status: 'needs_oauth',
            platform: row.platform,
            synced_at: new Date().toISOString(),
            error: 'OAuth required',
          },
          last_sync: new Date().toISOString(),
        })
        .eq('id', row.id)
      continue
    }

    const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : null
    if (expiresAt && expiresAt < Date.now()) {
      await client
        .from('artist_social_integrations')
        .update({
          is_connected: true,
          analytics: {
            status: 'needs_oauth',
            platform: row.platform,
            synced_at: new Date().toISOString(),
            error: 'Token expired — reconnect OAuth',
          },
          last_sync: new Date().toISOString(),
        })
        .eq('id', row.id)
      continue
    }

    const analytics = await fetchAnalytics(row.platform as Platform, row.access_token as string)
    const update: Record<string, unknown> = {
      analytics,
      last_sync: new Date().toISOString(),
    }
    if (analytics.status === 'error' && /token|oauth|auth|expired/i.test(String(analytics.error || ''))) {
      update.access_token = null
      update.refresh_token = null
    }

    await client.from('artist_social_integrations').update(update).eq('id', row.id)
    totalFollowers += followersFromAnalytics(row.platform as Platform, analytics)
  }

  // Integrations table is source of truth; store aggregate on artist_profiles.settings for EPK
  const { data: profile } = await client
    .from('artist_profiles')
    .select('id, settings')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (profile?.id) {
    const settings = {
      ...((profile.settings as Record<string, unknown>) || {}),
      social_followers_total: totalFollowers,
      social_followers_synced_at: new Date().toISOString(),
    }
    await client.from('artist_profiles').update({ settings }).eq('id', profile.id)
  }

  return totalFollowers
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const body = (await req.json().catch(() => ({}))) as { userId?: string; runAll?: boolean }
  const cronSecretHeader = req.headers.get('x-cron-secret') || ''
  const cronSecretEnv = Deno.env.get('CRON_SECRET') || ''
  const isCron = Boolean(cronSecretHeader && cronSecretEnv && cronSecretHeader === cronSecretEnv)

  if (body.runAll) {
    if (!isCron) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    const service = getServiceClient()
    const { data, error } = await service
      .from('artist_social_integrations')
      .select('*')
      .eq('is_connected', true)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

    const byUser: Record<string, any[]> = {}
    for (const row of data || []) {
      const uid = row.user_id as string
      if (!byUser[uid]) byUser[uid] = []
      byUser[uid].push(row)
    }

    let users = 0
    for (const [uid, rows] of Object.entries(byUser)) {
      await syncUserIntegrations(service, uid, rows)
      users++
    }

    return new Response(JSON.stringify({ success: true, mode: 'cron', users }), {
      headers: { 'content-type': 'application/json' },
    })
  }

  const supabase = getSupabaseFromAuthHeader(req)
  const auth = await supabase.auth.getUser()
  const executingUserId = body.userId || auth.data.user?.id || ''
  if (!executingUserId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }
  if (body.userId && !isCron) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
  }

  const client = body.userId && isCron ? getServiceClient() : supabase
  const { data, error } = await client
    .from('artist_social_integrations')
    .select('*')
    .eq('user_id', executingUserId)
    .eq('is_connected', true)
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  const totalFollowers = await syncUserIntegrations(client, executingUserId, data || [])

  return new Response(
    JSON.stringify({ success: true, mode: 'single', totalFollowers }),
    { headers: { 'content-type': 'application/json' } }
  )
}

Deno.serve(handler)
