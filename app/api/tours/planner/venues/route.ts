import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    console.log('[Tour Planner Venues API] GET request started')

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const city = searchParams.get('city') || ''
    const state = searchParams.get('state') || ''
    const minCapacity = searchParams.get('min_capacity')
    const maxCapacity = searchParams.get('max_capacity')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query for venues
    let venueQuery = supabase
      .from('venue_profiles')
      .select(`
        id,
        venue_name,
        description,
        address,
        city,
        state,
        country,
        postal_code,
        capacity,
        venue_types,
        contact_info,
        created_at,
        updated_at
      `)
      .order('venue_name')
      .range(offset, offset + limit - 1)

    // Apply filters
    if (query) {
      venueQuery = venueQuery.or(`venue_name.ilike.%${query}%,description.ilike.%${query}%,city.ilike.%${query}%`)
    }

    if (city) {
      venueQuery = venueQuery.ilike('city', `%${city}%`)
    }

    if (state) {
      venueQuery = venueQuery.ilike('state', `%${state}%`)
    }

    if (minCapacity) {
      venueQuery = venueQuery.gte('capacity', parseInt(minCapacity))
    }

    if (maxCapacity) {
      venueQuery = venueQuery.lte('capacity', parseInt(maxCapacity))
    }

    const { data: venues, error } = await venueQuery

    if (error) {
      console.error('[Tour Planner Venues API] Error fetching venues:', error)
      if (error.code === '42P01') {
        // Table doesn't exist, return mock data
        return NextResponse.json({
          venues: [
            {
              id: 'venue-1',
              venue_name: 'The Grand Theater',
              description: 'Historic theater with excellent acoustics',
              address: '123 Main St',
              city: 'Los Angeles',
              state: 'CA',
              country: 'USA',
              capacity: 2500,
              venue_types: ['Theater', 'Concert Hall'],
              contact_info: { email: 'booking@grandtheater.com', phone: '(555) 123-4567' }
            },
            {
              id: 'venue-2',
              venue_name: 'Riverside Amphitheater',
              description: 'Outdoor amphitheater with scenic views',
              address: '456 River Rd',
              city: 'Austin',
              state: 'TX',
              country: 'USA',
              capacity: 8000,
              venue_types: ['Outdoor', 'Amphitheater'],
              contact_info: { email: 'events@riverside.com', phone: '(555) 987-6543' }
            },
            {
              id: 'venue-3',
              venue_name: 'Downtown Arena',
              description: 'Modern arena with state-of-the-art facilities',
              address: '789 Arena Blvd',
              city: 'Nashville',
              state: 'TN',
              country: 'USA',
              capacity: 15000,
              venue_types: ['Arena', 'Sports'],
              contact_info: { email: 'bookings@downtownarena.com', phone: '(555) 456-7890' }
            }
          ],
          total: 3
        })
      }
      return NextResponse.json({ error: 'Failed to fetch venues' }, { status: 500 })
    }

    // Get total count
    let countQuery = supabase
      .from('venue_profiles')
      .select('*', { count: 'exact', head: true })

    if (query) {
      countQuery = countQuery.or(`venue_name.ilike.%${query}%,description.ilike.%${query}%,city.ilike.%${query}%`)
    }
    if (city) countQuery = countQuery.ilike('city', `%${city}%`)
    if (state) countQuery = countQuery.ilike('state', `%${state}%`)
    if (minCapacity) countQuery = countQuery.gte('capacity', parseInt(minCapacity))
    if (maxCapacity) countQuery = countQuery.lte('capacity', parseInt(maxCapacity))

    const { count } = await countQuery

    // Transform venues for the planner
    const transformedVenues = venues?.map((venue: any) => ({
      id: venue.id,
      name: venue.venue_name,
      description: venue.description,
      address: venue.address,
      city: venue.city,
      state: venue.state,
      country: venue.country,
      capacity: venue.capacity,
      venueTypes: venue.venue_types || [],
      contact: venue.contact_info || {},
      fullAddress: `${venue.address || ''}, ${venue.city || ''}, ${venue.state || ''} ${venue.postal_code || ''}`.trim()
    })) || []

    return NextResponse.json({
      venues: transformedVenues,
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('[Tour Planner Venues API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})