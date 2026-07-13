import { createClient } from '@/lib/supabase/server'
import { epkService } from '@/lib/services/epk.service'
import type { PublicArtistPageDTO, PublicArtistStatsDTO, PublicArtistTrackDTO } from './public-artist-types'
import { extractCreatorCapabilitiesV1 } from '@/lib/creator/capability-system'
import { getAccountAuthor } from '@/lib/accounts/account-author'
import { isArtistEventDiscoverable } from '@/lib/artist/artist-event-visibility'
import { hydratePostsWithPolls } from '@/lib/polls/hydrate-polls'
import { listPublicSocialLinks } from '@/lib/artist/resolve-public-social-url'

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

function buildTrackDTO(trackRow: any, listingByTrackId: Record<string, any> = {}): PublicArtistTrackDTO {
  const stats = trackRow?.stats || {}
  const listing = listingByTrackId[String(trackRow.id)] || null
  return {
    id: trackRow.id,
    title: String(trackRow.title || ''),
    genre: trackRow.genre ?? null,
    durationSeconds: trackRow.duration ?? null,
    releaseDate: trackRow.release_date ?? null,
    audioUrl: trackRow.id ? `/api/music/stream?trackId=${trackRow.id}` : null,
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
    isFeatured: Boolean(trackRow.is_featured),
    accessMode: trackRow.access_mode === 'paid' ? 'paid' : 'free',
    previewMode: trackRow.preview_mode === 'clip' ? 'clip' : 'full',
    previewDurationSeconds: Number(trackRow.preview_duration_seconds ?? 15) || 15,
    allowLibraryAdd: trackRow.allow_library_add !== false,
    allowProfileFeature: trackRow.allow_profile_feature !== false,
    listingId: listing?.id || null
  }
}

export async function getPublicArtistProfileDTO(params: { username: string }): Promise<PublicArtistPageDTO | null> {
  const { username } = params
  if (!username) return null

  const supabase = await createClient()

  const { data: authData } = await supabase.auth.getUser()
  const userId = authData?.user?.id ?? null

  const today = new Date().toISOString().slice(0, 10)

  const artistSelect = 'id, user_id, artist_name, url_slug, bio, genres, social_links, settings'
  const profileSelect = `
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
    `

  // 1) Canonical: artist_profiles.url_slug
  const { data: artistBySlug } = await supabase
    .from('artist_profiles')
    .select(artistSelect)
    .eq('url_slug', username)
    .maybeSingle()

  let artistProfileRow: any | null = artistBySlug || null
  let resolvedProfile: any | null = null

  if (artistProfileRow) {
    const { data: profileByOwner } = await supabase
      .from('profiles')
      .select(profileSelect)
      .eq('id', artistProfileRow.user_id)
      .single()
    resolvedProfile = profileByOwner
  }

  // 2) Legacy: profiles.username
  if (!resolvedProfile || !artistProfileRow) {
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select(profileSelect)
      .eq('username', username)
      .single()

    if (profileRow && !profileError) {
      resolvedProfile = profileRow
      const { data: byUserId, error: artistError } = await supabase
        .from('artist_profiles')
        .select(artistSelect)
        .eq('user_id', profileRow.id)
        .single()

      if (!artistError && byUserId) artistProfileRow = byUserId
    }
  }

  // 3) Legacy: ilike artist_name (old bookmarks / raw display-name links)
  if (!resolvedProfile || !artistProfileRow) {
    const { data: artistProfileByName, error: artistByNameError } = await supabase
      .from('artist_profiles')
      .select(artistSelect)
      .ilike('artist_name', username)
      .maybeSingle()

    if (!artistByNameError && artistProfileByName) {
      const { data: fallbackProfile } = await supabase
        .from('profiles')
        .select(profileSelect)
        .eq('id', artistProfileByName.user_id)
        .single()

      resolvedProfile = fallbackProfile
      artistProfileRow = artistProfileByName
    }
  }

  if (!resolvedProfile || !artistProfileRow) return null

  const artistSettings =
    artistProfileRow.settings && typeof artistProfileRow.settings === 'object'
      ? (artistProfileRow.settings as Record<string, unknown>)
      : {}
  const isPublicProfile = artistSettings.public_profile !== false

  const artistUserId = resolvedProfile.id as string
  const artistId = artistProfileRow.id as string
  const isOwner = Boolean(userId && userId === artistUserId)

  // Private artist personas are only visible to their owner
  if (!isPublicProfile && !isOwner) return null

  const viewer = {
    isAuthenticated: Boolean(userId),
    userId,
    isOwner,
    isPublicProfile,
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

  const [rpcStatsResult, tracksResult, eventsResult, photosResult, videosResult, postsResult, epkResult] = await Promise.all([
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
        is_public,
        is_visible,
        moderation_status,
        rights_confirmed,
        access_mode,
        preview_mode,
        preview_duration_seconds,
        allow_library_add,
        allow_profile_feature
      `)
      .eq('user_id', artistUserId)
      .eq('is_public', true)
      .eq('is_visible', true)
      .eq('moderation_status', 'approved')
      .eq('rights_confirmed', true)
      .order('is_pinned', { ascending: false })
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('events')
      .select(`
        id,
        title,
        name,
        slug,
        event_date,
        venue_name,
        city,
        state,
        country,
        ticket_url,
        status,
        producer_settings,
        is_public
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
        is_pinned,
        posted_as_profile_id,
        posted_as_type,
        account_display_name,
        account_username,
        account_avatar_url,
        account_is_verified,
        content_ref_type,
        content_ref_id,
        poll_ends_at,
        poll_total_votes,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('posted_as_profile_id', artistId)
      .in('visibility', isOwner ? ['public', 'followers'] : ['public'])
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
    epkService.getPublicEPKData(resolvedProfile.username || artistProfileRow.artist_name)
  ])

  const rpcStats = rpcStatsResult?.data
  const stats = buildStatsDTO(rpcStats, fallbackStats)

  const tracksRows = tracksResult?.data || []
  const trackIds = tracksRows.map((track: any) => track.id).filter(Boolean)
  let listingByTrackId: Record<string, any> = {}
  if (trackIds.length > 0) {
    const { data: listings } = await supabase
      .from('marketplace_listings')
      .select('id, music_track_id, status, base_price, currency')
      .in('music_track_id', trackIds)
      .eq('category', 'music')
      .eq('status', 'published')

    listingByTrackId = (listings || []).reduce((acc: Record<string, any>, listing: any) => {
      if (listing.music_track_id) acc[String(listing.music_track_id)] = listing
      return acc
    }, {})
  }
  const tracks = tracksRows.map((track: any) => buildTrackDTO(track, listingByTrackId))

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

  // Storefront catalog lives in marketplace_listings (loaded client-side via discover).
  // Legacy artist_merchandise is no longer rendered on the public profile.
  const products: PublicArtistPageDTO['products']['products'] = []
  const featuredProducts: PublicArtistPageDTO['products']['featuredProducts'] = []

  const eventsRows = (eventsResult?.data || []).filter(isArtistEventDiscoverable)
  const upcomingEvents = eventsRows.map((e: any) => ({
    id: e.id,
    title: e.title || e.name || null,
    slug: e.slug || null,
    eventDate: String(e.event_date),
    venueName: e.venue_name ?? null,
    location: [e.city, e.state, e.country].filter(Boolean).join(', ') || null,
    ticketUrl: e.ticket_url ?? null,
    status: e.status ?? 'upcoming'
  }))

  const postsRows = postsResult?.data || []
  const hydratedPosts = await hydratePostsWithPolls({
    supabase,
    posts: postsRows,
    viewerUserId: userId,
  })

  // Non-owners: also surface followers-only posts if they follow this artist account
  let followerVisiblePosts: any[] = []
  if (!isOwner && userId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('profile_id', artistId)
      .maybeSingle()

    if (account?.id) {
      const { data: follow } = await supabase
        .from('account_follows')
        .select('id')
        .eq('account_id', account.id)
        .eq('follower_user_id', userId)
        .maybeSingle()

      if (follow) {
        const { data: followerPosts } = await supabase
          .from('posts')
          .select(`
            id, user_id, content, media_urls, type, visibility, location, hashtags,
            likes_count, comments_count, shares_count, created_at, is_pinned,
            posted_as_profile_id, posted_as_type, account_display_name, account_username,
            account_avatar_url, poll_ends_at, poll_total_votes,
            profiles:user_id (id, username, full_name, avatar_url, is_verified)
          `)
          .eq('posted_as_profile_id', artistId)
          .eq('visibility', 'followers')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(20)

        followerVisiblePosts = await hydratePostsWithPolls({
          supabase,
          posts: followerPosts || [],
          viewerUserId: userId,
        })
      }
    }
  }

  const allPostRows = [...hydratedPosts, ...followerVisiblePosts]
  const seenPostIds = new Set<string>()
  const postsPublic = allPostRows
    .filter((p: any) => {
      if (seenPostIds.has(p.id)) return false
      seenPostIds.add(p.id)
      return true
    })
    .map((p: any) => {
      const author = getAccountAuthor(p)

      return {
        id: p.id,
        authorUserId: p.user_id,
        authorName: author.name || String(artistProfileRow.artist_name || 'Artist'),
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
        isPinned: Boolean(p.is_pinned),
        poll: p.poll || null,
      }
    })

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

  const socialLinks = listPublicSocialLinks(
    (artistProfileRow.social_links && typeof artistProfileRow.social_links === 'object'
      ? artistProfileRow.social_links
      : {}) as Record<string, string>
  ).map(link => ({
    platform: link.platform,
    label: link.label,
    url: link.url,
  }))

  const { data: membershipRows } = await supabase
    .from('organization_artist_members')
    .select('role, organizer_accounts(id, organization_name, url_slug, subtype)')
    .eq('artist_profile_id', artistProfileRow.id)
    .eq('status', 'accepted')

  const organizations = (membershipRows || [])
    .map((row: any) => {
      const org = row.organizer_accounts
      if (!org?.id) return null
      return {
        organizationId: String(org.id),
        name: String(org.organization_name || 'Organization'),
        slug: org.url_slug ? String(org.url_slug) : null,
        role: String(row.role || 'member'),
        subtype: org.subtype ? String(org.subtype) : null,
      }
    })
    .filter(Boolean) as PublicArtistPageDTO['organizations']

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
    socialLinks,
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
    },
    organizations
  }
}
