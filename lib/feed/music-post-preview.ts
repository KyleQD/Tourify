import { resolveMusicStreamUrl } from '@/lib/music/upload-helpers'

const TRACK_PREVIEW_SELECT = `
  id,
  user_id,
  title,
  description,
  genre,
  duration,
  cover_art_url,
  tags,
  created_at,
  stats,
  access_mode,
  preview_mode,
  preview_duration_seconds,
  allow_library_add,
  is_public,
  is_featured
`

export interface FeedTrackPreview {
  id: string
  title: string
  artistName: string | null
  artistId: string | null
  artistAvatarUrl: string | null
  artistUsername: string | null
  description: string | null
  genre: string | null
  duration: number
  coverArtUrl: string | null
  tags: string[]
  streamUrl: string
  plays: number
  likes: number
  comments: number
  shares: number
  isPublic: boolean
  isFeatured: boolean
  accessMode: string
  previewMode: string
  previewDurationSeconds: number
  allowLibraryAdd: boolean
  createdAt: string | null
}

export interface FeedMusicPlayerTrack {
  id: string
  title: string
  artist: string
  album?: string
  genre?: string
  duration?: number
  file_url: string
  cover_art_url?: string
  description?: string
  tags: string[]
  is_featured: boolean
  is_public: boolean
  stats: {
    plays: number
    likes: number
    comments: number
    shares: number
  }
  created_at: string
  author?: {
    id: string
    name: string
    username: string
    avatar_url?: string
    is_verified: boolean
  }
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]))
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function getMusicTrackIdFromPost(post: {
  type?: string | null
  metadata?: unknown
  track_preview?: { id?: string | null } | null
  music_track_id?: string | null
}) {
  const metadata = asRecord(post.metadata)
  return (
    asString(post.track_preview?.id) ||
    asString(post.music_track_id) ||
    asString(metadata?.music_track_id) ||
    asString(metadata?.track_id)
  )
}

export function isMusicFeedPost(post: {
  type?: string | null
  metadata?: unknown
  track_preview?: { id?: string | null } | null
  music_track_id?: string | null
}) {
  if (post.type === 'music' || post.type === 'audio') return true
  return Boolean(getMusicTrackIdFromPost(post))
}

export function normalizeTrackPreview(
  row: any,
  profile?: {
    full_name?: string | null
    username?: string | null
    avatar_url?: string | null
  } | null
): FeedTrackPreview {
  const stats = asRecord(row?.stats) || {}
  const id = String(row?.id)

  return {
    id,
    title: asString(row?.title) || 'Untitled track',
    artistName: asString(profile?.full_name) || asString(row?.artist_name) || null,
    artistId: asString(row?.user_id) || null,
    artistAvatarUrl: asString(profile?.avatar_url) || asString(row?.artist_avatar_url) || null,
    artistUsername: asString(profile?.username) || asString(row?.artist_username) || null,
    description: asString(row?.description),
    genre: asString(row?.genre),
    duration: asNumber(row?.duration, 0),
    coverArtUrl: asString(row?.cover_art_url),
    tags: Array.isArray(row?.tags) ? row.tags.filter((tag: unknown) => typeof tag === 'string') : [],
    streamUrl: resolveMusicStreamUrl(id),
    plays: asNumber(stats.plays ?? row?.play_count, 0),
    likes: asNumber(stats.likes ?? row?.likes_count, 0),
    comments: asNumber(stats.comments ?? row?.comments_count, 0),
    shares: asNumber(stats.shares ?? row?.shares_count, 0),
    isPublic: row?.is_public !== false,
    isFeatured: Boolean(row?.is_featured),
    accessMode: asString(row?.access_mode) || 'free',
    previewMode: asString(row?.preview_mode) || 'full',
    previewDurationSeconds: asNumber(row?.preview_duration_seconds, 15),
    allowLibraryAdd: row?.allow_library_add !== false,
    createdAt: asString(row?.created_at),
  }
}

export function getStoredTrackPreview(post: {
  metadata?: unknown
  track_preview?: FeedTrackPreview | null
}): FeedTrackPreview | null {
  if (post.track_preview?.id) return post.track_preview

  const metadata = asRecord(post.metadata)
  if (!metadata) return null

  const trackId = asString(metadata.music_track_id) || asString(metadata.track_id)
  if (!trackId) return null

  return {
    id: trackId,
    title: asString(metadata.track_title) || 'Untitled track',
    artistName: asString(metadata.artist_name),
    artistId: null,
    artistAvatarUrl: null,
    artistUsername: null,
    description: null,
    genre: asString(metadata.genre),
    duration: asNumber(metadata.duration, 0),
    coverArtUrl: asString(metadata.cover_url),
    tags: Array.isArray(metadata.tags)
      ? metadata.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    streamUrl: asString(metadata.stream_url) || resolveMusicStreamUrl(trackId),
    plays: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    isPublic: true,
    isFeatured: false,
    accessMode: 'free',
    previewMode: 'full',
    previewDurationSeconds: 15,
    allowLibraryAdd: true,
    createdAt: null,
  }
}

export async function fetchTrackPreviews(supabase: any, posts: any[]) {
  const trackIds = unique(posts.map(post => getMusicTrackIdFromPost(post)))
  if (trackIds.length === 0) return new Map<string, FeedTrackPreview>()

  const { data, error } = await supabase
    .from('artist_music')
    .select(TRACK_PREVIEW_SELECT)
    .in('id', trackIds)

  if (error) {
    console.warn('[Feed Posts API] Failed to enrich track previews:', error)
    return new Map<string, FeedTrackPreview>()
  }

  const rows = data || []
  const userIds = unique(rows.map((row: any) => row?.user_id))
  let profileMap = new Map<string, any>()

  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', userIds)

    if (profileError)
      console.warn('[Feed Posts API] Failed to enrich track artist profiles:', profileError)
    else
      profileMap = new Map((profiles || []).map((profile: any) => [profile.id, profile]))
  }

  return new Map(
    rows.map((row: any) => [
      String(row.id),
      normalizeTrackPreview(row, profileMap.get(row.user_id) || null),
    ])
  )
}

export function buildFeedMusicTrackFromPost(post: {
  id?: string
  type?: string | null
  content?: string | null
  created_at?: string
  metadata?: unknown
  media_urls?: string[] | null
  track_preview?: FeedTrackPreview | null
  music_track_id?: string | null
  profiles?: {
    id?: string
    full_name?: string | null
    username?: string | null
    avatar_url?: string | null
    is_verified?: boolean | null
  } | null
  account_display_name?: string | null
  account_username?: string | null
  account_avatar_url?: string | null
}): FeedMusicPlayerTrack | null {
  const preview = getStoredTrackPreview(post)
  const trackId = preview?.id || getMusicTrackIdFromPost(post)
  if (!trackId) return null

  const metadata = asRecord(post.metadata)
  const coverFromMedia = Array.isArray(post.media_urls) ? asString(post.media_urls[0]) : null
  const artistName =
    preview?.artistName ||
    asString(metadata?.artist_name) ||
    asString(post.account_display_name) ||
    asString(post.profiles?.full_name) ||
    asString(post.profiles?.username) ||
    'Artist'

  return {
    id: trackId,
    title:
      preview?.title ||
      asString(metadata?.track_title) ||
      asString(post.content)?.slice(0, 80) ||
      'Music track',
    artist: artistName,
    genre: preview?.genre || asString(metadata?.genre) || undefined,
    duration: preview?.duration || asNumber(metadata?.duration, 0) || undefined,
    file_url: preview?.streamUrl || asString(metadata?.stream_url) || resolveMusicStreamUrl(trackId),
    cover_art_url:
      preview?.coverArtUrl || asString(metadata?.cover_url) || coverFromMedia || undefined,
    description: preview?.description || undefined,
    tags: preview?.tags?.length
      ? preview.tags
      : Array.isArray(metadata?.tags)
        ? metadata.tags.filter((tag): tag is string => typeof tag === 'string')
        : [],
    is_featured: Boolean(preview?.isFeatured),
    is_public: preview?.isPublic !== false,
    stats: {
      plays: preview?.plays || 0,
      likes: preview?.likes || 0,
      comments: preview?.comments || 0,
      shares: preview?.shares || 0,
    },
    created_at: preview?.createdAt || post.created_at || new Date().toISOString(),
    author: {
      id: preview?.artistId || post.profiles?.id || '',
      name: artistName,
      username:
        preview?.artistUsername ||
        asString(post.account_username) ||
        asString(post.profiles?.username) ||
        'artist',
      avatar_url:
        preview?.artistAvatarUrl ||
        asString(post.account_avatar_url) ||
        asString(post.profiles?.avatar_url) ||
        undefined,
      is_verified: Boolean(post.profiles?.is_verified),
    },
  }
}
