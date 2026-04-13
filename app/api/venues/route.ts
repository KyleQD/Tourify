import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Comprehensive venue validation schema
const venueProfileSchema = z.object({
  venue_name: z.string().min(1, 'Venue name is required').max(100),
  tagline: z.string().max(150).optional(),
  description: z.string().max(2000).optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  neighborhood: z.string().max(100).optional(),
  coordinates: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
  capacity_standing: z.number().min(0).optional(),
  capacity_seated: z.number().min(0).optional(),
  capacity_total: z.number().min(1).optional(),
  venue_types: z.array(z.string()).min(1, 'Select at least one venue type'),
  age_restrictions: z.string().optional(),
  operating_hours: z.object({
    monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean() }).optional(),
  }).optional(),
  contact_info: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    booking_email: z.string().email().optional().or(z.literal('')),
    manager_name: z.string().optional(),
    manager_phone: z.string().optional(),
    booking_phone: z.string().optional(),
  }).optional(),
  social_links: z.object({
    website: z.string().url().optional().or(z.literal('')),
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    tiktok: z.string().optional(),
    youtube: z.string().optional(),
    linkedin: z.string().optional(),
  }).optional(),
  settings: z.object({
    booking: z.object({
      accept_bookings: z.boolean().default(true),
      min_advance_booking: z.string().optional(),
      max_advance_booking: z.string().optional(),
      auto_approve_bookings: z.boolean().default(false),
      require_deposit: z.boolean().default(false),
      deposit_percentage: z.number().min(0).max(100).optional(),
      cancellation_policy: z.string().optional(),
      house_rules: z.string().optional(),
      age_restriction: z.string().optional(),
    }).optional(),
    amenities: z.record(z.boolean()).optional(),
    technical_specs: z.record(z.union([z.string(), z.number()])).optional(),
    operational: z.record(z.union([z.string(), z.boolean()])).optional(),
    payment: z.object({
      base_rental_rate: z.string().optional(),
      hourly_rate: z.string().optional(),
      security_deposit: z.string().optional(),
      accepted_payment_methods: z.array(z.string()).optional(),
      payment_terms: z.string().optional(),
      late_fee_percentage: z.number().min(0).max(100).optional(),
      currency: z.string().default('USD'),
    }).optional(),
  }).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  cover_image_url: z.string().url().optional().or(z.literal('')),
  meta_description: z.string().max(160).optional(),
  keywords: z.array(z.string()).optional(),
  is_public: z.boolean().default(true),
})

const venueSearchSchema = z.object({
  query: z.string().optional(),
  venue_type: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  min_capacity: z.number().optional(),
  max_capacity: z.number().optional(),
  amenities: z.array(z.string()).optional(),
  limit: z.number().max(100).default(20),
  offset: z.number().min(0).default(0),
})

// GET - Search and list venues
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse search parameters manually to avoid Zod issues
    const query = searchParams.get('query') || undefined
    const venue_type = searchParams.get('venue_type') || undefined
    const city = searchParams.get('city') || undefined
    const state = searchParams.get('state') || undefined
    const min_capacity = searchParams.get('min_capacity') ? parseInt(searchParams.get('min_capacity')!) : undefined
    const max_capacity = searchParams.get('max_capacity') ? parseInt(searchParams.get('max_capacity')!) : undefined
    const amenities = searchParams.get('amenities')?.split(',') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    const supabase = await createClient()
    // Basic venue search - using only columns that exist
    let venueQuery = supabase
      .from('venue_profiles')
      .select(`
        id,
        venue_name,
        description,
        city,
        state,
        country,
        capacity,
        venue_types,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Note: is_public column doesn't exist yet, so showing all venues for now

    // Apply basic filters
    if (query) {
      venueQuery = venueQuery.or(`venue_name.ilike.%${query}%,description.ilike.%${query}%,city.ilike.%${query}%`)
    }
    if (city) {
      venueQuery = venueQuery.ilike('city', `%${city}%`)
    }
    if (state) {
      venueQuery = venueQuery.ilike('state', `%${state}%`)
    }
    if (min_capacity) {
      venueQuery = venueQuery.gte('capacity', min_capacity)
    }
    if (max_capacity) {
      venueQuery = venueQuery.lte('capacity', max_capacity)
    }
    if (venue_type) {
      venueQuery = venueQuery.contains('venue_types', [venue_type])
    }

    const { data: venues, error } = await venueQuery

    if (error) {
      console.error('Error searching venues:', error)
      return NextResponse.json({ 
        error: 'Failed to search venues',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      venues: venues || [],
      pagination: {
        limit,
        offset,
        total: venues?.length || 0,
      },
      filters: {
        query,
        venue_type,
        city,
        state,
        min_capacity,
        max_capacity,
        amenities
      }
    })
  } catch (error) {
    console.error('Error in venue search:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Create a new venue profile
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const venueData = venueProfileSchema.parse(body)

    // Check if user already has a venue profile
    const { data: existingVenue, error: checkError } = await supabase
      .from('venue_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing venue:', checkError)
      return NextResponse.json({ error: 'Error checking existing venue' }, { status: 500 })
    }

    if (existingVenue) {
      return NextResponse.json({ error: 'User already has a venue profile' }, { status: 400 })
    }

    // Generate username from venue name
    const generateUsername = (venueName: string) => {
      return venueName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 30)
    }

    let username = generateUsername(venueData.venue_name)
    let usernameCounter = 0

    // Ensure unique username
    while (true) {
      const testUsername = usernameCounter === 0 ? username : `${username}-${usernameCounter}`
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', testUsername)
        .single()

      if (!existingUser) {
        username = testUsername
        break
      }
      usernameCounter++
    }

    // Generate URL slug
    const generateSlug = (name: string) => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    let urlSlug = generateSlug(venueData.venue_name)
    let slugCounter = 0

    // Ensure unique slug
    while (true) {
      const testSlug = slugCounter === 0 ? urlSlug : `${urlSlug}-${slugCounter}`
      const { data: existingSlug } = await supabase
        .from('venue_profiles')
        .select('id')
        .eq('url_slug', testSlug)
        .single()

      if (!existingSlug) {
        urlSlug = testSlug
        break
      }
      slugCounter++
    }

    // Create or update the user's main profile with username
    await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: username,
        name: venueData.venue_name,
        updated_at: new Date().toISOString()
      })

    // Create venue profile
    const { data: newVenue, error: createError } = await supabase
      .from('venue_profiles')
      .insert([
        {
          user_id: user.id,
          url_slug: urlSlug,
          ...venueData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single()

    if (createError) {
      console.error('Error creating venue profile:', createError)
      return NextResponse.json({ error: 'Failed to create venue profile' }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('account_activity_log')
      .insert([
        {
          user_id: user.id,
          profile_id: user.id,
          account_type: 'venue',
          action_type: 'create_account',
          action_details: {
            venue_id: newVenue.id,
            venue_name: venueData.venue_name,
          },
        },
      ])

    return NextResponse.json({
      success: true,
      venue: newVenue,
      message: 'Venue profile created successfully',
    })
  } catch (error) {
    console.error('Error creating venue profile:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid venue data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update venue profile
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const venueData = venueProfileSchema.partial().parse(body)

    // Get current venue profile
    const { data: currentVenue, error: fetchError } = await supabase
      .from('venue_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching venue profile:', fetchError)
      return NextResponse.json({ error: 'Venue profile not found' }, { status: 404 })
    }

    // Handle URL slug updates
    let urlSlug = currentVenue.url_slug
    if (venueData.venue_name && venueData.venue_name !== currentVenue.venue_name) {
      const generateSlug = (name: string) => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      }

      urlSlug = generateSlug(venueData.venue_name)
      let slugCounter = 0

      // Ensure unique slug
      while (true) {
        const testSlug = slugCounter === 0 ? urlSlug : `${urlSlug}-${slugCounter}`
        const { data: existingSlug } = await supabase
          .from('venue_profiles')
          .select('id')
          .eq('url_slug', testSlug)
          .neq('id', currentVenue.id)
          .single()

        if (!existingSlug) {
          urlSlug = testSlug
          break
        }
        slugCounter++
      }
    }

    // Update venue profile
    const { data: updatedVenue, error: updateError } = await supabase
      .from('venue_profiles')
      .update({
        ...venueData,
        url_slug: urlSlug,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating venue profile:', updateError)
      return NextResponse.json({ error: 'Failed to update venue profile' }, { status: 500 })
    }

    // Log activity
    await supabase
      .from('account_activity_log')
      .insert([
        {
          user_id: user.id,
          profile_id: user.id,
          account_type: 'venue',
          action_type: 'update_profile',
          action_details: {
            venue_id: updatedVenue.id,
            updated_fields: Object.keys(venueData),
          },
        },
      ])

    return NextResponse.json({
      success: true,
      venue: updatedVenue,
      message: 'Venue profile updated successfully',
    })
  } catch (error) {
    console.error('Error updating venue profile:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid venue data', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 