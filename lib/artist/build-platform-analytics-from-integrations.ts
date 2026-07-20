import type { ArtistSocialIntegration } from '@/types/social-integrations.type'
import type { AnalyticsData, PlatformMetricStatus } from '@/lib/artist/artist-analytics-data'

export interface PlatformMetricSlice {
  listeners?: number
  streams?: number
  subscribers?: number
  views?: number
  followers?: number
  engagement?: number
  growth: number
  status: PlatformMetricStatus
  statusLabel: string
}

type PlatformsShape = AnalyticsData['platforms']

const UNSUPPORTED_ANALYTICS: ArtistSocialIntegration['platform'][] = [
  'youtube',
  'tiktok',
  'twitter',
]

function metricNumber(...values: unknown[]): number {
  for (const value of values) {
    const n = Number(value)
    if (Number.isFinite(n) && n >= 0) return n
  }
  return 0
}

function readGraphInsight(analytics: Record<string, any>, metricName?: string): number {
  const data = Array.isArray(analytics?.data) ? analytics.data : []
  if (metricName) {
    const match = data.find((row: any) => row?.name === metricName)
    if (match?.values?.[0]?.value != null) return metricNumber(match.values[0].value)
  }
  return metricNumber(
    analytics?.followers,
    analytics?.follower_count,
    analytics?.subscribers,
    analytics?.subscriber_count,
    data?.[0]?.values?.[0]?.value
  )
}

function readEngagement(analytics: Record<string, any>): number {
  return metricNumber(
    analytics?.engagement,
    analytics?.engagement_rate,
    analytics?.reach,
    readGraphInsight(analytics, 'reach'),
    readGraphInsight(analytics, 'page_engaged_users')
  )
}

function baseUnavailable(label: string): PlatformMetricSlice {
  return {
    growth: 0,
    status: 'unavailable',
    statusLabel: label,
    followers: 0,
    views: 0,
    engagement: 0,
    listeners: 0,
    streams: 0,
    subscribers: 0,
  }
}

export function resolveIntegrationStatus(
  integration: ArtistSocialIntegration | undefined
): { status: PlatformMetricStatus; statusLabel: string } {
  if (!integration?.is_connected) {
    return { status: 'unavailable', statusLabel: 'Not connected' }
  }

  const analytics = (integration.analytics || {}) as Record<string, any>
  const providerStatus = String(analytics.status || '')

  if (providerStatus === 'unsupported') {
    return { status: 'unsupported', statusLabel: 'Analytics not available' }
  }
  if (providerStatus === 'needs_oauth' || !integration.access_token) {
    return { status: 'needs_oauth', statusLabel: 'Connect OAuth to sync' }
  }
  if (providerStatus === 'error') {
    return {
      status: 'needs_oauth',
      statusLabel: String(analytics.error || 'Sync error — reconnect'),
    }
  }
  if (UNSUPPORTED_ANALYTICS.includes(integration.platform) && !analytics.followers && !analytics.subscribers && !analytics.views) {
    if (providerStatus !== 'synced') {
      return { status: 'unsupported', statusLabel: 'Analytics not available' }
    }
  }
  if (integration.last_sync || analytics.followers != null || analytics.impressions != null || analytics.data) {
    return { status: 'synced', statusLabel: 'Synced' }
  }
  return { status: 'handle_only', statusLabel: 'Handle saved' }
}

export function buildPlatformAnalyticsFromIntegrations(
  integrations: ArtistSocialIntegration[]
): PlatformsShape {
  const byPlatform = new Map(integrations.map(row => [row.platform, row]))

  function forOauthPlatform(
    platform: ArtistSocialIntegration['platform'],
    map: (analytics: Record<string, any>) => Partial<PlatformMetricSlice>
  ): PlatformMetricSlice {
    const integration = byPlatform.get(platform)
    const { status, statusLabel } = resolveIntegrationStatus(integration)
    if (!integration || status === 'unavailable') {
      return baseUnavailable('Not connected')
    }
    if (status === 'unsupported' || status === 'needs_oauth' || status === 'handle_only') {
      return {
        ...baseUnavailable(statusLabel),
        status,
        statusLabel,
      }
    }
    const analytics = (integration.analytics || {}) as Record<string, any>
    return {
      growth: metricNumber(analytics.growth),
      status,
      statusLabel,
      followers: 0,
      views: 0,
      engagement: 0,
      listeners: 0,
      streams: 0,
      subscribers: 0,
      ...map(analytics),
    }
  }

  const instagram = forOauthPlatform('instagram', analytics => ({
    followers: metricNumber(
      analytics.followers,
      analytics.follower_count,
      readGraphInsight(analytics, 'follower_count')
    ),
    engagement: readEngagement(analytics),
  }))

  const youtube = forOauthPlatform('youtube', analytics => ({
    subscribers: metricNumber(analytics.subscribers, analytics.subscriber_count),
    views: metricNumber(analytics.views, analytics.view_count),
  }))

  const tiktok = forOauthPlatform('tiktok', analytics => ({
    followers: metricNumber(analytics.followers, analytics.follower_count),
    views: metricNumber(analytics.views, analytics.video_views),
  }))

  const facebook = forOauthPlatform('facebook', analytics => ({
    followers: metricNumber(
      analytics.followers,
      analytics.fan_count,
      readGraphInsight(analytics, 'page_fans')
    ),
    engagement: readEngagement(analytics),
  }))

  return {
    spotify: {
      listeners: 0,
      streams: 0,
      growth: 0,
      status: 'unsupported',
      statusLabel: 'Add Spotify link on Socials — streaming API not connected',
    },
    appleMusic: {
      listeners: 0,
      streams: 0,
      growth: 0,
      status: 'unsupported',
      statusLabel: 'Add Apple Music link on Socials — streaming API not connected',
    },
    youtube: {
      subscribers: youtube.subscribers || 0,
      views: youtube.views || 0,
      growth: youtube.growth,
      status: youtube.status,
      statusLabel: youtube.statusLabel,
    },
    instagram: {
      followers: instagram.followers || 0,
      engagement: instagram.engagement || 0,
      growth: instagram.growth,
      status: instagram.status,
      statusLabel: instagram.statusLabel,
    },
    tiktok: {
      followers: tiktok.followers || 0,
      views: tiktok.views || 0,
      growth: tiktok.growth,
      status: tiktok.status,
      statusLabel: tiktok.statusLabel,
    },
    facebook: {
      followers: facebook.followers || 0,
      engagement: facebook.engagement || 0,
      growth: facebook.growth,
      status: facebook.status,
      statusLabel: facebook.statusLabel,
    },
  }
}

export function sumExternalFollowers(integrations: ArtistSocialIntegration[]): number {
  const platforms = buildPlatformAnalyticsFromIntegrations(integrations)
  return (
    (platforms.instagram.followers || 0) +
    (platforms.tiktok.followers || 0) +
    (platforms.youtube.subscribers || 0) +
    (platforms.facebook?.followers || 0)
  )
}
