import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

const ARTIST_PROFILE_FIELDS = `
  id,
  user_id,
  artist_name,
  bio,
  genres,
  url_slug,
  social_links
`

const PROFILE_FIELDS = 'id, username, full_name, name, bio, location, avatar_url, email'

function cleanSearch(value: string) {
  return value.trim().replace(/[,()]/g, ' ').replace(/\s+/g, ' ').slice(0, 120)
}

function userIdForProfile(profile: any) {
  return String(profile?.user_id || profile?.id || '')
}

function mergeUniqueArtists(rows: any[]) {
  const byId = new Map<string, any>()
  for (const row of rows) {
    if (!row?.id) continue
    byId.set(String(row.id), row)
  }
  return Array.from(byId.values())
}

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    const { searchParams } = new URL(request.url)
    const query = cleanSearch(searchParams.get('query') || '')
    const genre = cleanSearch(searchParams.get('genre') || '')
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 50)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    let matchingProfileIds: string[] = []
    if (query) {
      const { data: profileMatches } = await supabase
        .from('profiles')
        .select(PROFILE_FIELDS)
        .or(`full_name.ilike.%${query}%,name.ilike.%${query}%,username.ilike.%${query}%,bio.ilike.%${query}%,location.ilike.%${query}%`)
        .limit(50)

      matchingProfileIds = (profileMatches || []).map(userIdForProfile).filter(Boolean)
    }

    let directArtistQuery = supabase
      .from('artist_profiles')
      .select(ARTIST_PROFILE_FIELDS)
      .order('artist_name', { ascending: true })
      .range(offset, offset + limit - 1)

    if (query) {
      directArtistQuery = directArtistQuery.or(`artist_name.ilike.%${query}%,bio.ilike.%${query}%,url_slug.ilike.%${query}%`)
    }
    if (genre) directArtistQuery = directArtistQuery.contains('genres', [genre])

    const { data: directArtists, error } = await directArtistQuery

    if (error) {
      console.error('[Tour Planner Artists API] Error fetching artists:', error)
      if (error.code === '42P01') {
        return NextResponse.json({ artists: [], total: 0, error: 'artist profiles table unavailable' })
      }
      return NextResponse.json({ error: 'Failed to fetch artists' }, { status: 500 })
    }

    let profileMatchedArtists: any[] = []
    if (matchingProfileIds.length > 0) {
      let profileArtistQuery = supabase
        .from('artist_profiles')
        .select(ARTIST_PROFILE_FIELDS)
        .in('user_id', matchingProfileIds)
        .limit(limit)
      if (genre) profileArtistQuery = profileArtistQuery.contains('genres', [genre])

      const { data } = await profileArtistQuery
      profileMatchedArtists = data || []
    }

    const artists = mergeUniqueArtists([...(directArtists || []), ...profileMatchedArtists]).slice(0, limit)
    const userIds = artists.map((artist) => String(artist.user_id || '')).filter(Boolean)

    const profilesByUserId = new Map<string, any>()
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select(PROFILE_FIELDS)
        .in('id', userIds)

      for (const profile of profiles || []) {
        profilesByUserId.set(userIdForProfile(profile), profile)
      }
    }

    let countQuery = supabase
      .from('artist_profiles')
      .select('id', { count: 'exact', head: true })

    if (query) countQuery = countQuery.or(`artist_name.ilike.%${query}%,bio.ilike.%${query}%,url_slug.ilike.%${query}%`)
    if (genre) countQuery = countQuery.contains('genres', [genre])

    const { count } = await countQuery

    const transformedArtists = artists.map((artist: any) => {
      const userId = String(artist.user_id || '')
      const profile = profilesByUserId.get(userId) || {}
      const artistGenres = Array.isArray(artist.genres) ? artist.genres : []

      return {
        id: String(artist.id),
        userId,
        name: artist.artist_name || profile.full_name || profile.name || profile.username || 'Artist',
        bio: artist.bio || profile.bio || null,
        location: profile.location || null,
        avatarUrl: profile.avatar_url || null,
        genres: artistGenres,
        urlSlug: artist.url_slug || null,
        tier: 'emerging',
        verificationStatus: 'unverified',
        contact: {
          email: profile.email || null,
          phone: null,
        },
        stats: {
          totalEvents: 0,
          totalRevenue: 0,
          rating: 0,
          followers: 0,
        },
        socialLinks: artist.social_links || {},
      }
    })

    return NextResponse.json({
      artists: transformedArtists,
      total: count || transformedArtists.length,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[Tour Planner Artists API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
