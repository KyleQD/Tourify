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

interface MediaInsightRow {
  media_id: string
  permalink: string | null
  caption: string | null
  media_type: string | null
  impressions: number
  reach: number
  engagement: number
  likes: number
  comments: number
  shares: number
  posted_at: string | null
  raw: unknown
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
      `https://graph.facebook.com/v19.0/me?fields=id,username,followers_count,media_count&access_token=${accessToken}`,
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
      `https://graph.facebook.com/v19.0/me/insights?metric=impressions,reach,profile_views&period=day&access_token=${accessToken}`,
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
      `https://graph.facebook.com/v19.0/me?fields=id,name,fan_count,followers_count&access_token=${accessToken}`,
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
      `https://graph.facebook.com/v19.0/me/insights?metric=page_impressions,page_engaged_users,page_fans&period=day&access_token=${accessToken}`,
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

async function fetchInstagramMediaInsights(accessToken: string): Promise<MediaInsightRow[]> {
  try {
    const mediaRes = await fetch(
      `https://graph.facebook.com/v19.0/me/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count&limit=12&access_token=${accessToken}`,
    )
    const mediaPayload = await mediaRes.json().catch(() => ({}))
    if (!mediaRes.ok || mediaPayload?.error) return []

    const items = Array.isArray(mediaPayload.data) ? mediaPayload.data : []
    const rows: MediaInsightRow[] = []

    for (const item of items.slice(0, 12)) {
      const mediaId = String(item.id || '')
      if (!mediaId) continue

      let impressions = 0
      let reach = 0
      let engagement = 0
      let shares = 0
      let insightsRaw: unknown = null

      try {
        const insightsRes = await fetch(
          `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=impressions,reach,engagement,saved&access_token=${accessToken}`,
        )
        const insights = await insightsRes.json().catch(() => ({}))
        insightsRaw = insights
        if (insightsRes.ok && !insights?.error) {
          impressions = metricFromInsights(insights, ['impressions'])
          reach = metricFromInsights(insights, ['reach'])
          engagement = metricFromInsights(insights, ['engagement'])
          shares = metricFromInsights(insights, ['saved'])
        }
      } catch {
        // media insights optional per item
      }

      const likes = Number(item.like_count) || 0
      const comments = Number(item.comments_count) || 0
      rows.push({
        media_id: mediaId,
        permalink: item.permalink || null,
        caption: item.caption || null,
        media_type: item.media_type || null,
        impressions,
        reach,
        engagement: engagement || likes + comments,
        likes,
        comments,
        shares,
        posted_at: item.timestamp || null,
        raw: { media: item, insights: insightsRaw },
      })
    }

    return rows
  } catch {
    return []
  }
}

async function fetchFacebookMediaInsights(accessToken: string): Promise<MediaInsightRow[]> {
  try {
    const postsRes = await fetch(
      `https://graph.facebook.com/v19.0/me/posts?fields=id,message,permalink_url,created_time,shares,likes.summary(true),comments.summary(true)&limit=12&access_token=${accessToken}`,
    )
    const postsPayload = await postsRes.json().catch(() => ({}))
    if (!postsRes.ok || postsPayload?.error) return []

    const items = Array.isArray(postsPayload.data) ? postsPayload.data : []
    const rows: MediaInsightRow[] = []

    for (const item of items.slice(0, 12)) {
      const mediaId = String(item.id || '')
      if (!mediaId) continue

      let impressions = 0
      let reach = 0
      let engagement = 0
      let insightsRaw: unknown = null

      try {
        const insightsRes = await fetch(
          `https://graph.facebook.com/v19.0/${mediaId}/insights?metric=post_impressions,post_engaged_users,post_clicks&access_token=${accessToken}`,
        )
        const insights = await insightsRes.json().catch(() => ({}))
        insightsRaw = insights
        if (insightsRes.ok && !insights?.error) {
          impressions = metricFromInsights(insights, ['post_impressions'])
          engagement = metricFromInsights(insights, ['post_engaged_users'])
          reach = engagement
        }
      } catch {
        // optional
      }

      const likes = Number(item?.likes?.summary?.total_count) || 0
      const comments = Number(item?.comments?.summary?.total_count) || 0
      const shares = Number(item?.shares?.count) || 0

      rows.push({
        media_id: mediaId,
        permalink: item.permalink_url || null,
        caption: item.message || null,
        media_type: 'post',
        impressions,
        reach,
        engagement: engagement || likes + comments + shares,
        likes,
        comments,
        shares,
        posted_at: item.created_time || null,
        raw: { media: item, insights: insightsRaw },
      })
    }

    return rows
  } catch {
    return []
  }
}

async function fetchMediaInsights(platform: Platform, accessToken: string): Promise<MediaInsightRow[]> {
  if (platform === 'instagram') return fetchInstagramMediaInsights(accessToken)
  if (platform === 'facebook') return fetchFacebookMediaInsights(accessToken)
  return []
}

function followersFromAnalytics(platform: Platform, analytics: NormalizedAnalytics): number {
  if (analytics.status !== 'synced') return 0
  if (platform === 'youtube') return Number(analytics.subscribers) || 0
  return Number(analytics.followers) || 0
}

async function syncUserIntegrations(
  client: ReturnType<typeof createClient>,
  userId: string,
  rows: any[],
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

async function persistOrgMediaInsights(
  client: ReturnType<typeof createClient>,
  row: any,
  mediaRows: MediaInsightRow[],
) {
  const synced_at = new Date().toISOString()
  for (const media of mediaRows) {
    await client.from('organization_social_media_insights').upsert(
      {
        integration_id: row.id,
        organizer_account_id: row.organizer_account_id,
        ops_org_id: row.ops_org_id,
        platform: row.platform,
        media_id: media.media_id,
        permalink: media.permalink,
        caption: media.caption,
        media_type: media.media_type,
        impressions: media.impressions,
        reach: media.reach,
        engagement: media.engagement,
        likes: media.likes,
        comments: media.comments,
        shares: media.shares,
        posted_at: media.posted_at,
        synced_at,
        raw: media.raw || {},
      },
      { onConflict: 'integration_id,media_id' },
    )
  }
}

async function syncOrgIntegrations(
  client: ReturnType<typeof createClient>,
  rows: any[],
) {
  let totalFollowers = 0
  let mediaSynced = 0

  for (const row of rows) {
    if (!row.access_token) {
      await client
        .from('organization_social_integrations')
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
        .from('organization_social_integrations')
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
    if (analytics.status === 'synced' && !row.account_handle) {
      const handle =
        (analytics.raw as any)?.me?.username ||
        (analytics.raw as any)?.me?.name ||
        ''
      if (handle) update.account_handle = String(handle)
    }
    if (analytics.status === 'error' && /token|oauth|auth|expired/i.test(String(analytics.error || ''))) {
      update.access_token = null
      update.refresh_token = null
      update.token_envelope = null
      update.refresh_token_envelope = null
    }

    await client.from('organization_social_integrations').update(update).eq('id', row.id)
    totalFollowers += followersFromAnalytics(row.platform as Platform, analytics)

    if (analytics.status === 'synced') {
      const mediaRows = await fetchMediaInsights(row.platform as Platform, row.access_token as string)
      if (mediaRows.length > 0) {
        await persistOrgMediaInsights(client, row, mediaRows)
        mediaSynced += mediaRows.length
      }
    }
  }

  return { totalFollowers, mediaSynced }
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const body = (await req.json().catch(() => ({}))) as {
    userId?: string
    runAll?: boolean
    scope?: 'artist' | 'organization' | 'all'
    organizer_account_id?: string
  }
  const cronSecretHeader = req.headers.get('x-cron-secret') || ''
  const cronSecretEnv = Deno.env.get('CRON_SECRET') || ''
  const isCron = Boolean(cronSecretHeader && cronSecretEnv && cronSecretHeader === cronSecretEnv)
  const scope = body.scope || (body.organizer_account_id ? 'organization' : 'artist')

  if (body.runAll) {
    if (!isCron) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    const service = getServiceClient()

    const { data: artistRows, error: artistError } = await service
      .from('artist_social_integrations')
      .select('*')
      .eq('is_connected', true)
    if (artistError) {
      return new Response(JSON.stringify({ error: artistError.message }), { status: 500 })
    }

    const byUser: Record<string, any[]> = {}
    for (const row of artistRows || []) {
      const uid = row.user_id as string
      if (!byUser[uid]) byUser[uid] = []
      byUser[uid].push(row)
    }

    let users = 0
    for (const [uid, rows] of Object.entries(byUser)) {
      await syncUserIntegrations(service, uid, rows)
      users++
    }

    const { data: orgRows, error: orgError } = await service
      .from('organization_social_integrations')
      .select('*')
      .eq('is_connected', true)
    if (orgError) {
      return new Response(JSON.stringify({ error: orgError.message }), { status: 500 })
    }

    const byOrg: Record<string, any[]> = {}
    for (const row of orgRows || []) {
      const key = row.organizer_account_id as string
      if (!byOrg[key]) byOrg[key] = []
      byOrg[key].push(row)
    }

    let organizations = 0
    let mediaSynced = 0
    for (const rows of Object.values(byOrg)) {
      const result = await syncOrgIntegrations(service, rows)
      mediaSynced += result.mediaSynced
      organizations++
    }

    return new Response(
      JSON.stringify({ success: true, mode: 'cron', users, organizations, mediaSynced }),
      { headers: { 'content-type': 'application/json' } },
    )
  }

  if (scope === 'organization') {
    const supabase = getSupabaseFromAuthHeader(req)
    const auth = await supabase.auth.getUser()
    if (!auth.data.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
    if (!body.organizer_account_id) {
      return new Response(JSON.stringify({ error: 'organizer_account_id required' }), { status: 400 })
    }

    const { data, error } = await supabase
      .from('organization_social_integrations')
      .select('*')
      .eq('organizer_account_id', body.organizer_account_id)
      .eq('is_connected', true)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

    const result = await syncOrgIntegrations(supabase, data || [])
    return new Response(
      JSON.stringify({
        success: true,
        mode: 'organization',
        totalFollowers: result.totalFollowers,
        mediaSynced: result.mediaSynced,
      }),
      { headers: { 'content-type': 'application/json' } },
    )
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
    { headers: { 'content-type': 'application/json' } },
  )
}

Deno.serve(handler)
