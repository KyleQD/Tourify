import { getDiscoverFeed } from "@/lib/api/discover"
import { getPulseArticles, type PulseArticle } from "@/lib/api/pulse"

export interface FeaturedArtist {
  id: string
  username: string
  displayName: string
  followers: number
  avatarUrl?: string | null
}

export interface FeaturedSong {
  id: string
  title: string
  artistName: string
  artistId?: string
  coverArtUrl?: string | null
}

export interface FeaturedStory {
  article: PulseArticle | null
  artist: FeaturedArtist | null
  song: FeaturedSong | null
}

function articleScore(article: PulseArticle): number {
  const metrics = article.metrics
  if (!metrics) return 0
  return (metrics.views || 0) + (metrics.likes || 0)
}

export async function getFeaturedStory(): Promise<FeaturedStory> {
  const [articles, discover] = await Promise.all([
    getPulseArticles(20).catch(() => []),
    getDiscoverFeed({ intent: "grow" }).catch(() => null),
  ])

  const topArticle =
    [...articles].sort((a, b) => {
      const scoreDiff = articleScore(b) - articleScore(a)
      if (scoreDiff !== 0) return scoreDiff
      return (b.publishedAt || "").localeCompare(a.publishedAt || "")
    })[0] ?? null

  const artists = (discover?.sections?.artists ?? []) as Array<{
    id: string
    username: string
    display_name: string
    avatar_url?: string | null
    stats?: { followers?: number }
  }>
  const topArtistRaw =
    [...artists].sort((a, b) => (b.stats?.followers ?? 0) - (a.stats?.followers ?? 0))[0] ?? null
  const artist: FeaturedArtist | null = topArtistRaw
    ? {
        id: topArtistRaw.id,
        username: topArtistRaw.username,
        displayName: topArtistRaw.display_name || topArtistRaw.username,
        followers: topArtistRaw.stats?.followers ?? 0,
        avatarUrl: topArtistRaw.avatar_url ?? null,
      }
    : null

  const trendingMusic = (discover?.sections?.trending_music ?? []) as Array<{
    id: string
    title: string
    artist_name: string
    artist_id?: string
    cover_art_url?: string | null
  }>
  const topSong = trendingMusic[0] ?? null
  const song: FeaturedSong | null = topSong
    ? {
        id: topSong.id,
        title: topSong.title,
        artistName: topSong.artist_name,
        artistId: topSong.artist_id,
        coverArtUrl: topSong.cover_art_url ?? null,
      }
    : null

  return { article: topArticle, artist, song }
}
