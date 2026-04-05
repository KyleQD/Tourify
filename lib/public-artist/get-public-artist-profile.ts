import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { epkService } from '@/lib/services/epk.service'
import type { PublicArtistPageDTO, PublicArtistStatsDTO, PublicArtistTrackDTO } from './public-artist-types'
import { extractCreatorCapabilitiesV1 } from '@/lib/creator/capability-system'

function buildStatsDTO(rpcStats: any, fallback: PublicArtistStatsDTO): PublicArtistStatsDTO {
  if (!rpcStats) return fallback

  const followersCount = Number(rpcStats.total_fans ?? fallback.followersCount) || 0
  const futureMonthlyListeners = Number(rpcStats.monthly_listeners ?? fallback.futureMonthlyListeners) || 0
  const totalPlays = Number(rpcStats.total_plays ?? fallback.totalPlays) || 0
  const totalStreams = Number(rpcStats.total_streams ?? fallback.totalStreams) || 0
  const engagementRate = Number(rpcStats.engagement_rate ?? fallback.engagementRate) || 0
  const totalTracks = Number(rpcStats.total_tracks ?? fallback.totalTracks) || 0
  const totalEvents = Number(rpcStats.total_events ?? fallback.totalEvents) || 0
  const totalRevenue = Number(rpcStats.total_revenue ?? fallback.totalRevenue) || 0

  return {
    followersCount,
    futureMonthlyListeners,
    totalPlays,
    totalStreams,
    engagementRate,
    totalTracks,
    totalEvents,
    totalRevenue
  }
}

function buildTrackDTO(trackRow: any): PublicArtistTrackDTO {
  const stats = trackRow?.stats || {}
  return {
    id: trackRow.id,
    title: String(trackRow.title || ''),
    genre: trackRow.genre ?? null,
    durationSeconds: trackRow.duration ?? null,
    releaseDate: trackRow.release_date ?? null,
    audioUrl: trackRow.file_url ?? null,
    artworkUrl: trackRow.cover_art_url ?? null,
    platformUrls: {
      spotify: trackRow.spotify_url ?? null,
      appleMusic: trackRow.apple_music_url ?? null,
      soundcloud: trackRow.soundcloud_url ?? null,
      youtube: trackRow.youtube_url ?? null
    },
    playCount: Number(stats.plays ?? 0) || 0,
    likesCount: Number(stats.likes ?? 0) || 0,
    commentsCount: Number(stats.comments ?? 0) || 0,
    sharesCount: Number(stats.shares ?? 0) || 0,
    downloadsCount: Number(stats.downloads ?? 0) || 0,
    isPinned: Boolean(trackRow.is_pinned),
    isFeatured: Boolean(trackRow.is_featured)
  }
}

export async function getPublicArtistProfileDTO(params: { username: string }): Promise<PublicArtistPageDTO | null> {
  const { username } = params
  if (!username) return null

  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id ?? null

  const today = new Date().toISOString().slice(0, 10)

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select(`
      id,
      username,
      full_name,
      avatar_url,
      cover_image,
      bio,
      location,
      website,
      is_verified,
      followers_count
    `)
    .eq('username', username)
    .single()

  let artistProfileRow: any | null = null
  let resolvedProfile = profileRow

  if (!resolvedProfile || profileError) {
    const { data: artistProfileByName, error: artistByNameError } = await supabase
      .from('artist_profiles')
      .select('id, user_id, artist_name, bio, genres, social_links, settings')
      .ilike('artist_name', username)
      .maybeSingle()

    if (artistByNameError || !artistProfileByName) return null

    const { data: fallbackProfile } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        full_name,
        avatar_url,
        cover_image,
        bio,
        location,
        website,
        is_verified,
        followers_count
      `)
      .eq('id', artistProfileByName.user_id)
      .single()

    resolvedProfile = fallbackProfile
    artistProfileRow = artistProfileByName
  } else {
    const { data: byUserId, error: artistError } = await supabase
      .from('artist_profiles')
      .select('id, user_id, artist_name, bio, genres, social_links, settings')
      .eq('user_id', resolvedProfile.id)
      .single()

    if (artistError) return null
    artistProfileRow = byUserId
  }

  if (!resolvedProfile || !artistProfileRow) return null

  const artistUserId = resolvedProfile.id as string
  const artistId = artistProfileRow.id as string
  const isOwner = Boolean(userId && userId === artistUserId)

  const viewer = {
    isAuthenticated: Boolean(userId),
    userId,
    isOwner
  }

  const banner = resolvedProfile.cover_image
    ? {
      kind: 'image' as const,
      url: resolvedProfile.cover_image,
      thumbnailUrl: resolvedProfile.cover_image
    }
    : null

  const genres = Array.isArray(artistProfileRow.genres) ? artistProfileRow.genres : []
  const futureMonthlyListenersFallback = 0

  const fallbackStats: PublicArtistStatsDTO = {
    followersCount: Number(resolvedProfile.followers_count ?? 0) || 0,
    futureMonthlyListeners: futureMonthlyListenersFallback,
    totalPlays: 0,
    totalStreams: 0,
    engagementRate: 0,
    totalTracks: 0,
    totalEvents: 0,
    totalRevenue: 0
  }

  const [rpcStatsResult, tracksResult, eventsResult, photosResult, videosResult, productsResult, postsResult, epkResult] = await Promise.all([
    (async () => {
      try {
        return await supabase.rpc('get_enhanced_artist_stats', { artist_user_id: artistUserId })
      } catch {
        return null
      }
    })(),
    supabase
      .from('artist_music')
      .select(`
        id,
        title,
        genre,
        release_date,
        duration,
        file_url,
        cover_art_url,
        spotify_url,
        apple_music_url,
        soundcloud_url,
        youtube_url,
        stats,
        created_at,
        is_featured,
        is_pinned,
        is_public
      `)
      .eq('user_id', artistUserId)
      .eq('is_public', true)
      .order('is_pinned', { ascending: false })
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('events')
      .select(`
        id,
        event_date,
        venue_name,
        city,
        state,
        country,
        ticket_url,
        status,
      `)
      .eq('artist_id', artistUserId)
      .eq('status', 'published')
      .gte('event_date', today)
      .order('event_date', { ascending: true })
      .limit(8),
    supabase
      .from('artist_photos')
      .select(`
        id,
        image_url,
        thumbnail_url,
        title,
        description,
        is_featured,
        is_public,
        created_at
      `)
      .eq('user_id', artistUserId)
      .eq('is_public', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('artist_videos')
      .select(`
        id,
        video_url,
        thumbnail_url,
        title,
        description,
        is_featured,
        is_public,
        created_at
      `)
      .eq('user_id', artistUserId)
      .eq('is_public', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('artist_merchandise')
      .select(`
        id,
        name,
        description,
        type,
        price,
        currency,
        inventory_count,
        images,
        is_featured,
        status,
        created_at
      `)
      .eq('user_id', artistUserId)
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('posts')
      .select(`
        id,
        user_id,
        content,
        media_urls,
        type,
        visibility,
        location,
        hashtags,
        likes_count,
        comments_count,
        shares_count,
        created_at,
        is_pinned
      `)
      .eq('user_id', artistUserId)
      .eq('visibility', 'public')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
    epkService.getPublicEPKData(resolvedProfile.username || artistProfileRow.artist_name)
  ])

  const rpcStats = rpcStatsResult?.data
  const stats = buildStatsDTO(rpcStats, fallbackStats)

  const tracksRows = tracksResult?.data || []
  const tracks = tracksRows.map(buildTrackDTO)

  const featuredTrack = tracks.find(t => t.isFeatured) ?? null
  const defaultTrackId = featuredTrack?.id ?? tracks[0]?.id ?? null

  const photos = photosResult?.data || []
  const videos = videosResult?.data || []

  const mediaItems = [
    ...photos.map((p: any) => ({
      id: p.id,
      kind: 'photo' as const,
      url: p.image_url,
      thumbnailUrl: p.thumbnail_url,
      caption: p.title ?? p.description ?? null,
      isHero: Boolean(p.is_featured)
    })),
    ...videos.map((v: any) => ({
      id: v.id,
      kind: 'video' as const,
      url: v.video_url,
      thumbnailUrl: v.thumbnail_url,
      caption: v.title ?? v.description ?? null,
      isHero: Boolean(v.is_featured)
    }))
  ]

  const productRows = productsResult?.data || []
  const products = productRows.map((p: any) => {
    const firstImage = Array.isArray(p.images) && p.images.length ? p.images[0] : null
    return {
      id: p.id,
      name: String(p.name || 'Untitled Product'),
      description: p.description ?? null,
      type: p.type ?? null,
      price: typeof p.price === 'number' ? p.price : Number(p.price ?? 0) || 0,
      currency: p.currency ?? 'USD',
      inventoryCount: Number(p.inventory_count ?? 0) || 0,
      imageUrl: firstImage ? String(firstImage) : null,
      isFeatured: Boolean(p.is_featured),
      status: p.status ?? null
    }
  })
  const featuredProducts = products.filter((p: any) => p.isFeatured)

  const eventsRows = eventsResult?.data || []
  const upcomingEvents = eventsRows.map((e: any) => ({
    id: e.id,
    eventDate: String(e.event_date),
    venueName: e.venue_name ?? null,
    location: [e.city, e.state, e.country].filter(Boolean).join(', ') || null,
    ticketUrl: e.ticket_url ?? null,
    status: e.status ?? 'upcoming'
  }))

  const postsRows = postsResult?.data || []
  const authorIds = Array.from(new Set(postsRows.map((p: any) => p.user_id).filter(Boolean)))
  const { data: authorsRows } = authorIds.length
    ? await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', authorIds)
    : { data: [] as any[] }

  const authorNameById = (authorsRows || []).reduce<Record<string, string>>((acc, a: any) => {
    const name = a.full_name || a.username || a.id
    acc[String(a.id)] = String(name)
    return acc
  }, {})

  const postsPublic = postsRows.map((p: any) => ({
    id: p.id,
    authorUserId: p.user_id,
    authorName: authorNameById[String(p.user_id)] ?? 'Artist',
    createdAt: p.created_at,
    content: p.content,
    type: p.type,
    visibility: p.visibility ?? null,
    location: p.location ?? null,
    hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
    mediaUrls: Array.isArray(p.media_urls) ? p.media_urls : [],
    likesCount: p.likes_count ?? 0,
    commentsCount: p.comments_count ?? 0,
    sharesCount: p.shares_count ?? 0,
    isPinned: Boolean(p.is_pinned)
  }))

  const pinnedPosts = postsPublic.filter(p => p.isPinned)
  const posts = postsPublic.filter(p => !p.isPinned)

 const settings = artistProfileRow.settings && typeof artistProfileRow.settings === 'object'
    ? artistProfileRow.settings
    : {}
  const professional = (settings as { professional?: Record<string, unknown> }).professional || {}
  const creatorCapabilities = extractCreatorCapabilitiesV1(settings)

  const creatorType = creatorCapabilities.creatorType
  const serviceOfferings = creatorCapabilities.serviceOfferings
  const productsForSale = creatorCapabilities.productsForSale
  const credentials = creatorCapabilities.credentials
  const workHighlights = creatorCapabilities.workHighlights
  const availableForHire = creatorCapabilities.availableForHire
  const collaborationInterest = creatorCapabilities.collaborationInterest
  const bookingRate = (professional['booking_rate'] as string | undefined)?.trim() || null
  const availability = creatorCapabilities.availability
  const preferredContact = creatorCapabilities.preferredContact

  const professionalLocation =
    (professional['location'] as string | undefined)?.trim() || null

  const aboutBio = artistProfileRow.bio ?? resolvedProfile.bio ?? null

  const epk = epkResult ?? null

  return {
    viewer,
    hero: {
      artistId,
      userId: artistUserId,
      artistName: String(artistProfileRow.artist_name || resolvedProfile.full_name || resolvedProfile.username),
      verified: Boolean(resolvedProfile.is_verified),
      genres,
      location: resolvedProfile.location ?? professionalLocation,
      avatarUrl: resolvedProfile.avatar_url ?? null,
      banner,
      followersCount: stats.followersCount,
      futureMonthlyListeners: stats.futureMonthlyListeners
    },
    about: {
      bio: aboutBio
    },
    tracks: {
      featuredTrack,
      tracks,
      defaultTrackId
    },
    events: {
      upcomingEvents
    },
    media: {
      items: mediaItems
    },
    products: {
      featuredProducts,
      products
    },
    posts: {
      pinnedPosts,
      posts
    },
    stats: {
      followersCount: stats.followersCount,
      futureMonthlyListeners: stats.futureMonthlyListeners,
      totalPlays: stats.totalPlays,
      totalStreams: stats.totalStreams,
      engagementRate: stats.engagementRate,
      totalTracks: stats.totalTracks,
      totalEvents: stats.totalEvents,
      totalRevenue: stats.totalRevenue
    },
    creator: {
      primaryCreatorType: creatorType,
      serviceOfferings,
      productsForSale,
      credentials,
      workHighlights,
      availableForHire,
      collaborationInterest,
      bookingRate,
      availability,
      preferredContact
    },
    epk: {
      epk
    }
  }
}

