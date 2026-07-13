import type { ArtistSocialIntegration } from '@/types/social-integrations.type'
import type { AnalyticsData } from '@/lib/artist/artist-analytics-data'
import { buildPlatformAnalyticsFromIntegrations } from '@/lib/artist/build-platform-analytics-from-integrations'

/** Build analytics overview from RPC-backed artist stats only; no fabricated demographics. */
export function buildAnalyticsDataFromArtistStats(
  stats: {
    totalRevenue: number
    totalFans: number
    totalStreams: number
    engagementRate: number
    monthlyListeners: number
    musicCount: number
    videoCount: number
    photoCount: number
    blogCount: number
    eventCount: number
    merchandiseCount: number
    totalPlays: number
    totalViews: number
  },
  opts?: {
    topTrackTitle?: string
    topVideoTitle?: string
    marketplaceMerchandiseRevenue?: number
    integrations?: ArtistSocialIntegration[]
    weeklyGrowth?: number
  }
): AnalyticsData {
  const tracks = stats.musicCount
  const videos = stats.videoCount
  const photos = stats.photoCount
  const blogs = stats.blogCount

  const avgPlays = tracks > 0 ? Math.round(stats.totalPlays / tracks) : 0
  const avgViews = videos > 0 ? Math.round(stats.totalViews / videos) : 0
  const merchandiseRevenue = Number(opts?.marketplaceMerchandiseRevenue || 0)
  const platforms = buildPlatformAnalyticsFromIntegrations(opts?.integrations || [])

  return {
    overview: {
      totalRevenue: stats.totalRevenue + merchandiseRevenue,
      totalFans: stats.totalFans,
      totalStreams: stats.totalStreams,
      engagementRate: stats.engagementRate,
      monthlyListeners: stats.monthlyListeners,
      growthRate: opts?.weeklyGrowth ?? 0,
    },
    audience: {
      demographics: {
        ageGroups: [],
        gender: [],
        topCountries: [],
        topCities: [],
      },
      engagement: {
        activeFans: 0,
        superFans: 0,
        casualListeners: Math.max(0, stats.totalFans),
        newFollowers: 0,
      },
    },
    content: {
      performance: {
        tracks: {
          total: tracks,
          avgPlays,
          topTrack: opts?.topTrackTitle ?? (tracks > 0 ? '—' : '—'),
        },
        videos: {
          total: videos,
          avgViews,
          topVideo: opts?.topVideoTitle ?? (videos > 0 ? '—' : '—'),
        },
        photos: { total: photos, avgLikes: 0, topPhoto: photos > 0 ? '—' : '—' },
        blogs: { total: blogs, avgReads: 0, topBlog: blogs > 0 ? '—' : '—' },
      },
      trends: {
        weeklyGrowth: opts?.weeklyGrowth ?? 0,
        monthlyGrowth: 0,
        topPerformingContent: '—',
      },
    },
    revenue: {
      breakdown: {
        liveShows: 0,
        merchandise: merchandiseRevenue,
        streaming: 0,
        collaborations: 0,
        sponsorships: 0,
      },
      projections: {
        nextMonth: 0,
        nextQuarter: 0,
        nextYear: 0,
      },
    },
    platforms,
  }
}
