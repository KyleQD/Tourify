/** Shared shape for `ArtistAnalyticsOverview` — no mock defaults in UI. */

export type PlatformMetricStatus =
  | 'synced'
  | 'handle_only'
  | 'needs_oauth'
  | 'unsupported'
  | 'unavailable'

export interface PlatformMetricsBase {
  growth: number
  status?: PlatformMetricStatus
  statusLabel?: string
}

export interface AnalyticsData {
  overview: {
    totalRevenue: number
    totalFans: number
    totalStreams: number
    engagementRate: number
    monthlyListeners: number
    growthRate: number
  }
  audience: {
    demographics: {
      ageGroups: { range: string; percentage: number }[]
      gender: { type: string; percentage: number }[]
      topCountries: { country: string; percentage: number }[]
      topCities: { city: string; percentage: number }[]
    }
    engagement: {
      activeFans: number
      superFans: number
      casualListeners: number
      newFollowers: number
    }
  }
  content: {
    performance: {
      tracks: { total: number; avgPlays: number; topTrack: string }
      videos: { total: number; avgViews: number; topVideo: string }
      photos: { total: number; avgLikes: number; topPhoto: string }
      blogs: { total: number; avgReads: number; topBlog: string }
    }
    trends: {
      weeklyGrowth: number
      monthlyGrowth: number
      topPerformingContent: string
    }
  }
  revenue: {
    breakdown: {
      liveShows: number
      merchandise: number
      streaming: number
      collaborations: number
      sponsorships: number
    }
    projections: {
      nextMonth: number
      nextQuarter: number
      nextYear: number
    }
  }
  platforms: {
    spotify: PlatformMetricsBase & { listeners: number; streams: number }
    appleMusic: PlatformMetricsBase & { listeners: number; streams: number }
    youtube: PlatformMetricsBase & { subscribers: number; views: number }
    instagram: PlatformMetricsBase & { followers: number; engagement: number }
    tiktok: PlatformMetricsBase & { followers: number; views: number }
    facebook?: PlatformMetricsBase & { followers: number; engagement: number }
  }
}
