import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const genre = searchParams.get('genre') || ''
    const tier = searchParams.get('tier') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query for artists
    let artistQuery = supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        bio,
        location,
        avatar_url,
        primary_genres,
        created_at,
        updated_at,
        artist_profiles!inner(
          verification_status,
          account_tier,
          social_links,
          contact_email,
          contact_phone,
          total_events,
          total_revenue,
          rating,
          follower_count
        )
      `)
      .eq('role', 'artist')
      .order('display_name')
      .range(offset, offset + limit - 1)

    // Apply filters
    if (query) {
      artistQuery = artistQuery.or(`display_name.ilike.%${query}%,bio.ilike.%${query}%,location.ilike.%${query}%`)
    }

    if (genre) {
      artistQuery = artistQuery.contains('primary_genres', [genre])
    }

    if (tier) {
      artistQuery = artistQuery.eq('artist_profiles.account_tier', tier)
    }

    const { data: artists, error } = await artistQuery

    if (error) {
      console.error('[Tour Planner Artists API] Error fetching artists:', error)
      if (error.code === '42P01') {
        return NextResponse.json({ artists: [], total: 0, error: 'artist profiles table unavailable' })
      }
      return NextResponse.json({ error: 'Failed to fetch artists' }, { status: 500 })
    }

    // Get total count
    let countQuery = supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'artist')

    if (query) {
      countQuery = countQuery.or(`display_name.ilike.%${query}%,bio.ilike.%${query}%,location.ilike.%${query}%`)
    }
    if (genre) countQuery = countQuery.contains('primary_genres', [genre])
    if (tier) countQuery = countQuery.eq('artist_profiles.account_tier', tier)

    const { count } = await countQuery

    // Transform artists for the planner
    const transformedArtists = artists?.map((artist: any) => {
      const artistProfile = artist.artist_profiles[0] || {}
      return {
        id: artist.id,
        name: artist.display_name,
        bio: artist.bio,
        location: artist.location,
        avatarUrl: artist.avatar_url,
        genres: artist.primary_genres || [],
        tier: artistProfile.account_tier || 'emerging',
        verificationStatus: artistProfile.verification_status || 'unverified',
        contact: {
          email: artistProfile.contact_email,
          phone: artistProfile.contact_phone,
        },
        stats: {
          totalEvents: artistProfile.total_events || 0,
          totalRevenue: artistProfile.total_revenue || 0,
          rating: artistProfile.rating || 0,
          followers: artistProfile.follower_count || 0,
        },
        socialLinks: artistProfile.social_links || {}
      }
    }) || []

    return NextResponse.json({
      artists: transformedArtists,
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('[Tour Planner Artists API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})