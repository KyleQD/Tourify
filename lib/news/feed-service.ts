import type { SupabaseClient } from '@supabase/supabase-js'

import {
  applyCursorPagination,
  decodeNewsCursor,
  rankNewsItem,
  sortNewsByScore
} from '@/lib/news/ranking'
import type { NewsFeedItem, NewsFeedQuery, RankedNewsFeedResult } from '@/lib/news/types'
import { chooseFanoutStrategy } from '@/lib/news/scale/hybrid-fanout'

interface BuildNewsFeedParams extends NewsFeedQuery {
  requestOrigin: string
  supabase: SupabaseClient
}

interface UserSignalProfile {
  followedAuthorIds: Set<string>
  subscribedTopics: Set<string>
  subscribedSourceNames: Set<string>
  interactionTopics: Set<string>
  preferredLocations: Set<string>
}

export interface BuildNewsFeedResponse extends RankedNewsFeedResult {
  sourceBreakdown: Record<string, number>
}

export async function buildNewsFeed(params: BuildNewsFeedParams): Promise<BuildNewsFeedResponse> {
  const userSignals = await getUserSignalProfile({
    supabase: params.supabase,
    userId: params.userId
  })

  const externalCandidates = await fetchExternalCandidates({
    requestOrigin: params.requestOrigin,
    limit: 240,
    subscribedTopics: userSignals.subscribedTopics,
    preferredLocations: userSignals.preferredLocations
  })

  // Pulse policy: RSS-only candidate stream.
  const mergedCandidates = externalCandidates
  const filteredByFacet = filterByFacet({
    items: mergedCandidates,
    facet: params.facet,
    followedAuthorIds: userSignals.followedAuthorIds,
    preferredLocations: userSignals.preferredLocations
  })
  const filteredByQuery = filterByQuery({
    items: filteredByFacet,
    query: params.query
  })
  const effectiveCandidates = pickEffectiveCandidates({
    filteredByQuery,
    filteredByFacet,
    mergedCandidates
  })

  const ranked = effectiveCandidates.map(item =>
    rankNewsItem({
      item,
      subscribedTopics: userSignals.subscribedTopics,
      subscribedSourceNames: userSignals.subscribedSourceNames,
      interactionTopics: userSignals.interactionTopics,
      preferredLocations: userSignals.preferredLocations
    })
  )
  const sorted = sortNewsByScore(ranked)
  const diversityBalanced = applySourceDiversity(sorted)
  const pagination = applyCursorPagination({
    items: diversityBalanced,
    cursor: decodeNewsCursor(params.cursor),
    limit: Math.max(1, Math.min(50, params.limit))
  })

  const sourceBreakdown = countBySource(pagination.pageItems)

  return {
    items: pagination.pageItems,
    nextCursor: pagination.nextCursor,
    sourceBreakdown
  }
}

async function getUserSignalProfile(params: { supabase: SupabaseClient; userId?: string }): Promise<UserSignalProfile> {
  if (!params.userId)
    return {
      followedAuthorIds: new Set(),
      subscribedTopics: new Set(),
      subscribedSourceNames: new Set(),
      interactionTopics: new Set(),
      preferredLocations: new Set()
    }

  const followedAuthorIds = await getFollowedAuthorIds(params)
  const preferenceData = await getUserPreferenceData(params)

  return {
    followedAuthorIds,
    subscribedTopics: preferenceData.subscribedTopics,
    subscribedSourceNames: preferenceData.subscribedSourceNames,
    interactionTopics: preferenceData.interactionTopics,
    preferredLocations: preferenceData.preferredLocations
  }
}

async function getFollowedAuthorIds(params: { supabase: SupabaseClient; userId?: string }) {
  if (!params.userId) return new Set<string>()

  try {
    const { data } = await params.supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', params.userId)

    return new Set((data || []).map(row => String(row.following_id)))
  } catch {
    return new Set<string>()
  }
}

async function getUserPreferenceData(params: { supabase: SupabaseClient; userId?: string }) {
  const subscribedTopics = new Set<string>()
  const subscribedSourceNames = new Set<string>()
  const interactionTopics = new Set<string>()
  const preferredLocations = new Set<string>()

  if (!params.userId) return { subscribedTopics, subscribedSourceNames, interactionTopics, preferredLocations }

  try {
    const { data: preferences } = await params.supabase
      .from('user_news_preferences')
      .select('topics, preferred_sources')
      .eq('user_id', params.userId)
      .maybeSingle()

    const topics = Array.isArray(preferences?.topics) ? preferences?.topics : []
    const preferredSources = Array.isArray(preferences?.preferred_sources) ? preferences?.preferred_sources : []

    for (const topic of topics) subscribedTopics.add(String(topic).toLowerCase())
    for (const source of preferredSources) subscribedSourceNames.add(String(source).toLowerCase())
  } catch {
    // Table may not exist yet in early rollout.
  }

  try {
    const { data: subscriptions } = await params.supabase
      .from('user_news_subscriptions')
      .select('subscription_type, subscription_key')
      .eq('user_id', params.userId)

    for (const subscription of subscriptions || []) {
      if (subscription.subscription_type === 'topic')
        subscribedTopics.add(String(subscription.subscription_key).toLowerCase())
      if (subscription.subscription_type === 'source')
        subscribedSourceNames.add(String(subscription.subscription_key).toLowerCase())
    }
  } catch {
    // Table may not exist yet in early rollout.
  }

  try {
    const { data: profile } = await params.supabase
      .from('profiles')
      .select('location, bio')
      .eq('id', params.userId)
      .maybeSingle()

    for (const locationToken of tokenizeLocation(profile?.location))
      preferredLocations.add(locationToken)

    for (const keyword of extractKeywords(profile?.bio))
      interactionTopics.add(keyword)
  } catch {
    // Profile shape can differ across environments.
  }

  try {
    const { data: artistProfiles } = await params.supabase
      .from('artist_profiles')
      .select('genres')
      .eq('user_id', params.userId)
      .limit(1)

    const genres = Array.isArray(artistProfiles?.[0]?.genres) ? artistProfiles?.[0]?.genres : []
    for (const genre of genres) {
      const normalizedGenre = String(genre).trim().toLowerCase()
      if (!normalizedGenre) continue
      subscribedTopics.add(normalizedGenre)
      interactionTopics.add(normalizedGenre)
    }
  } catch {
    // Optional table in some deployments.
  }

  try {
    const { data: venues } = await params.supabase
      .from('venue_profiles')
      .select('city, state, country, venue_types')
      .eq('user_id', params.userId)
      .limit(3)

    for (const venue of venues || []) {
      for (const locationToken of tokenizeLocation([venue.city, venue.state, venue.country].filter(Boolean).join(' ')))
        preferredLocations.add(locationToken)

      const venueTypes = Array.isArray(venue.venue_types) ? venue.venue_types : []
      for (const venueType of venueTypes) interactionTopics.add(String(venueType).trim().toLowerCase())
    }
  } catch {
    // Optional table in some deployments.
  }

  try {
    const { data: ownPosts } = await params.supabase
      .from('posts')
      .select('hashtags, location, content')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(40)

    for (const post of ownPosts || []) {
      const hashtags = Array.isArray(post.hashtags) ? post.hashtags : []
      for (const hashtag of hashtags) interactionTopics.add(String(hashtag).trim().toLowerCase())
      for (const locationToken of tokenizeLocation(post.location)) preferredLocations.add(locationToken)
      for (const keyword of extractKeywords(post.content)) interactionTopics.add(keyword)
    }
  } catch {
    // Optional in early installs.
  }

  try {
    const { data: likes } = await params.supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false })
      .limit(60)

    const likedPostIds = (likes || []).map(row => String(row.post_id)).filter(Boolean)
    if (likedPostIds.length) {
      const { data: likedPosts } = await params.supabase
        .from('posts')
        .select('hashtags, location, content')
        .in('id', likedPostIds)
        .limit(60)

      for (const post of likedPosts || []) {
        const hashtags = Array.isArray(post.hashtags) ? post.hashtags : []
        for (const hashtag of hashtags) interactionTopics.add(String(hashtag).trim().toLowerCase())
        for (const locationToken of tokenizeLocation(post.location)) preferredLocations.add(locationToken)
        for (const keyword of extractKeywords(post.content)) interactionTopics.add(keyword)
      }
    }
  } catch {
    // Optional in early installs.
  }

  return { subscribedTopics, subscribedSourceNames, interactionTopics, preferredLocations }
}

async function fetchPostCandidates(params: { supabase: SupabaseClient; limit: number }): Promise<NewsFeedItem[]> {
  try {
    const { data } = await params.supabase
      .from('posts')
      .select(`
        id,
        content,
        likes_count,
        comments_count,
        created_at,
        user_id,
        profiles:user_id (
          id,
          username,
          avatar_url,
          verified
        )
      `)
      .order('created_at', { ascending: false })
      .limit(params.limit)

    return (data || []).map(post => {
      const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      const strategy = chooseFanoutStrategy({
        followerCount: 1000,
        velocityPerMinute: Math.max(1, Math.floor(((post.likes_count || 0) + (post.comments_count || 0)) / 3))
      })

      return {
        id: `post_${post.id}`,
        originType: 'internal_post',
        sourceType: 'community',
        sourceName: 'Tourify Community',
        title: toTitle(post.content),
        summary: post.content || '',
        publishedAt: post.created_at,
        topics: ['Community', 'Music News'],
        author: {
          id: String(post.user_id),
          name: profile?.username || 'User',
          username: profile?.username || 'user',
          avatarUrl: profile?.avatar_url || undefined,
          isVerified: profile?.verified || false
        },
        metrics: {
          likes: post.likes_count || 0,
          comments: post.comments_count || 0,
          shares: 0,
          views: 0
        },
        moderation: {
          trustLabel: strategy.strategy === 'fanout_on_write' ? 'developing_story' : 'community_report',
          confidence: strategy.strategy === 'fanout_on_write' ? 0.7 : 0.58,
          moderationState: 'review_pending'
        },
        relevanceScore: 0,
        score: 0
      }
    })
  } catch {
    return []
  }
}

async function fetchBlogCandidates(params: { supabase: SupabaseClient; limit: number }): Promise<NewsFeedItem[]> {
  try {
    const { data } = await params.supabase
      .from('artist_blog_posts')
      .select(`
        id,
        title,
        excerpt,
        content,
        slug,
        tags,
        categories,
        featured_image_url,
        stats,
        published_at,
        created_at,
        user_id,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          verified
        )
      `)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(params.limit)

    return (data || []).map(blog => ({
      id: `blog_${blog.id}`,
      originType: 'internal_blog',
      sourceType: 'community',
      sourceName: 'Tourify Editorial',
      title: blog.title,
      summary: blog.excerpt || String(blog.content || '').slice(0, 220),
      imageUrl: blog.featured_image_url || undefined,
      url: `/blog/${blog.slug}`,
      publishedAt: blog.published_at || blog.created_at,
      topics: normalizeTopics([...(blog.categories || []), ...(blog.tags || []), 'Industry']),
      author: {
        id: String(blog.user_id),
        name: blog.profiles?.full_name || blog.profiles?.username || 'Author',
        username: blog.profiles?.username || undefined,
        avatarUrl: blog.profiles?.avatar_url || undefined,
        isVerified: blog.profiles?.verified || false
      },
      metrics: {
        likes: blog.stats?.likes || 0,
        comments: blog.stats?.comments || 0,
        shares: blog.stats?.shares || 0,
        views: blog.stats?.views || 0
      },
      moderation: {
        trustLabel: 'community_report',
        confidence: 0.74,
        moderationState: 'approved'
      },
      relevanceScore: 0,
      score: 0
    }))
  } catch {
    return []
  }
}

async function fetchMusicCandidates(params: { supabase: SupabaseClient; limit: number }): Promise<NewsFeedItem[]> {
  try {
    const { data } = await params.supabase
      .from('music_tracks')
      .select(`
        id,
        title,
        description,
        genre,
        tags,
        cover_art_url,
        likes_count,
        play_count,
        shares_count,
        comments_count,
        created_at,
        user_id,
        profiles:user_id (
          id,
          username,
          full_name,
          avatar_url,
          verified
        )
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(params.limit)

    return (data || []).map(track => ({
      id: `music_${track.id}`,
      originType: 'internal_post',
      sourceType: 'community',
      sourceName: 'Tourify Music',
      title: String(track.title || 'New track release'),
      summary: String(track.description || 'Fresh music from the Tourify artist network.'),
      imageUrl: track.cover_art_url || undefined,
      publishedAt: track.created_at || new Date().toISOString(),
      topics: normalizeTopics([track.genre, ...(Array.isArray(track.tags) ? track.tags : []), 'Music Release']),
      author: {
        id: String(track.user_id),
        name: track.profiles?.full_name || track.profiles?.username || 'Artist',
        username: track.profiles?.username || undefined,
        avatarUrl: track.profiles?.avatar_url || undefined,
        isVerified: track.profiles?.verified || false
      },
      metrics: {
        likes: track.likes_count || 0,
        comments: track.comments_count || 0,
        shares: track.shares_count || 0,
        views: track.play_count || 0
      },
      moderation: {
        trustLabel: 'community_report',
        confidence: 0.72,
        moderationState: 'approved'
      },
      relevanceScore: 0,
      score: 0
    }))
  } catch {
    return []
  }
}

async function fetchEventCandidates(params: {
  supabase: SupabaseClient
  limit: number
  preferredLocations: Set<string>
}): Promise<NewsFeedItem[]> {
  const perSourceLimit = Math.max(10, Math.ceil(params.limit / 2))

  const [legacyEvents, canonicalEvents] = await Promise.all([
    fetchLegacyEventCandidates({ supabase: params.supabase, limit: perSourceLimit }),
    fetchCanonicalEventCandidates({ supabase: params.supabase, limit: perSourceLimit })
  ])

  const merged = [...legacyEvents, ...canonicalEvents]
  if (!params.preferredLocations.size) return merged

  const localFirst = merged.sort((left, right) => {
    const leftLocal = matchesPreferredLocation(left, params.preferredLocations) ? 1 : 0
    const rightLocal = matchesPreferredLocation(right, params.preferredLocations) ? 1 : 0
    return rightLocal - leftLocal
  })

  return localFirst
}

async function fetchLegacyEventCandidates(params: { supabase: SupabaseClient; limit: number }): Promise<NewsFeedItem[]> {
  try {
    const { data } = await params.supabase
      .from('events')
      .select('id, name, description, event_type, event_date, city, state, country, venue_name, tags')
      .eq('status', 'published')
      .gte('event_date', new Date().toISOString().slice(0, 10))
      .order('event_date', { ascending: true })
      .limit(params.limit)

    return (data || []).map(event => {
      const locationLabel = [event.city, event.state, event.country].filter(Boolean).join(', ')
      return {
        id: `event_${event.id}`,
        originType: 'internal_post',
        sourceType: 'community',
        sourceName: event.venue_name || 'Tourify Events',
        title: String(event.name || 'Upcoming live event'),
        summary: String(event.description || `Upcoming live event${locationLabel ? ` in ${locationLabel}` : ''}.`),
        publishedAt: event.event_date ? new Date(`${event.event_date}T09:00:00.000Z`).toISOString() : new Date().toISOString(),
        url: `/events/${event.id}`,
        topics: normalizeTopics([event.event_type, ...(Array.isArray(event.tags) ? event.tags : []), locationLabel, 'Live Event']),
        metrics: {
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0
        },
        moderation: {
          trustLabel: 'verified_source',
          confidence: 0.86,
          moderationState: 'approved'
        },
        relevanceScore: 0,
        score: 0
      }
    })
  } catch {
    return []
  }
}

async function fetchCanonicalEventCandidates(params: { supabase: SupabaseClient; limit: number }): Promise<NewsFeedItem[]> {
  try {
    const { data } = await params.supabase
      .from('events_v2')
      .select('id, title, start_at, status, settings')
      .in('status', ['confirmed', 'advancing', 'onsite'])
      .gte('start_at', new Date().toISOString())
      .order('start_at', { ascending: true })
      .limit(params.limit)

    return (data || []).map(event => {
      const settings = event.settings && typeof event.settings === 'object' ? (event.settings as Record<string, unknown>) : {}
      const venueLabel = typeof settings.venue_label === 'string' ? settings.venue_label : 'Tourify Events'
      const city = typeof settings.venue_city === 'string' ? settings.venue_city : ''
      const state = typeof settings.venue_state === 'string' ? settings.venue_state : ''
      const country = typeof settings.venue_country === 'string' ? settings.venue_country : ''
      const eventType = typeof settings.event_type === 'string' ? settings.event_type : 'Live Event'
      const locationLabel = [city, state, country].filter(Boolean).join(', ')
      const tags = Array.isArray(settings.tags) ? settings.tags : []
      const description = typeof settings.description === 'string' ? settings.description : ''

      return {
        id: `eventv2_${event.id}`,
        originType: 'internal_post',
        sourceType: 'community',
        sourceName: venueLabel,
        title: String(event.title || 'Upcoming live event'),
        summary: description || `Upcoming live event${locationLabel ? ` in ${locationLabel}` : ''}.`,
        publishedAt: event.start_at || new Date().toISOString(),
        url: `/events/${event.id}`,
        topics: normalizeTopics([eventType, ...tags, locationLabel, 'Live Event']),
        metrics: {
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0
        },
        moderation: {
          trustLabel: 'verified_source',
          confidence: 0.88,
          moderationState: 'approved'
        },
        relevanceScore: 0,
        score: 0
      }
    })
  } catch {
    return []
  }
}

async function fetchExternalCandidates(params: {
  requestOrigin: string
  limit: number
  subscribedTopics: Set<string>
  preferredLocations: Set<string>
}): Promise<NewsFeedItem[]> {
  try {
    const categories = deriveExternalCategories({
      subscribedTopics: params.subscribedTopics,
      preferredLocations: params.preferredLocations
    })

    const requests = categories.map(category => {
      const endpoint = new URL('/api/feed/rss-news', params.requestOrigin)
      endpoint.searchParams.set('limit', String(Math.max(12, Math.ceil(params.limit / categories.length))))
      endpoint.searchParams.set('category', category)
      return fetch(endpoint.toString(), {
        headers: {
          'User-Agent': 'TourifyNewsAggregator/1.0'
        }
      })
    })

    const results = await Promise.allSettled(requests)
    const rssItems: any[] = []
    for (const result of results) {
      if (result.status !== 'fulfilled') continue
      if (!result.value.ok) continue
      const payload = await result.value.json()
      if (Array.isArray(payload.news))
        rssItems.push(...payload.news)
    }

    const deduped = dedupeExternalItems(rssItems).slice(0, params.limit)

    return deduped.map((item: any) => ({
      id: `external_${item.id}`,
      originType: 'external',
      sourceType: 'publisher',
      sourceName: String(item.source || 'External Publisher'),
      title: String(item.title || 'Untitled'),
      summary: String(item.description || ''),
      imageUrl: item.image || undefined,
      url: item.link || undefined,
      publishedAt: item.pubDate || new Date().toISOString(),
      topics: normalizeTopics([item.category, item.source, 'Music News']),
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0,
        views: 0
      },
      moderation: {
        trustLabel: 'verified_source',
        confidence: 0.94,
        moderationState: 'approved'
      },
      relevanceScore: 0,
      score: 0
    }))
  } catch {
    return []
  }
}

function filterByFacet(params: {
  items: NewsFeedItem[]
  facet: NewsFeedQuery['facet']
  followedAuthorIds: Set<string>
  preferredLocations: Set<string>
}): NewsFeedItem[] {
  const { items, facet, followedAuthorIds, preferredLocations } = params

  if (facet === 'top') return items
  if (facet === 'verified') return items.filter(item => item.moderation.trustLabel === 'verified_source')
  if (facet === 'industry')
    return items.filter(item =>
      item.sourceType === 'publisher' || item.topics.some(topic => topic.toLowerCase().includes('industry'))
    )
  if (facet === 'gossip')
    return items.filter(item =>
      item.moderation.trustLabel === 'community_report' || item.moderation.trustLabel === 'developing_story'
    )
  if (facet === 'local')
    return items.filter(item =>
      item.topics.some(topic => topic.toLowerCase().includes('local')) ||
      item.sourceName.toLowerCase().includes('local') ||
      matchesPreferredLocation(item, preferredLocations)
    )
  if (facet === 'following')
    return items.filter(item =>
      item.author?.id && followedAuthorIds.has(item.author.id) ? true : item.sourceType === 'publisher'
    )

  return items
}

function filterByQuery(params: { items: NewsFeedItem[]; query?: string }): NewsFeedItem[] {
  const trimmedQuery = params.query?.trim().toLowerCase()
  if (!trimmedQuery) return params.items

  return params.items.filter(item => {
    const searchable = [
      item.title,
      item.summary,
      item.sourceName,
      item.author?.name,
      ...item.topics
    ]
      .join(' ')
      .toLowerCase()

    return searchable.includes(trimmedQuery)
  })
}

function applySourceDiversity(items: NewsFeedItem[]): NewsFeedItem[] {
  const sourceCount = new Map<string, number>()
  const diversified: NewsFeedItem[] = []

  for (const item of items) {
    const key = item.sourceName.toLowerCase()
    const count = sourceCount.get(key) || 0
    if (count >= 4) continue
    sourceCount.set(key, count + 1)
    diversified.push(item)
  }

  return diversified
}

function countBySource(items: NewsFeedItem[]) {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const key = item.sourceName
    counts[key] = (counts[key] || 0) + 1
  }
  return counts
}

function pickEffectiveCandidates(params: {
  filteredByQuery: NewsFeedItem[]
  filteredByFacet: NewsFeedItem[]
  mergedCandidates: NewsFeedItem[]
}): NewsFeedItem[] {
  if (params.filteredByQuery.length) return params.filteredByQuery
  if (params.filteredByFacet.length) return params.filteredByFacet
  return params.mergedCandidates
}

function dedupeExternalItems(items: any[]) {
  const seen = new Set<string>()
  const deduped: any[] = []

  for (const item of items) {
    const key = String(item.link || item.id || '').trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }

  return deduped
}

function deriveExternalCategories(params: {
  subscribedTopics: Set<string>
  preferredLocations: Set<string>
}): string[] {
  const selected: string[] = ['Music News', 'Music Industry']
  const topicPool = Array.from(params.subscribedTopics)

  for (const topic of topicPool) {
    if (topic.includes('hip') || topic.includes('rap')) selected.push('Hip-Hop')
    if (topic.includes('electronic') || topic.includes('dance')) selected.push('Electronic Music')
    if (topic.includes('indie')) selected.push('Indie Music')
    if (topic.includes('underground') || topic.includes('experimental')) selected.push('Underground Music')
    if (topic.includes('metal')) selected.push('Metal Music')
    if (topic.includes('jazz')) selected.push('Jazz Music')
  }

  if (params.preferredLocations.size) selected.push('Local Music')
  return Array.from(new Set(selected)).slice(0, 6)
}

function tokenizeLocation(value?: string | null): string[] {
  if (!value) return []
  return value
    .toLowerCase()
    .split(/[,\s/]+/)
    .map(part => part.trim())
    .filter(part => part.length >= 2)
}

function extractKeywords(value?: string | null): string[] {
  if (!value) return []
  const stopWords = new Set(['the', 'and', 'with', 'from', 'that', 'this', 'your', 'their', 'into', 'about', 'have', 'for'])
  return value
    .toLowerCase()
    .split(/[^a-z0-9#]+/)
    .map(token => token.trim())
    .filter(token => token.length >= 3 && !stopWords.has(token))
    .slice(0, 24)
}

function matchesPreferredLocation(item: NewsFeedItem, preferredLocations: Set<string>) {
  if (!preferredLocations.size) return false
  const searchable = `${item.sourceName} ${item.title} ${item.summary} ${item.topics.join(' ')}`.toLowerCase()
  for (const token of preferredLocations) {
    if (token.length < 3) continue
    if (searchable.includes(token)) return true
  }
  return false
}

function normalizeTopics(rawTopics: unknown[]): string[] {
  const normalized = rawTopics
    .filter(Boolean)
    .map(topic => String(topic).trim())
    .filter(Boolean)
  return Array.from(new Set(normalized))
}

function toTitle(text: string): string {
  if (!text) return 'Community update'
  if (text.length <= 88) return text
  return `${text.slice(0, 85)}...`
}
