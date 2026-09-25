import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import {
  fetchInternalJson,
  type InternalUpstreamRoute,
} from '@/lib/discover/internal-json-fetch'
import { parseAllowedOrigins, type AllowedOrigin } from '@/lib/discover/outbound-guard'

/**
 * The hub fan-out runs on `node:https` / `node:dns` (resolve-then-pin), so this
 * handler must stay on the Node.js runtime.
 */
export const runtime = 'nodejs'

/** A forwarded `Cookie` header is bounded so the hop has a fixed cost ceiling. */
const MAX_FORWARDED_COOKIE_BYTES = 8 * 1024

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

/**
 * Security decision DISC-SSRF-002 — port of the `/api/discover` guard.
 *
 * The previous implementation built the outbound base from
 * `request.nextUrl.origin`, which reflects the inbound `Host` /
 * `X-Forwarded-Host` header, and then issued
 * `fetch(`${baseUrl}${fullPath}`)`. A caller who could set that header chose
 * the destination of three server-side requests, and the plain `fetch` would
 * also follow a redirect from the first hop. CodeQL did not flag it because
 * `js/request-forgery` treats `request.url` as a remote-flow source but not
 * `request.nextUrl.origin`.
 *
 * The destination is now an operator-declared exact origin
 * (`INTERNAL_API_ORIGIN` -> `NEXT_PUBLIC_APP_URL` ->
 * `VERCEL_PROJECT_PRODUCTION_URL` -> `VERCEL_URL`), the pathname is a
 * compile-time constant, and the transport is resolve-then-pin over
 * `node:https` with structural redirect denial, a wall-clock timeout, a 2 MiB
 * cap, and a JSON content-type requirement. Denials log the route key and the
 * reason only — never a parameter value and never a resolved URL.
 */
async function fetchUpstream({
  route,
  params,
  headers,
  allowlist,
}: {
  route: InternalUpstreamRoute
  params?: Record<string, string | number | boolean | null | undefined>
  headers: Record<string, string>
  allowlist: readonly AllowedOrigin[]
}) {
  const result = await fetchInternalJson({ route, params, headers, allowlist })
  if (!result.ok) {
    console.error(`[Hub API] Upstream "${route}" denied: ${result.denial}`)
    return null
  }
  return result.data
}

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequest(request)
  const location = request.nextUrl.searchParams.get('location')?.trim() || ''
  const intent = normalizeIntent(request.nextUrl.searchParams.get('intent'))

  // Plain records, not `URLSearchParams`: `buildUpstreamUrl` re-encodes each
  // declared key through `URLSearchParams`, so a value can only ever reach the
  // query string of the frozen pathname.
  const discoverParams: Record<string, string> = { limit: '8', intent }
  if (location) discoverParams.location = location

  const newsParams: Record<string, string> = {
    facet: location ? 'local' : 'top',
    limit: '8',
  }
  if (location) newsParams.query = location

  const jobsParams: Record<string, string> = { per_page: '6', page: '1' }
  if (location) jobsParams.query = location

  // The three upstreams are session-aware, so the caller's own cookie is
  // forwarded — but only to an origin the operator allowlisted.
  const headers: Record<string, string> = {}
  const cookie = request.headers.get('cookie')
  if (cookie) headers.cookie = cookie.slice(0, MAX_FORWARDED_COOKIE_BYTES)

  const allowlist = parseAllowedOrigins()
  if (allowlist.length === 0) {
    console.warn(
      '[Hub API] No internal upstream origin is allowlisted; the hub fan-out is disabled. Set INTERNAL_API_ORIGIN (or NEXT_PUBLIC_APP_URL / VERCEL_URL).'
    )
  }

  const [discoverRaw, newsRaw, jobsRaw] = await Promise.all([
    fetchUpstream({ route: 'hubDiscover', params: discoverParams, headers, allowlist }),
    fetchUpstream({ route: 'hubNewsFeed', params: newsParams, headers, allowlist }),
    fetchUpstream({ route: 'hubArtistJobs', params: jobsParams, headers, allowlist }),
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
        { id: 'pulse', label: 'News', href: '/news' },
        { id: 'events', label: 'Events', href: '/events' },
        { id: 'jobs', label: 'Jobs', href: '/jobs' },
        { id: 'profile', label: 'Profile', href: '/profile' },
      ],
    },
    generatedAt: new Date().toISOString(),
  })
}
