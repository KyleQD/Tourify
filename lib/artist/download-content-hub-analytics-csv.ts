import type { ArtistSocialIntegration } from '@/types/social-integrations.type'
import type { AnalyticsData } from '@/lib/artist/artist-analytics-data'
import type { ContentHubOverviewResponse } from '@/app/api/artist/content/overview/route'

export function downloadContentHubAnalyticsCsv(input: {
  stats: {
    musicCount: number
    videoCount: number
    photoCount: number
    blogCount: number
    totalViews: number
    totalFans: number
  }
  analytics: AnalyticsData
  overview: ContentHubOverviewResponse | null
  integrations: ArtistSocialIntegration[]
}) {
  const rows: string[][] = [
    ['section', 'key', 'value'],
    ['tourify', 'music_count', String(input.stats.musicCount)],
    ['tourify', 'video_count', String(input.stats.videoCount)],
    ['tourify', 'photo_count', String(input.stats.photoCount)],
    ['tourify', 'blog_count', String(input.stats.blogCount)],
    ['tourify', 'total_views', String(input.stats.totalViews)],
    ['tourify', 'total_fans', String(input.stats.totalFans)],
    ['tourify', 'this_week_new', String(input.overview?.thisWeekCount ?? 0)],
  ]

  for (const [platform, metrics] of Object.entries(input.analytics.platforms)) {
    for (const [key, value] of Object.entries(metrics || {})) {
      rows.push(['platform', `${platform}.${key}`, String(value ?? '')])
    }
  }

  for (const integration of input.integrations) {
    rows.push([
      'integration',
      `${integration.platform}.handle`,
      integration.account_handle,
    ])
    rows.push([
      'integration',
      `${integration.platform}.connected`,
      String(integration.is_connected),
    ])
    rows.push([
      'integration',
      `${integration.platform}.last_sync`,
      integration.last_sync || '',
    ])
    rows.push([
      'integration',
      `${integration.platform}.analytics_status`,
      String((integration.analytics as any)?.status || ''),
    ])
  }

  const csv = rows
    .map(cols => cols.map(col => `"${String(col).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `content-hub-analytics-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}
