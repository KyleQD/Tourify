import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  try {

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
        return NextResponse.json({ crew: [], total: 0, error: 'crew table unavailable' })
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