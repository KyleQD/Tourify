/**
 * Canonical artist dashboard stats.
 *
 * DB-008 code-drift cluster "artist": the artist dashboard used to read the RPC
 * `get_enhanced_artist_stats`, which the active migration chain never creates
 * (only `supabase/migrations/archive/**` and `supabase/optimize-artist-backend.sql`
 * define it). The RPC always failed, so the dashboard showed zeros, and its
 * fallback counted `artist_photos` / `artist_videos` / `artist_merchandise`,
 * none of which exist in the chain either.
 *
 * Every count below is derived from an in-chain relation:
 * - followers      -> `profiles.followers_count`
 * - music/plays    -> `artist_music` (`is_public` / `is_visible` / approved)
 * - photos         -> `artist_epk_settings.settings.photoItems` (canonical media store)
 * - merchandise    -> `marketplace_listings` (canonical merch surface)
 * - blog posts     -> `artist_blog_posts` (`status = 'published'`)
 * - events         -> `events` (artist events)
 * - collaborations -> `collaboration_projects` owned by the artist
 * - revenue        -> `artist_financial_transactions` income/royalty rows
 */

export interface ArtistStatsCounts {
  totalRevenue: number
  totalFans: number
  totalStreams: number
  engagementRate: number
  monthlyListeners: number
  totalTracks: number
  totalEvents: number
  totalCollaborations: number
  musicCount: number
  /** No in-chain artist video relation exists (DB-008); always 0. */
  videoCount: number
  photoCount: number
  blogCount: number
  eventCount: number
  merchandiseCount: number
  totalPlays: number
  totalViews: number
}

export interface ArtistStatsSources {
  followerCount?: number | null
  tracks?: Array<{ stats?: unknown }> | null
  events?: number | null
  blogCount?: number | null
  photoCount?: number | null
  merchandiseCount?: number | null
  collaborationCount?: number | null
  revenue?: number | null
  postCount?: number | null
  monthlyListeners?: number | null
}

function toCount(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

/** Sum `stats.plays` across artist_music rows. */
export function sumTrackPlays(tracks: Array<{ stats?: unknown }> | null | undefined): number {
  return (tracks || []).reduce((sum, track) => {
    const stats = track?.stats
    if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return sum
    return sum + toCount((stats as Record<string, unknown>).plays)
  }, 0)
}

/** Sum `stats.likes` across artist_music rows (engagement numerator). */
export function sumTrackLikes(tracks: Array<{ stats?: unknown }> | null | undefined): number {
  return (tracks || []).reduce((sum, track) => {
    const stats = track?.stats
    if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return sum
    return sum + toCount((stats as Record<string, unknown>).likes)
  }, 0)
}

export function buildArtistStats(sources: ArtistStatsSources): ArtistStatsCounts {
  const tracks = sources.tracks || []
  const followerCount = toCount(sources.followerCount)
  const totalLikes = sumTrackLikes(tracks)
  const totalPlays = sumTrackPlays(tracks)
  const postCount = toCount(sources.postCount)

  return {
    totalRevenue: toCount(sources.revenue),
    totalFans: followerCount,
    totalStreams: totalPlays,
    // Follower-normalized like rate as a percentage (the dashboard renders it
    // with a `%` suffix), capped so a tiny follower base cannot show an
    // unbounded percentage.
    engagementRate:
      followerCount > 0 ? Math.min(100, Math.round((totalLikes / followerCount) * 10000) / 100) : 0,
    monthlyListeners: toCount(sources.monthlyListeners),
    totalTracks: tracks.length,
    totalEvents: toCount(sources.events),
    totalCollaborations: toCount(sources.collaborationCount),
    musicCount: tracks.length,
    videoCount: 0,
    photoCount: toCount(sources.photoCount),
    blogCount: toCount(sources.blogCount),
    eventCount: toCount(sources.events),
    merchandiseCount: toCount(sources.merchandiseCount),
    totalPlays,
    totalViews: postCount,
  }
}

export const EMPTY_ARTIST_STATS: ArtistStatsCounts = buildArtistStats({})
