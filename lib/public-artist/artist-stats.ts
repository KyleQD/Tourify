/**
 * Canonical public artist stats derivation.
 *
 * DB-008 code-drift cluster "artist": the RPC `get_enhanced_artist_stats` is not
 * created by the active migration chain (only `supabase/migrations/archive/**`
 * and `supabase/optimize-artist-backend.sql` define it) and is not declared by
 * `lib/database.types.ts`, so every caller silently fell back to zeros. Public
 * stats are therefore derived from the canonical rows the profile already reads:
 * `artist_music.stats`, `events.revenue` and `profiles.followers_count`.
 *
 * `monthly_listeners` / `engagement_rate` have no in-chain source, so they stay
 * at the caller-provided fallback rather than being invented here.
 */

export interface PublicArtistStatsSources {
  /** `profiles.followers_count` for the artist (already resolved by the caller). */
  followerCount?: number | null
  /** Rows from the public `artist_music` filter (is_public/is_visible/approved/rights_confirmed). */
  tracks?: Array<{ playCount?: number | null; likesCount?: number | null }> | null
  /** Rows from the published `events` filter for the artist. */
  events?: Array<{ revenue?: number | null }> | null
  /** Monthly listeners have no in-chain source today. */
  monthlyListeners?: number | null
}

export interface DerivedPublicArtistStats {
  followersCount: number
  futureMonthlyListeners: number
  totalPlays: number
  totalStreams: number
  engagementRate: number
  totalTracks: number
  totalEvents: number
  totalRevenue: number
}

function toCount(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function derivePublicArtistStats(sources: PublicArtistStatsSources): DerivedPublicArtistStats {
  const tracks = sources.tracks || []
  const events = sources.events || []

  const totalPlays = tracks.reduce((sum, track) => sum + toCount(track.playCount), 0)
  const totalLikes = tracks.reduce((sum, track) => sum + toCount(track.likesCount), 0)
  const followersCount = toCount(sources.followerCount)
  const totalEvents = events.length

  return {
    followersCount,
    futureMonthlyListeners: toCount(sources.monthlyListeners),
    totalPlays,
    totalStreams: totalPlays,
    // Follower-normalized like rate as a percentage (the public profile renders
    // it with a `%` suffix), capped so a tiny follower base cannot show an
    // unbounded percentage.
    engagementRate:
      followersCount > 0
        ? Math.min(100, Math.round((totalLikes / followersCount) * 10000) / 100)
        : 0,
    totalTracks: tracks.length,
    totalEvents,
    totalRevenue: events.reduce((sum, event) => sum + toCount(event.revenue), 0),
  }
}
