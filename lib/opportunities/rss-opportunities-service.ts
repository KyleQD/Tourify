import type { SupabaseClient } from '@supabase/supabase-js'

interface RSSNewsItem {
  id: string
  title: string
  description: string
  link: string
  pubDate: string
  source: string
  category?: string
}

export interface OpportunityRecordInput {
  externalId: string
  sourceName: string
  sourceCategory: string
  title: string
  summary: string
  url: string
  locationText: string | null
  opportunityType: 'job' | 'gig' | 'grant' | 'submission' | 'networking' | 'education'
  tags: string[]
  publishedAt: string
  opportunityScore: number
  metadata: Record<string, unknown>
}

export async function ingestOpportunitiesFromRss(params: {
  origin: string
  supabase: SupabaseClient
  limitPerCategory?: number
}) {
  const categories = ['Music Industry', 'Music News', 'Hip-Hop', 'Electronic Music', 'Indie Music', 'Local Music']
  const limit = params.limitPerCategory || 24

  const payloads = await Promise.all(
    categories.map(async category => {
      const endpoint = new URL('/api/feed/rss-news', params.origin)
      endpoint.searchParams.set('limit', String(limit))
      endpoint.searchParams.set('category', category)
      const response = await fetch(endpoint.toString(), { cache: 'no-store' })
      if (!response.ok) return []
      const data = await response.json()
      return Array.isArray(data.news) ? (data.news as RSSNewsItem[]) : []
    })
  )

  const deduped = dedupeByLink(payloads.flat()).slice(0, 240)
  const opportunities = deduped
    .map(item => toOpportunity(item))
    .filter((item): item is OpportunityRecordInput => Boolean(item))

  if (!opportunities.length) return { upserted: 0 }

  const { error } = await params.supabase.from('opportunities').upsert(
    opportunities.map(item => ({
      external_id: item.externalId,
      source_name: item.sourceName,
      source_category: item.sourceCategory,
      title: item.title,
      summary: item.summary,
      url: item.url,
      location_text: item.locationText,
      opportunity_type: item.opportunityType,
      tags: item.tags,
      published_at: item.publishedAt,
      opportunity_score: item.opportunityScore,
      metadata: item.metadata
    })),
    { onConflict: 'source_name,external_id' }
  )

  if (error) throw error
  return { upserted: opportunities.length }
}

export async function getPersonalizedOpportunities(params: {
  supabase: SupabaseClient
  userId?: string
  limit: number
  location?: string
  types?: string[]
}) {
  const userSignal = await getUserOpportunitySignal({
    supabase: params.supabase,
    userId: params.userId,
    location: params.location
  })

  let query = params.supabase
    .from('opportunities')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(Math.max(40, params.limit * 6))

  if (params.types?.length)
    query = query.in('opportunity_type', params.types)

  const { data, error } = await query
  if (error) throw error

  const rows = Array.isArray(data) ? data : []
  const scored = rows
    .map(row => ({
      ...row,
      rank_score: scoreOpportunity({
        row,
        locationTokens: userSignal.locationTokens,
        topicTokens: userSignal.topicTokens,
        preferredTypes: userSignal.preferredTypes
      })
    }))
    .sort((left, right) => right.rank_score - left.rank_score)
    .slice(0, params.limit)

  return scored
}

async function getUserOpportunitySignal(params: {
  supabase: SupabaseClient
  userId?: string
  location?: string
}) {
  const locationTokens = new Set<string>()
  const topicTokens = new Set<string>()
  const preferredTypes = new Set<string>()

  if (params.location)
    tokenize(params.location).forEach(token => locationTokens.add(token))

  if (!params.userId)
    return { locationTokens, topicTokens, preferredTypes }

  try {
    const { data: profile } = await params.supabase
      .from('profiles')
      .select('location, bio')
      .eq('id', params.userId)
      .maybeSingle()

    tokenize(profile?.location || '').forEach(token => locationTokens.add(token))
    extractKeywords(profile?.bio || '').forEach(token => topicTokens.add(token))
  } catch {}

  try {
    const { data: artistProfiles } = await params.supabase
      .from('artist_profiles')
      .select('genres')
      .eq('user_id', params.userId)
      .limit(1)

    const genres = Array.isArray(artistProfiles?.[0]?.genres) ? artistProfiles[0].genres : []
    for (const genre of genres)
      tokenize(String(genre)).forEach(token => topicTokens.add(token))
  } catch {}

  try {
    const { data: interactions } = await params.supabase
      .from('user_opportunity_interactions')
      .select('interaction_type, opportunities(opportunity_type, tags)')
      .eq('user_id', params.userId)
      .in('interaction_type', ['save', 'apply', 'click'])
      .order('created_at', { ascending: false })
      .limit(80)

    for (const row of interactions || []) {
      const opportunity = Array.isArray(row?.opportunities) ? row.opportunities[0] : row?.opportunities
      const opportunityType = opportunity?.opportunity_type
      if (typeof opportunityType === 'string')
        preferredTypes.add(opportunityType)

      const tags = Array.isArray(opportunity?.tags) ? opportunity.tags : []
      for (const tag of tags)
        tokenize(String(tag)).forEach(token => topicTokens.add(token))
    }
  } catch {}

  return { locationTokens, topicTokens, preferredTypes }
}

function scoreOpportunity(params: {
  row: any
  locationTokens: Set<string>
  topicTokens: Set<string>
  preferredTypes: Set<string>
}) {
  const baseScore = Number(params.row.opportunity_score || 0.4)
  const text = `${params.row.title || ''} ${params.row.summary || ''} ${params.row.location_text || ''} ${(params.row.tags || []).join(' ')}`.toLowerCase()
  const topicMatchCount = Array.from(params.topicTokens).filter(token => text.includes(token)).length
  const locationMatch = Array.from(params.locationTokens).some(token => text.includes(token)) ? 1 : 0
  const typeMatch = params.preferredTypes.has(String(params.row.opportunity_type || '').toLowerCase()) ? 1 : 0
  const freshnessHours = Math.max(1, (Date.now() - new Date(params.row.published_at).getTime()) / (60 * 60 * 1000))
  const freshness = Math.max(0.08, 1 / Math.sqrt(freshnessHours))

  return Number(
    (
      baseScore * 0.35 +
      freshness * 0.3 +
      Math.min(1, topicMatchCount / 4) * 0.2 +
      locationMatch * 0.1 +
      typeMatch * 0.05
    ).toFixed(6)
  )
}

function toOpportunity(item: RSSNewsItem): OpportunityRecordInput | null {
  const title = toPlainText(item.title)
  const summary = toPlainText(item.description)
  const combined = `${title} ${summary}`.toLowerCase()
  const opportunityType = detectOpportunityType(combined)
  if (!opportunityType) return null
  const safeUrl = normalizeExternalUrl(item.link)
  if (!safeUrl) return null

  const locationText = detectLocation(combined)
  const tags = detectTags(combined)

  return {
    externalId: String(item.id || item.link),
    sourceName: String(item.source || 'RSS Source'),
    sourceCategory: String(item.category || 'Music News'),
    title,
    summary,
    url: safeUrl,
    locationText,
    opportunityType,
    tags,
    publishedAt: item.pubDate || new Date().toISOString(),
    opportunityScore: estimateOpportunityScore({ combined, opportunityType }),
    metadata: {
      category: item.category || null
    }
  }
}

function detectOpportunityType(text: string): OpportunityRecordInput['opportunityType'] | null {
  if (matchesAny(text, ['hiring', 'job', 'career', 'open role', 'position', 'recruiting'])) return 'job'
  if (matchesAny(text, ['gig', 'booking', 'booked', 'lineup', 'support slot', 'tour', 'festival', 'show', 'residency', 'opening act']))
    return 'gig'
  if (matchesAny(text, ['grant', 'funding', 'fellowship', 'financial support'])) return 'grant'
  if (matchesAny(text, ['submit', 'submission', 'call for artists', 'contest', 'competition'])) return 'submission'
  if (matchesAny(text, ['conference', 'meetup', 'networking', 'summit', 'expo', 'panel', 'industry event'])) return 'networking'
  if (matchesAny(text, ['workshop', 'masterclass', 'course', 'training', 'mentorship'])) return 'education'
  return null
}

function detectLocation(text: string): string | null {
  const tokens: string[] = text.match(/\b[a-z]{3,}\b/g) || []
  const locationHints = ['los', 'angeles', 'new', 'york', 'london', 'berlin', 'atlanta', 'nashville', 'austin', 'chicago', 'miami']
  const hit = locationHints.find(token => tokens.includes(token))
  if (!hit) return null
  if (hit === 'los') return 'Los Angeles'
  if (hit === 'new') return 'New York'
  return hit.charAt(0).toUpperCase() + hit.slice(1)
}

function detectTags(text: string) {
  const keywords = ['hip-hop', 'electronic', 'indie', 'tour', 'festival', 'sync', 'label', 'management', 'marketing']
  return keywords.filter(keyword => text.includes(keyword))
}

function estimateOpportunityScore(params: { combined: string; opportunityType: OpportunityRecordInput['opportunityType'] }) {
  let score = 0.45
  if (params.opportunityType === 'job' || params.opportunityType === 'gig') score += 0.2
  if (matchesAny(params.combined, ['deadline', 'apply now', 'limited', 'urgent'])) score += 0.12
  if (matchesAny(params.combined, ['paid', 'stipend', 'compensation'])) score += 0.1
  return Math.min(1, Number(score.toFixed(4)))
}

function matchesAny(text: string, terms: string[]) {
  return terms.some(term => text.includes(term))
}

function dedupeByLink(items: RSSNewsItem[]) {
  const seen = new Set<string>()
  const output: RSSNewsItem[] = []
  for (const item of items) {
    const key = String(item.link || item.id || '').trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(item)
  }
  return output
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map(token => token.trim())
    .filter(token => token.length >= 3)
}

function extractKeywords(value: string) {
  const blocked = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'you', 'are'])
  return tokenize(value).filter(token => !blocked.has(token)).slice(0, 28)
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

function normalizeExternalUrl(value: string | undefined) {
  if (!value) return null
  try {
    const parsed = new URL(String(value))
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}
