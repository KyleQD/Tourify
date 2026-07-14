import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { generateUniqueSlug } from '@/lib/accounts/generate-unique-slug'

const createArtistSchema = z.object({
  display_name: z.string().min(1, 'Artist name is required'),
  bio: z.string().optional(),
  location: z.string().optional(),
  primary_genres: z.array(z.string()).default([]),
  avatar_url: z.string().url().optional(),
  verification_status: z.enum(['unverified', 'pending', 'verified', 'rejected']).default('unverified'),
  account_tier: z.enum(['emerging', 'established', 'headliner', 'legend']).default('emerging'),
  social_links: z.object({
    website: z.string().url().optional(),
    instagram: z.string().optional(),
    twitter: z.string().optional(),
    facebook: z.string().optional(),
    spotify: z.string().optional(),
    apple_music: z.string().optional(),
    youtube: z.string().optional(),
    soundcloud: z.string().optional(),
  }).optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tier = searchParams.get('tier')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = (supabase
      .from('profiles') as any)
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
        ),
        tours(id, name, status, start_date, end_date, revenue),
        events:tours(events(id, name, event_date, status, capacity, tickets_sold, actual_revenue))
      `)
      .eq('role', 'artist')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (tier && tier !== 'all') {
      query = query.eq('artist_profiles.account_tier', tier)
    }

    if (status && status !== 'all') {
      query = query.eq('artist_profiles.verification_status', status)
    }

    const { data: artists, error } = await query

    if (error) {
      console.error('Error fetching artists:', error)
      return NextResponse.json({ error: 'Failed to fetch artists' }, { status: 500 })
    }

    // Transform and calculate artist stats
    const artistsWithStats = artists?.map((artist: any) => {
      const artistProfile = artist.artist_profiles[0] || {}
      const tours = artist.tours || []
      const allEvents = tours.flatMap((tour: any) => tour.events || [])
      
      return {
        id: artist.id,
        name: artist.display_name,
        bio: artist.bio,
        location: artist.location,
        avatar_url: artist.avatar_url,
        genres: artist.primary_genres || [],
        tier: artistProfile.account_tier || 'emerging',
        verification_status: artistProfile.verification_status || 'unverified',
        social_links: artistProfile.social_links || {},
        contact: {
          email: artistProfile.contact_email,
          phone: artistProfile.contact_phone,
        },
        stats: {
          total_events: allEvents.length,
          total_revenue: tours.reduce((sum: number, tour: any) => sum + (tour.revenue || 0), 0),
          upcoming_events: allEvents.filter((e: any) => e.status === 'scheduled' || e.status === 'confirmed').length,
          rating: artistProfile.rating || 0,
          followers: artistProfile.follower_count || 0,
        },
        tours: tours.map((tour: any) => ({
          id: tour.id,
          name: tour.name,
          status: tour.status,
          start_date: tour.start_date,
          end_date: tour.end_date,
          revenue: tour.revenue || 0,
          events_count: tour.events?.length || 0,
        })),
        created_at: artist.created_at,
        updated_at: artist.updated_at,
      }
    })

    return NextResponse.json({ artists: artistsWithStats })
  } catch (error) {
    console.error('Artists API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createArtistSchema.parse(body)

    // Keep profiles.username as personal identity (do not overwrite with stage name).
    // Artist public handle lives on artist_profiles.url_slug.
    const urlSlug = await generateUniqueSlug({
      client: supabase,
      table: 'artist_profiles',
      base: validatedData.display_name,
      fallbackPrefix: `artist-${user.id.slice(0, 8)}`,
    })

    // Start a transaction to create both profile and artist_profile
    const { data: profile, error: profileError } = await (supabase
      .from('profiles') as any)
      .insert({
        id: user.id, // Use the authenticated user's ID
        name: validatedData.display_name,
        bio: validatedData.bio,
        avatar_url: validatedData.avatar_url,
      })
      .select('*')
      .single()

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return NextResponse.json({ error: 'Failed to create artist profile' }, { status: 500 })
    }

    const { data: artistProfile, error: artistError } = await (supabase
      .from('artist_profiles') as any)
      .insert({
        user_id: user.id,
        artist_name: validatedData.display_name,
        url_slug: urlSlug,
        bio: validatedData.bio,
        genres: validatedData.primary_genres || [],
        verification_status: validatedData.verification_status || 'unverified',
        account_tier: validatedData.account_tier || 'basic',
        social_links: validatedData.social_links || {},
      })
      .select('*')
      .single()

    if (artistError) {
      console.error('Error creating artist profile:', artistError)
      // Clean up the profile if artist profile creation failed
      await (supabase.from('profiles') as any).delete().eq('id', profile.id)
      return NextResponse.json({ error: 'Failed to create artist profile' }, { status: 500 })
    }

    // Fetch the complete artist data
    const { data: completeArtist } = await (supabase
      .from('profiles') as any)
      .select(`
        *,
        artist_profiles(*)
      `)
      .eq('id', profile.id)
      .single()

    return NextResponse.json({ 
      artist: {
        ...completeArtist,
        tier: artistProfile.account_tier,
        verification_status: artistProfile.verification_status,
        stats: {
          total_events: 0,
          total_revenue: 0,
          upcoming_events: 0,
          rating: 0,
          followers: 0,
        }
      } 
    }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Artists POST API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 