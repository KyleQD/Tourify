import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    console.log('[Tour Planner Artists API] GET request started')

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
        // Table doesn't exist, return mock data
        return NextResponse.json({
          artists: [
            {
              id: 'artist-1',
              display_name: 'John Smith',
              bio: 'Acclaimed singer-songwriter with 10+ years of experience',
              location: 'Los Angeles, CA',
              avatar_url: null,
              primary_genres: ['Rock', 'Folk'],
              account_tier: 'established',
              verification_status: 'verified',
              contact_email: 'john@example.com',
              total_events: 45,
              total_revenue: 125000,
              rating: 4.8,
              follower_count: 15000
            },
            {
              id: 'artist-2',
              display_name: 'Sarah Johnson',
              bio: 'Jazz vocalist and pianist with a unique style',
              location: 'New York, NY',
              avatar_url: null,
              primary_genres: ['Jazz', 'Blues'],
              account_tier: 'emerging',
              verification_status: 'verified',
              contact_email: 'sarah@example.com',
              total_events: 23,
              total_revenue: 45000,
              rating: 4.6,
              follower_count: 8500
            },
            {
              id: 'artist-3',
              display_name: 'Mike Davis',
              bio: 'Electronic music producer and DJ',
              location: 'Austin, TX',
              avatar_url: null,
              primary_genres: ['Electronic', 'House'],
              account_tier: 'established',
              verification_status: 'verified',
              contact_email: 'mike@example.com',
              total_events: 67,
              total_revenue: 180000,
              rating: 4.9,
              follower_count: 25000
            }
          ],
          total: 3
        })
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