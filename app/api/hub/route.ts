import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

type HubIntent = 'grow' | 'network' | 'book' | 'learn'

interface HubDiscoverEvent {
  id: string
  title: string
  description?: string | null
  event_date?: string | null
  venue_name?: string | null
  venue_city?: string | null
  venue_state?: string | null
}

interface HubNewsItem {
  id: string
  title: string
  summary: string
  sourceName: string
  publishedAt: string
  url?: string
  topics: string[]
}

interface HubJobItem {
  id: string
  title: string
  city?: string | null
  state?: string | null
  country?: string | null
  payment_type?: string | null
  payment_amount?: number | null
}

interface DiscoverPayload {
  sections?: {
    upcoming?: HubDiscoverEvent[]
  }
  stats?: {
    trending_count: number
    upcoming_count: number
    people_count: number
    suggestions_count: number
  }
}

interface NewsPayload {
  items?: HubNewsItem[]
}

interface JobsPayload {
  data?: {
    jobs?: HubJobItem[]
    total_count?: number
  }
}

function normalizeIntent(value: string | null): HubIntent {
  if (value === 'network') return 'network'
  if (value === 'book') return 'book'
  if (value === 'learn') return 'learn'
  return 'grow'
}

async function fetchJson({
  request,
  pathname,
  searchParams,
}: {
  request: NextRequest
  pathname: string
  searchParams?: URLSearchParams
}) {
  const baseUrl = request.nextUrl.origin
  const fullPath = searchParams ? `${pathname}?${searchParams.toString()}` : pathname
  const headers: HeadersInit = {}
  const cookie = request.headers.get('cookie')
  if (cookie) headers.cookie = cookie

  try {
    const response = await fetch(`${baseUrl}${fullPath}`, {
      headers,
      cache: 'no-store',
    })
    if (!response.ok) return null
    return response.json()
  } catch (error) {
    console.error(`[Hub API] Failed to fetch ${pathname}:`, error)
    return null
  }
}

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequest(request)
  const location = request.nextUrl.searchParams.get('location')?.trim() || ''
  const intent = normalizeIntent(request.nextUrl.searchParams.get('intent'))

  const discoverParams = new URLSearchParams({
    limit: '8',
    intent,
  })
  if (location) discoverParams.set('location', location)

  const newsParams = new URLSearchParams({
    facet: location ? 'local' : 'top',
    limit: '8',
  })
  if (location) newsParams.set('query', location)

  const jobsParams = new URLSearchParams({
    per_page: '6',
    page: '1',
  })
  if (location) jobsParams.set('query', location)

  const [discoverRaw, newsRaw, jobsRaw] = await Promise.all([
    fetchJson({ request, pathname: '/api/discover', searchParams: discoverParams }),
    fetchJson({ request, pathname: '/api/news/feed', searchParams: newsParams }),
    fetchJson({ request, pathname: '/api/artist-jobs', searchParams: jobsParams }),
  ])

  const discover = (discoverRaw || {}) as DiscoverPayload
  const news = (newsRaw || {}) as NewsPayload
  const jobs = (jobsRaw || {}) as JobsPayload
  const discoverStats = discover.stats || {
    trending_count: 0,
    upcoming_count: 0,
    people_count: 0,
    suggestions_count: 0,
  }

  const discoverEvents = Array.isArray(discover?.sections?.upcoming) ? discover.sections?.upcoming || [] : []
  const headlines = Array.isArray(news.items) ? news.items : []
  const openJobs = Array.isArray(jobs?.data?.jobs) ? jobs.data?.jobs || [] : []
  const openJobsCount = typeof jobs?.data?.total_count === 'number' ? jobs.data.total_count : openJobs.length

  return NextResponse.json({
    success: true,
    context: {
      isAuthenticated: Boolean(authResult?.user?.id),
      userId: authResult?.user?.id || null,
      location: location || null,
      intent,
    },
    metrics: {
      opportunities: discoverStats.trending_count + discoverStats.upcoming_count,
      events: discoverStats.upcoming_count,
      jobs: openJobsCount,
      network: discoverStats.people_count + discoverStats.suggestions_count,
      headlines: headlines.length,
    },
    sections: {
      discover: discoverEvents.slice(0, 4),
      pulse: headlines.slice(0, 5),
      jobs: openJobs.slice(0, 4),
      quickLinks: [
        { id: 'discover', label: 'Discover', href: '/discover' },
        { id: 'pulse', label: 'Pulse', href: '/feed' },
        { id: 'events', label: 'Events', href: '/events' },
        { id: 'jobs', label: 'Jobs', href: '/jobs' },
        { id: 'profile', label: 'Profile', href: '/profile' },
      ],
    },
    generatedAt: new Date().toISOString(),
  })
}
