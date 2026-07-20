import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { discoverResponseSchema } from '@tourify/api-contracts'
import { createClient } from '@/lib/supabase/server'
import {
  attachTopTracksToArtists,
  fetchTopAlbumsByGenre,
} from '@/lib/discover/enrich'
import {
  normalizeEventsFromDiscover,
  normalizeMusicTracks,
  normalizeProfilesFromEnhanced,
} from '@/lib/discover/normalize'
import {
  matchesLocationFields,
  sortEventsByLocationBoost,
} from '@/lib/discover/location-match'
import { rankNewArtists, rankTopSongs } from '@/lib/discover/ranking'
import { fetchDiscoverTours } from '@/lib/discover/tours'
import type {
  DiscoverEvent,
  DiscoverMusicTrack,
  DiscoverProfile,
  DiscoverTour,
} from '@/lib/discover/types'

interface DiscoverPost {
  id: string
  content: string
  created_at: string
  likes_count: number
  comments_count: number
  shares_count: number
  profiles: {
    id: string
    username: string
    full_name?: string
    avatar_url?: string
    is_verified?: boolean
  }
}

interface DiscoverResponse {
  success: boolean
  sections: {
    for_you: Array<{
      id: string
      item_type: 'post' | 'event' | 'profile'
      score: number
      post?: DiscoverPost
      event?: DiscoverEvent
      profile?: DiscoverProfile
    }>
    trending: DiscoverPost[]
    upcoming: DiscoverEvent[]
    people: DiscoverProfile[]
    artists: DiscoverProfile[]
    venues: DiscoverProfile[]
    organizations: DiscoverProfile[]
    suggestions: DiscoverProfile[]
    hire_matches: DiscoverProfile[]
    new_music: DiscoverMusicTrack[]
    trending_music: DiscoverMusicTrack[]
    top_songs: DiscoverMusicTrack[]
    top_albums_by_genre: Awaited<ReturnType<typeof fetchTopAlbumsByGenre>>
    tours: DiscoverTour[]
    new_artists: DiscoverProfile[]
    nearby_events: DiscoverEvent[]
  }
  stats: {
    trending_count: number
    upcoming_count: number
    people_count: number
    suggestions_count: number
    hire_matches_count: number
  }
  generated_at: string
}

type DiscoverIntent = 'grow' | 'network' | 'book' | 'learn'

function parseJsonSafe(value: string): any {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function scorePostEngagement(post: DiscoverPost) {
  const likes = post.likes_count || 0
  const comments = post.comments_count || 0
  const shares = post.shares_count || 0
  const engagement = likes * 1 + comments * 2 + shares * 3
  const ageHours = Math.max(
    1,
    (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60)
  )
  const decay = Math.pow(ageHours + 2, 1.15)
  return engagement / decay + likes * 0.05
}

function rankTrendingPosts(posts: DiscoverPost[], limit: number) {
  return [...posts]
    .filter((post) => post.id && post.content)
    .sort((first, second) => scorePostEngagement(second) - scorePostEngagement(first))
    .slice(0, limit)
}

function locationBoostedProfiles(profiles: DiscoverProfile[], location: string | null) {
  if (!location) return profiles
  return [...profiles].sort((first, second) => {
    const firstNearby = matchesLocationFields(location, first.location)
    const secondNearby = matchesLocationFields(location, second.location)
    if (firstNearby === secondNearby) return (second.stats.followers || 0) - (first.stats.followers || 0)
    return firstNearby ? -1 : 1
  })
}

function normalizePostsFromFeed(payload: any): DiscoverPost[] {
  const records = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.posts)
      ? payload.posts
      : []

  return records
    .map((post: any) => ({
      id: String(post.id || ''),
      content: String(post.content || ''),
      created_at: String(post.created_at || new Date().toISOString()),
      likes_count: Number(post.likes_count || post.like_count || 0),
      comments_count: Number(post.comments_count || 0),
      shares_count: Number(post.shares_count || 0),
      profiles: {
        id: String(post?.profiles?.id || post?.user?.id || post?.user_id || ''),
        username: String(
          post?.account_username ||
            post?.profiles?.username ||
            post?.user?.username ||
            'user'
        ),
        full_name:
          post?.account_display_name ||
          post?.profiles?.full_name ||
          post?.user?.full_name ||
          '',
        avatar_url:
          post?.account_avatar_url ||
          post?.profiles?.avatar_url ||
          post?.user?.avatar_url ||
          '',
        is_verified: Boolean(post?.profiles?.is_verified || post?.user?.verified),
      },
    }))
    .filter((post: DiscoverPost) => Boolean(post.id))
}

function normalizeSuggestions(payload: any): DiscoverProfile[] {
  const suggestions = Array.isArray(payload?.suggestions)
    ? payload.suggestions
    : Array.isArray(payload?.users)
      ? payload.users
      : []

  return suggestions
    .map((item: any) => {
      const accountType =
        item.account_type === 'artist' || item.account_type === 'venue'
          ? item.account_type
          : item.account_type === 'organization' ||
              item.account_type === 'organizer' ||
              item.account_type === 'business'
            ? 'organization'
            : 'general'
      const ownerUserId = String(item.owner_user_id || item.user_id || item.id || '')
      return {
        id: ownerUserId,
        username: String(item.username || ''),
        account_type: accountType as DiscoverProfile['account_type'],
        display_name: String(item.full_name || item.display_name || item.username || 'User'),
        avatar_url: item.avatar_url || null,
        bio: item.bio || '',
        location: item.location || null,
        verified: Boolean(item.is_verified || item.verified),
        stats: {
          followers: Number(item.followers_count || item.followers || 0),
          following: Number(item.following_count || 0),
          posts: Number(item.posts_count || 0),
        },
        owner_user_id: ownerUserId || null,
        account_id: item.account_id ? String(item.account_id) : null,
        genres: [],
        created_at: item.created_at || null,
        top_track: null,
      }
    })
    .filter((profile: DiscoverProfile) => profile.id && profile.username)
}

function rankForYou({
  location,
  posts,
  events,
  people,
  suggestions,
}: {
  location?: string | null
  posts: DiscoverPost[]
  events: DiscoverEvent[]
  people: DiscoverProfile[]
  suggestions: DiscoverProfile[]
}) {
  const scoredPosts = posts.slice(0, 8).map((post, index) => ({
    id: `post-${post.id}`,
    item_type: 'post' as const,
    score: Math.round(100 - index * 4 + scorePostEngagement(post)),
    post,
  }))

  const scoredEvents = events.slice(0, 8).map((event, index) => {
    const isNearby = location
      ? matchesLocationFields(location, event.venue_city, event.venue_state)
      : false

    return {
      id: `event-${event.id}`,
      item_type: 'event' as const,
      score: Math.round(
        110 -
          index * 4 +
          (event.attendance.total > 0 ? 8 : 0) +
          (isNearby ? 20 : 0)
      ),
      event,
    }
  })

  const scoredProfiles = [...suggestions, ...people]
    .filter(
      (profile) =>
        profile.account_type === 'artist' ||
        profile.account_type === 'venue' ||
        profile.account_type === 'organization'
    )
    .slice(0, 10)
    .map((profile, index) => {
      const isNearby = location ? matchesLocationFields(location, profile.location) : false
      return {
        id: `profile-${profile.id}`,
        item_type: 'profile' as const,
        score: Math.round(
          95 - index * 3 + (profile.verified ? 4 : 0) + (isNearby ? 12 : 0)
        ),
        profile,
      }
    })

  return [...scoredEvents, ...scoredProfiles, ...scoredPosts]
    .sort((first, second) => second.score - first.score)
    .slice(0, 12)
}

function rankHireMatches({
  profiles,
  location,
  creatorType,
  service,
}: {
  profiles: DiscoverProfile[]
  location?: string | null
  creatorType?: string | null
  service?: string | null
}) {
  const locationLower = location?.toLowerCase() || null
  const creatorTypeLower = creatorType?.toLowerCase() || null
  const serviceLower = service?.toLowerCase() || null

  return [...profiles]
    .map((profile) => {
      let score = 0
      if (profile.available_for_hire) score += 40
      if (profile.verified) score += 15
      score += Math.min(20, Math.floor((profile.stats.followers || 0) / 1000) * 2)

      if (locationLower && profile.location?.toLowerCase().includes(locationLower)) score += 10
      if (creatorTypeLower && profile.creator_type?.toLowerCase().includes(creatorTypeLower)) score += 15
      if (
        serviceLower &&
        (profile.service_offerings || []).some((item) => item.toLowerCase().includes(serviceLower))
      )
        score += 15

      return { profile, score }
    })
    .sort((first, second) => second.score - first.score)
    .map((entry) => entry.profile)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 30)
  const sectionLimit = Math.max(4, Math.min(limit, 12))
  const location = searchParams.get('location')?.trim() || null
  const creatorType = searchParams.get('creatorType')?.trim() || null
  const service = searchParams.get('service')?.trim() || null
  const availableForHire = searchParams.get('availableForHire') === 'true'
  const intentParam = searchParams.get('intent')
  const intent: DiscoverIntent =
    intentParam === 'network' || intentParam === 'book' || intentParam === 'learn'
      ? intentParam
      : 'grow'
  void intent

  const authResult = await authenticateApiRequest(request)
  const supabase = await createClient()

  const headers: Record<string, string> = { 'content-type': 'application/json' }
  const cookie = request.headers.get('cookie')
  if (cookie) headers.cookie = cookie

  const fetchJson = async (path: string) => {
    try {
      const response = await fetch(`${origin}${path}`, { headers, cache: 'no-store' })
      if (!response.ok) return null
      const text = await response.text()
      return parseJsonSafe(text)
    } catch (error) {
      console.error(`[Discover API] Failed request for ${path}:`, error)
      return null
    }
  }

  const eventsDiscoverParams = new URLSearchParams({
    limit: String(sectionLimit * 2),
    sortBy: location ? 'relevance' : 'date',
  })
  if (location) eventsDiscoverParams.set('location', location)

  const postsLimit = Math.max(sectionLimit * 3, 24)
  const musicLimit = Math.max(sectionLimit * 3, 36)

  const [
    postsPayload,
    eventsPayload,
    newMusicPayload,
    trendingMusicPayload,
    popularMusicPayload,
    suggestionsPayload,
    topAlbumsByGenre,
    tours,
  ] = await Promise.all([
    fetchJson(`/api/feed/posts?type=all&limit=${postsLimit}&offset=0`),
    fetchJson(`/api/events/discover?${eventsDiscoverParams.toString()}`),
    fetchJson(`/api/feed/music?sortBy=recent&limit=${musicLimit}`),
    fetchJson(`/api/feed/music?sortBy=trending&limit=${musicLimit}`),
    fetchJson(`/api/feed/music?sortBy=popular&limit=${musicLimit}`),
    authResult ? fetchJson(`/api/social/suggested?limit=${sectionLimit}`) : Promise.resolve(null),
    fetchTopAlbumsByGenre({ supabase, limit: 8 }),
    fetchDiscoverTours({ limit: sectionLimit }),
  ])

  const feedPosts = normalizePostsFromFeed(postsPayload)
  const trendingPosts = rankTrendingPosts(feedPosts, sectionLimit)

  // Full upcoming pool from events + events_v2 (+ artist_events); location only boosts order.
  const platformEvents = sortEventsByLocationBoost(
    normalizeEventsFromDiscover(eventsPayload),
    location
  )
  const upcomingEvents = platformEvents.slice(0, sectionLimit)
  const nearbyEvents = location
    ? platformEvents
        .filter((event) =>
          matchesLocationFields(location, event.venue_city, event.venue_state)
        )
        .slice(0, sectionLimit)
    : platformEvents.slice(0, sectionLimit)

  const newMusic = normalizeMusicTracks(newMusicPayload)
  const trendingMusic = normalizeMusicTracks(trendingMusicPayload)
  const popularMusic = normalizeMusicTracks(popularMusicPayload)
  const topSongs = rankTopSongs(
    [...newMusic, ...trendingMusic, ...popularMusic],
    sectionLimit
  )

  const peopleParams = new URLSearchParams({
    limit: String(sectionLimit * 4),
    type: 'all',
    includeRecommendations: 'true',
    sortBy: 'relevance',
  })
  if (location) peopleParams.set('location', location)
  if (creatorType) peopleParams.set('creatorType', creatorType)
  if (service) peopleParams.set('service', service)
  if (availableForHire) peopleParams.set('availableForHire', 'true')

  const enhancedPeoplePayload = await fetchJson(`/api/search/enhanced?${peopleParams.toString()}`)
  const peopleRaw = locationBoostedProfiles(
    normalizeProfilesFromEnhanced(enhancedPeoplePayload),
    location
  )
  const artists = peopleRaw
    .filter((profile) => profile.account_type === 'artist')
    .slice(0, sectionLimit)
  const venues = peopleRaw
    .filter((profile) => profile.account_type === 'venue')
    .slice(0, sectionLimit)
  const organizations = peopleRaw
    .filter((profile) => profile.account_type === 'organization')
    .slice(0, sectionLimit)
  const people = peopleRaw
    .filter((profile) => profile.account_type === 'general')
    .slice(0, sectionLimit)

  const suggestionsFromApi = normalizeSuggestions(suggestionsPayload)
  const suggestions =
    suggestionsFromApi.length > 0
      ? suggestionsFromApi.slice(0, sectionLimit)
      : peopleRaw
          .filter((profile) => profile.verified || profile.account_type === 'artist')
          .slice(0, sectionLimit)

  const rankedNewArtists = rankNewArtists(
    peopleRaw.filter((profile) => profile.account_type === 'artist'),
    sectionLimit
  )
  const newArtists = await attachTopTracksToArtists({
    supabase,
    artists: rankedNewArtists,
  })

  const hireMatches = rankHireMatches({
    profiles: peopleRaw.filter(
      (profile) => profile.account_type === 'artist' && profile.available_for_hire
    ),
    location,
    creatorType,
    service,
  }).slice(0, sectionLimit)

  const forYou = rankForYou({
    location,
    posts: trendingPosts,
    events: nearbyEvents.length > 0 ? nearbyEvents : upcomingEvents,
    people: artists,
    suggestions,
  })

  const payload: DiscoverResponse = {
    success: true,
    sections: {
      for_you: forYou,
      trending: trendingPosts,
      upcoming: upcomingEvents,
      people: people.slice(0, sectionLimit),
      artists,
      venues,
      organizations,
      suggestions,
      hire_matches: hireMatches,
      new_music: newMusic.slice(0, sectionLimit),
      trending_music: trendingMusic.slice(0, sectionLimit),
      top_songs: topSongs,
      top_albums_by_genre: topAlbumsByGenre,
      tours,
      new_artists: newArtists,
      nearby_events: nearbyEvents,
    },
    stats: {
      trending_count: trendingPosts.length,
      upcoming_count: upcomingEvents.length,
      people_count: people.length,
      suggestions_count: suggestions.length,
      hire_matches_count: hireMatches.length,
    },
    generated_at: new Date().toISOString(),
  }

  const cacheHeader = authResult
    ? 'private, no-store'
    : 'public, s-maxage=60, stale-while-revalidate=300'

  discoverResponseSchema.parse(payload)

  return NextResponse.json(payload, {
    headers: {
      'cache-control': cacheHeader,
    },
  })
}
