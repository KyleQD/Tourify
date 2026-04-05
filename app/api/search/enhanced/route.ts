import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractCreatorCapabilitiesV1 } from '@/lib/creator/capability-system'

interface EnhancedSearchResult {
  id: string
  type: 'artist' | 'venue' | 'user'
  username: string
  displayName: string
  avatar?: string
  bio?: string
  location?: string
  genres?: string[]
  skills?: string[]
  experience?: string
  availability?: string
  verified: boolean
  followers: number
  following: number
  posts: number
  created_at: string
  updated_at: string
  recommendations?: {
    reason: string
    score: number
  }
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean)
  if (typeof value === 'string')
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
  return []
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeBool(value: string | null): boolean {
  return value === 'true' || value === '1' || value === 'yes'
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

function buildArtistResult(params: {
  artist: Record<string, any>
  profile: Record<string, any> | null
  includeRecommendations: boolean
  query: string
}): EnhancedSearchResult {
  const { artist, profile, includeRecommendations, query } = params
  const settings = artist.settings && typeof artist.settings === 'object' ? artist.settings : {}
  const professional = settings.professional && typeof settings.professional === 'object' ? settings.professional : {}
  const capabilities = extractCreatorCapabilitiesV1(settings)

  const creatorType = capabilities.creatorType || ''
  const services = capabilities.serviceOfferings
  const credentials = capabilities.credentials
  const isAvailableForHire = capabilities.availableForHire
  const location = normalizeText(profile?.location) || normalizeText(professional.location) || undefined
  const genres = asArray(artist.genres)
  const displayName =
    normalizeText(artist.artist_name) ||
    normalizeText(profile?.full_name) ||
    normalizeText(profile?.username) ||
    'Artist'

  const recommendationReason = query
    ? `Matches "${query}" in creator profile`
    : isAvailableForHire
      ? 'Currently available for hire'
      : 'Strong creator profile'

  return {
    id: String(profile?.id || artist.user_id || artist.id),
    type: 'artist',
    username: normalizeText(profile?.username) || String(artist.user_id || artist.id),
    displayName,
    avatar: normalizeText(profile?.avatar_url) || undefined,
    bio: normalizeText(artist.bio || profile?.bio) || undefined,
    location,
    genres,
    skills: [creatorType, ...services, ...credentials].filter(Boolean),
    experience: normalizeText(professional.experience_years) || undefined,
    availability: isAvailableForHire ? 'available' : 'busy',
    verified: Boolean(profile?.is_verified || artist.verification_status === 'verified'),
    followers: toNumber(profile?.followers_count),
    following: toNumber(profile?.following_count),
    posts: toNumber(profile?.posts_count),
    created_at: String(artist.created_at || profile?.created_at || new Date().toISOString()),
    updated_at: String(artist.updated_at || profile?.updated_at || new Date().toISOString()),
    recommendations: includeRecommendations
      ? {
          reason: recommendationReason,
          score: isAvailableForHire ? 0.95 : 0.85
        }
      : undefined
  }
}

function matchesQuery(text: string, tokens: string[]): boolean {
  if (!tokens.length) return true
  const normalizedText = text.toLowerCase()
  return tokens.every(token => normalizedText.includes(token))
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const query = normalizeText(searchParams.get('q'))
    const queryTokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6)
    const type = normalizeText(searchParams.get('type')) || 'all'
    const location = normalizeText(searchParams.get('location'))
    const genre = normalizeText(searchParams.get('genre'))
    const creatorType = normalizeText(searchParams.get('creatorType'))
    const service = normalizeText(searchParams.get('service'))
    const verifiedOnly = normalizeBool(searchParams.get('verified'))
    const availableForHireOnly = normalizeBool(searchParams.get('availableForHire'))
    const includeRecommendations = searchParams.get('includeRecommendations') !== 'false'
    const sortBy = normalizeText(searchParams.get('sortBy')) || 'relevance'
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

    const isArtistSearch = type === 'all' || type === 'artists' || type === 'artist'
    const isVenueSearch = type === 'all' || type === 'venues' || type === 'venue'
    const isUserSearch = type === 'all' || type === 'users' || type === 'user'

    const results: EnhancedSearchResult[] = []

    if (isArtistSearch) {
      const { data: artistRows } = await supabase
        .from('artist_profiles')
        .select('id, user_id, artist_name, bio, genres, settings, verification_status, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(300)

      const artistProfiles = artistRows || []
      const userIds = Array.from(new Set(artistProfiles.map(row => String(row.user_id)).filter(Boolean)))

      const { data: profileRows } = userIds.length
        ? await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, bio, location, is_verified, followers_count, following_count, posts_count, created_at, updated_at')
            .in('id', userIds)
        : { data: [] as any[] }

      const profileById = (profileRows || []).reduce<Record<string, Record<string, any>>>((acc, row) => {
        acc[String(row.id)] = row
        return acc
      }, {})

      const artistResults = artistProfiles
        .map(artist => {
          const profile = profileById[String(artist.user_id)] || null
          return buildArtistResult({ artist, profile, includeRecommendations, query })
        })
        .filter(result => {
          const searchable = [
            result.displayName,
            result.username,
            result.bio || '',
            result.location || '',
            ...(result.genres || []),
            ...(result.skills || [])
          ].join(' ')

          if (!matchesQuery(searchable, queryTokens)) return false
          if (verifiedOnly && !result.verified) return false
          if (location && !normalizeText(result.location).toLowerCase().includes(location.toLowerCase())) return false
          if (genre && !(result.genres || []).some(item => item.toLowerCase().includes(genre.toLowerCase()))) return false
          if (creatorType && !(result.skills || []).some(item => item.toLowerCase().includes(creatorType.toLowerCase())))
            return false
          if (service && !(result.skills || []).some(item => item.toLowerCase().includes(service.toLowerCase())))
            return false
          if (availableForHireOnly && result.availability !== 'available') return false
          return true
        })

      results.push(...artistResults)
    }

    try {
      const shouldQueryAccounts = isVenueSearch || isUserSearch
      if (shouldQueryAccounts) {
        let accountsQuery = supabase
          .from('accounts')
          .select('id, owner_user_id, account_type, display_name, username, avatar_url, is_verified, metadata, created_at, updated_at')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
          .limit(200)

        if (type === 'venues' || type === 'venue') accountsQuery = accountsQuery.eq('account_type', 'venue')
        if (type === 'users' || type === 'user') accountsQuery = accountsQuery.eq('account_type', 'general')

        const { data: accountRows, error: accountsError } = await accountsQuery
        if (!accountsError && accountRows?.length) {
          const normalized = accountRows
            .map((account: any): EnhancedSearchResult => {
              const metadata = account.metadata && typeof account.metadata === 'object' ? account.metadata : {}
              const accountType = account.account_type === 'venue' ? 'venue' : 'user'
              return {
                id: String(account.id),
                type: accountType,
                username: normalizeText(account.username) || String(account.id),
                displayName:
                  normalizeText(account.display_name) ||
                  normalizeText(metadata.venue_name) ||
                  normalizeText(metadata.name) ||
                  'User',
                avatar: normalizeText(account.avatar_url) || undefined,
                bio: normalizeText(metadata.description || metadata.bio) || undefined,
                location:
                  normalizeText(metadata.location) ||
                  [normalizeText(metadata.city), normalizeText(metadata.state)].filter(Boolean).join(', ') ||
                  undefined,
                verified: Boolean(account.is_verified),
                followers: toNumber(metadata.followers_count),
                following: toNumber(metadata.following_count),
                posts: toNumber(metadata.posts_count),
                created_at: String(account.created_at || new Date().toISOString()),
                updated_at: String(account.updated_at || new Date().toISOString())
              }
            })
            .filter(result => {
              if (verifiedOnly && !result.verified) return false
              if (location && !normalizeText(result.location).toLowerCase().includes(location.toLowerCase())) return false
              const searchable = `${result.displayName} ${result.username} ${result.bio || ''} ${result.location || ''}`
              return matchesQuery(searchable, queryTokens)
            })

          results.push(...normalized)
        }
      }
    } catch {
      // Keep response functional even if accounts table is unavailable.
    }

    if (isUserSearch && results.every(result => result.type !== 'user')) {
      const { data: userRows } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio, location, is_verified, followers_count, following_count, posts_count, created_at, updated_at')
        .order('updated_at', { ascending: false })
        .limit(150)

      const fallbackUsers = (userRows || [])
        .map((row: any): EnhancedSearchResult => ({
          id: String(row.id),
          type: 'user',
          username: normalizeText(row.username) || String(row.id),
          displayName: normalizeText(row.full_name) || normalizeText(row.username) || 'User',
          avatar: normalizeText(row.avatar_url) || undefined,
          bio: normalizeText(row.bio) || undefined,
          location: normalizeText(row.location) || undefined,
          verified: Boolean(row.is_verified),
          followers: toNumber(row.followers_count),
          following: toNumber(row.following_count),
          posts: toNumber(row.posts_count),
          created_at: String(row.created_at || new Date().toISOString()),
          updated_at: String(row.updated_at || new Date().toISOString())
        }))
        .filter(result => {
          if (verifiedOnly && !result.verified) return false
          if (location && !normalizeText(result.location).toLowerCase().includes(location.toLowerCase())) return false
          const searchable = `${result.displayName} ${result.username} ${result.bio || ''}`
          return matchesQuery(searchable, queryTokens)
        })

      results.push(...fallbackUsers)
    }

    const uniqueResults = Array.from(
      new Map(results.map(result => [`${result.type}:${result.id}`, result])).values()
    )

    const sorted = [...uniqueResults].sort((first, second) => {
      if (sortBy === 'popularity') return second.followers - first.followers
      if (sortBy === 'recent')
        return new Date(second.updated_at).getTime() - new Date(first.updated_at).getTime()

      const firstHasQueryMatch = queryTokens.length
        ? matchesQuery(`${first.displayName} ${first.username} ${first.bio || ''}`.toLowerCase(), queryTokens)
        : true
      const secondHasQueryMatch = queryTokens.length
        ? matchesQuery(`${second.displayName} ${second.username} ${second.bio || ''}`.toLowerCase(), queryTokens)
        : true

      if (firstHasQueryMatch !== secondHasQueryMatch) return firstHasQueryMatch ? -1 : 1
      if (first.verified !== second.verified) return first.verified ? -1 : 1
      return second.followers - first.followers
    })

    const paged = sorted.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      results: paged,
      total: sorted.length,
      query,
      filters: {
        type,
        location,
        genre,
        creatorType,
        service,
        availableForHire: availableForHireOnly,
        verified: verifiedOnly,
        sortBy
      }
    })
  } catch (error) {
    console.error('Enhanced search API error:', error)
    return NextResponse.json({ error: 'Failed to perform enhanced search' }, { status: 500 })
  }
}
