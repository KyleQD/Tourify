import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

interface DiscoverProfile {
  id: string
  username: string
  account_type: 'artist' | 'venue' | 'general'
  display_name: string
  avatar_url?: string | null
  bio?: string
  location?: string | null
  verified: boolean
  stats: {
    followers: number
    following: number
    posts: number
  }
}

interface DiscoverEvent {
  id: string
  slug: string | null
  title: string
  description?: string | null
  event_date?: string | null
  venue_name?: string | null
  venue_city?: string | null
  venue_state?: string | null
  attendance: {
    attending: number
    interested: number
    total: number
  }
}

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
    suggestions: DiscoverProfile[]
  }
  stats: {
    trending_count: number
    upcoming_count: number
    people_count: number
    suggestions_count: number
  }
  generated_at: string
}

type DiscoverIntent = 'grow' | 'network' | 'book' | 'learn'
type RSSCategory = 'Music News' | 'Music Industry' | 'Hip-Hop' | 'Electronic Music' | 'Indie Music' | 'Local Music'

interface RSSNewsItem {
  id: string
  title: string
  description: string
  link: string
  pubDate: string
  source: string
  category?: string
}

function parseJsonSafe(value: string): any {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function slugify(value: string) {
  return String(value || 'source')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

function toPlainText(value: string) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

function dedupeRssItems(items: RSSNewsItem[]): RSSNewsItem[] {
  const seen = new Set<string>()
  const deduped: RSSNewsItem[] = []
  for (const item of items) {
    const key = String(item.link || item.id || '').trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }
  return deduped
}

function deriveDiscoverCategories(params: { intent: DiscoverIntent; location?: string | null }): RSSCategory[] {
  const base: RSSCategory[] = ['Music News', 'Music Industry']
  if (params.intent === 'book') base.push('Local Music')
  if (params.intent === 'network') base.push('Indie Music')
  if (params.intent === 'learn') base.push('Music Industry')
  if (params.intent === 'grow') base.push('Hip-Hop', 'Electronic Music')
  if (params.location) base.push('Local Music')
  return Array.from(new Set(base)).slice(0, 5)
}

function normalizePostsFromRss(items: RSSNewsItem[]): DiscoverPost[] {
  return items.map((item) => ({
    id: String(item.id || item.link || crypto.randomUUID()),
    content: toPlainText(item.title || item.description || 'Music update'),
    created_at: String(item.pubDate || new Date().toISOString()),
    likes_count: 0,
    comments_count: 0,
    shares_count: 0,
    profiles: {
      id: slugify(item.source),
      username: slugify(item.source),
      full_name: String(item.source || 'Music Source'),
      avatar_url: '',
      is_verified: true,
    },
  }))
}

function normalizeEventsFromRss(items: RSSNewsItem[]): DiscoverEvent[] {
  return items
    .filter((item) => {
      const searchable = `${item.title} ${item.description}`.toLowerCase()
      return searchable.includes('event') || searchable.includes('tour') || searchable.includes('festival') || searchable.includes('show')
    })
    .map((item) => ({
      id: `rss-event-${String(item.id || item.link || crypto.randomUUID())}`,
      slug: null,
      title: toPlainText(item.title || 'Live update'),
      description: toPlainText(item.description || ''),
      event_date: String(item.pubDate || null),
      venue_name: item.source || null,
      venue_city: null,
      venue_state: null,
      attendance: {
        attending: 0,
        interested: 0,
        total: 0,
      },
    }))
}

function normalizeProfilesFromSearch(payload: any): DiscoverProfile[] {
  const results = payload?.results || {}
  const artists = Array.isArray(results.artists) ? results.artists : []
  const venues = Array.isArray(results.venues) ? results.venues : []
  const users = Array.isArray(results.users) ? results.users : []

  return [...artists, ...venues, ...users]
    .map((item: any) => {
      const accountType: DiscoverProfile['account_type'] =
        item.account_type === 'artist' || item.artist_name ? 'artist' :
        item.account_type === 'venue' || item.venue_name ? 'venue' :
        'general'

      return {
        id: String(item.id || ''),
        username: String(item.username || ''),
        account_type: accountType,
        display_name: String(item.display_name || item.artist_name || item.venue_name || item.name || item.username || 'User'),
        avatar_url: item.avatar_url || null,
        bio: item.bio || item.description || '',
        location: item.location || [item.city, item.state].filter(Boolean).join(', ') || null,
        verified: Boolean(item.verified),
        stats: {
          followers: Number(item?.stats?.followers || 0),
          following: Number(item?.stats?.following || 0),
          posts: Number(item?.stats?.posts || 0),
        },
      }
    })
    .filter((profile: DiscoverProfile) => profile.id && profile.username)
}

function normalizePostsFromFeed(payload: any): DiscoverPost[] {
  const records = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.posts)
      ? payload.posts
      : []

  return records.map((post: any) => ({
    id: String(post.id || ''),
    content: String(post.content || ''),
    created_at: String(post.created_at || new Date().toISOString()),
    likes_count: Number(post.likes_count || post.like_count || 0),
    comments_count: Number(post.comments_count || 0),
    shares_count: Number(post.shares_count || 0),
    profiles: {
      id: String(post?.profiles?.id || post?.user?.id || post?.user_id || ''),
      username: String(post?.profiles?.username || post?.user?.username || 'user'),
      full_name: post?.profiles?.full_name || '',
      avatar_url: post?.profiles?.avatar_url || post?.user?.avatar_url || '',
      is_verified: Boolean(post?.profiles?.is_verified || post?.user?.verified),
    },
  }))
}

function normalizeEventsFromDiscover(payload: any): DiscoverEvent[] {
  const events = Array.isArray(payload?.events) ? payload.events : []
  return events.map((event: any) => ({
    id: String(event.id || ''),
    slug: event.slug ? String(event.slug) : null,
    title: String(event.title || event.name || 'Untitled event'),
    description: event.description || '',
    event_date: event.event_date || null,
    venue_name: event.venue_name || null,
    venue_city: event.venue_city || null,
    venue_state: event.venue_state || null,
    attendance: {
      attending: Number(event?.attendance?.attending || 0),
      interested: Number(event?.attendance?.interested || 0),
      total: Number(event?.attendance?.total || 0),
    },
  }))
}

function normalizeSuggestions(payload: any): DiscoverProfile[] {
  const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : []
  return suggestions.map((item: any) => ({
    id: String(item.id || item.user_id || ''),
    username: String(item.username || ''),
    account_type: 'general',
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
  })).filter((profile: DiscoverProfile) => profile.id && profile.username)
}

function matchesLocation(value: string | null | undefined, location: string) {
  if (!value) return false
  return value.toLowerCase().includes(location.toLowerCase())
}

function rankForYou({
  intent,
  location,
  posts,
  events,
  people,
  suggestions,
}: {
  intent: DiscoverIntent
  location?: string | null
  posts: DiscoverPost[]
  events: DiscoverEvent[]
  people: DiscoverProfile[]
  suggestions: DiscoverProfile[]
}) {
  const postWeight = intent === 'learn' ? 1.3 : intent === 'grow' ? 1.2 : 1.0
  const eventWeight = intent === 'book' ? 1.5 : intent === 'network' ? 1.2 : 1.0
  const profileWeight = intent === 'network' ? 1.5 : intent === 'grow' ? 1.3 : 1.0

  const scoredPosts = posts.slice(0, 8).map((post, index) => ({
    id: `post-${post.id}`,
    item_type: 'post' as const,
    score: Math.round((100 - index * 4) * postWeight),
    post,
  }))

  const scoredEvents = events.slice(0, 8).map((event, index) => {
    const isNearby =
      location
        ? matchesLocation(event.venue_city, location) || matchesLocation(event.venue_state, location)
        : false

    return {
      id: `event-${event.id}`,
      item_type: 'event' as const,
      score: Math.round((95 - index * 4) * eventWeight + (event.attendance.total > 0 ? 5 : 0) + (isNearby ? 10 : 0)),
      event,
    }
  })

  const scoredProfiles = [...suggestions, ...people]
    .slice(0, 10)
    .map((profile, index) => {
      const isNearby = location ? matchesLocation(profile.location, location) : false
      return {
        id: `profile-${profile.id}`,
        item_type: 'profile' as const,
        score: Math.round((90 - index * 3) * profileWeight + (profile.verified ? 4 : 0) + (isNearby ? 8 : 0)),
        profile,
      }
    })

  return [...scoredPosts, ...scoredEvents, ...scoredProfiles]
    .sort((first, second) => second.score - first.score)
    .slice(0, 12)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '12'), 30)
  const sectionLimit = Math.max(4, Math.min(limit, 12))
  const location = searchParams.get('location')?.trim() || null
  const intentParam = searchParams.get('intent')
  const intent: DiscoverIntent =
    intentParam === 'network' || intentParam === 'book' || intentParam === 'learn'
      ? intentParam
      : 'grow'
  const authResult = await authenticateApiRequest(request)

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

  const categories = deriveDiscoverCategories({ intent, location })
  const perCategoryLimit = Math.max(8, Math.ceil((sectionLimit * 4) / categories.length))
  const rssPayloads = await Promise.all(
    categories.map((category) =>
      fetchJson(`/api/feed/rss-news?limit=${perCategoryLimit}&category=${encodeURIComponent(category)}`)
    )
  )

  const rssItems = dedupeRssItems(
    rssPayloads.flatMap((payload) => (Array.isArray(payload?.news) ? payload.news as RSSNewsItem[] : []))
  )

  const locationFilteredRss = location
    ? rssItems.filter((item) => {
        const searchable = `${item.title} ${item.description} ${item.source} ${item.category || ''}`.toLowerCase()
        return searchable.includes(location.toLowerCase())
      })
    : rssItems

  const selectedRss = (locationFilteredRss.length ? locationFilteredRss : rssItems).slice(0, sectionLimit * 4)
  const posts = normalizePostsFromRss(selectedRss).slice(0, sectionLimit)
  const events = normalizeEventsFromRss(selectedRss).slice(0, sectionLimit)
  const people: DiscoverProfile[] = []
  const artists: DiscoverProfile[] = []
  const venues: DiscoverProfile[] = []
  const suggestions: DiscoverProfile[] = []

  const forYou = rankForYou({
    intent,
    location,
    posts,
    events,
    people,
    suggestions,
  })

  const payload: DiscoverResponse = {
    success: true,
    sections: {
      for_you: forYou,
      trending: posts,
      upcoming: events,
      people: people.slice(0, sectionLimit),
      artists,
      venues,
      suggestions,
    },
    stats: {
      trending_count: posts.length,
      upcoming_count: events.length,
      people_count: people.length,
      suggestions_count: suggestions.length,
    },
    generated_at: new Date().toISOString(),
  }

  const cacheHeader = authResult
    ? 'private, no-store'
    : 'public, s-maxage=60, stale-while-revalidate=300'

  return NextResponse.json(payload, {
    headers: {
      'cache-control': cacheHeader,
    },
  })
}
