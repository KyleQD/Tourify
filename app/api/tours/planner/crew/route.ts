import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {
    console.log('[Tour Planner Crew API] GET request started')

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query') || ''
    const specialty = searchParams.get('specialty') || ''
    const availability = searchParams.get('availability') || ''
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query for crew members
    let crewQuery = supabase
      .from('venue_crew_members')
      .select(`
        id,
        name,
        email,
        phone,
        avatar_url,
        specialty,
        skills,
        certifications,
        rate,
        rate_type,
        availability,
        rating,
        events_completed,
        is_available,
        preferred_event_types,
        equipment,
        notes,
        created_at,
        updated_at
      `)
      .order('name')
      .range(offset, offset + limit - 1)

    // Apply filters
    if (query) {
      crewQuery = crewQuery.or(`name.ilike.%${query}%,specialty.ilike.%${query}%,skills.cs.{${query}}`)
    }

    if (specialty && specialty !== 'all') {
      crewQuery = crewQuery.eq('specialty', specialty)
    }

    if (availability === 'available') {
      crewQuery = crewQuery.eq('is_available', true)
    } else if (availability === 'unavailable') {
      crewQuery = crewQuery.eq('is_available', false)
    }

    const { data: crew, error } = await crewQuery

    if (error) {
      console.error('[Tour Planner Crew API] Error fetching crew:', error)
      if (error.code === '42P01') {
        // Table doesn't exist, return mock data
        return NextResponse.json({
          crew: [
            {
              id: 'crew-1',
              name: 'Alex Rodriguez',
              email: 'alex@example.com',
              phone: '(555) 111-2222',
              specialty: 'Sound Engineer',
              skills: ['Live Sound', 'Mixing', 'Troubleshooting'],
              certifications: ['AES Member', 'Pro Tools Certified'],
              rate: 250,
              rate_type: 'daily',
              availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
              rating: 4.9,
              events_completed: 127,
              is_available: true,
              preferred_event_types: ['concert', 'festival'],
              equipment: ['Shure SM58', 'Yamaha MG16XU']
            },
            {
              id: 'crew-2',
              name: 'Maria Garcia',
              email: 'maria@example.com',
              phone: '(555) 333-4444',
              specialty: 'Lighting Technician',
              skills: ['DMX Programming', 'LED Systems', 'Moving Lights'],
              certifications: ['ETCP Certified'],
              rate: 200,
              rate_type: 'daily',
              availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
              rating: 4.7,
              events_completed: 89,
              is_available: true,
              preferred_event_types: ['concert', 'theater'],
              equipment: ['GrandMA2', 'LED Par Cans']
            },
            {
              id: 'crew-3',
              name: 'David Chen',
              email: 'david@example.com',
              phone: '(555) 555-6666',
              specialty: 'Stage Manager',
              skills: ['Stage Management', 'Crew Coordination', 'Safety Protocols'],
              certifications: ['OSHA Safety Certified'],
              rate: 300,
              rate_type: 'daily',
              availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
              rating: 4.8,
              events_completed: 156,
              is_available: false,
              preferred_event_types: ['concert', 'festival', 'corporate'],
              equipment: ['Communication System', 'Safety Equipment']
            },
            {
              id: 'crew-4',
              name: 'Lisa Thompson',
              email: 'lisa@example.com',
              phone: '(555) 777-8888',
              specialty: 'Photographer',
              skills: ['Live Photography', 'Photo Editing', 'Social Media'],
              certifications: ['Professional Photographer'],
              rate: 150,
              rate_type: 'daily',
              availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
              rating: 4.6,
              events_completed: 203,
              is_available: true,
              preferred_event_types: ['concert', 'festival', 'corporate'],
              equipment: ['Canon EOS R5', 'Various Lenses', 'Lighting Kit']
            }
          ],
          total: 4
        })
      }
      return NextResponse.json({ error: 'Failed to fetch crew' }, { status: 500 })
    }

    // Get total count
    let countQuery = supabase
      .from('venue_crew_members')
      .select('*', { count: 'exact', head: true })

    if (query) {
      countQuery = countQuery.or(`name.ilike.%${query}%,specialty.ilike.%${query}%,skills.cs.{${query}}`)
    }
    if (specialty && specialty !== 'all') countQuery = countQuery.eq('specialty', specialty)
    if (availability === 'available') countQuery = countQuery.eq('is_available', true)
    else if (availability === 'unavailable') countQuery = countQuery.eq('is_available', false)

    const { count } = await countQuery

    // Transform crew for the planner
    const transformedCrew = crew?.map((member: any) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      avatarUrl: member.avatar_url,
      specialty: member.specialty,
      skills: member.skills || [],
      certifications: member.certifications || [],
      rate: member.rate,
      rateType: member.rate_type,
      availability: member.availability || [],
      rating: member.rating,
      eventsCompleted: member.events_completed,
      isAvailable: member.is_available,
      preferredEventTypes: member.preferred_event_types || [],
      equipment: member.equipment || [],
      notes: member.notes
    })) || []

    return NextResponse.json({
      crew: transformedCrew,
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('[Tour Planner Crew API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})