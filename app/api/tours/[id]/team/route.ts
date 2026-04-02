import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

const createTeamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.string().min(1, 'Role is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  status: z.enum(['confirmed', 'pending', 'declined']).default('pending'),
  arrival_date: z.string().optional(),
  departure_date: z.string().optional(),
  responsibilities: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {
      console.log('[Tour Team API] GET request for tour team:', id)

    // Verify the user owns this tour
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (tourError) {
      console.error('[Tour Team API] Error fetching tour for ownership check:', tourError)
      if (tourError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) {
      console.log('[Tour Team API] User does not have access to this tour')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch team members for this tour
    const { data: teamMembers, error: teamError } = await supabase
      .from('tour_team_members')
      .select('*')
      .eq('tour_id', id)
      .order('name', { ascending: true })

    if (teamError) {
      console.error('[Tour Team API] Error fetching team members:', teamError)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    console.log('[Tour Team API] Successfully fetched team members:', teamMembers?.length || 0)

      return NextResponse.json({ 
        success: true, 
        team_members: teamMembers || [],
        message: 'Tour team members fetched successfully' 
      })

    } catch (error) {
      console.error('[Tour Team API] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {
      console.log('[Tour Team API] POST request for tour team member:', id)

    const body = await request.json()
    const validatedData = createTeamMemberSchema.parse(body)

    // Verify the user owns this tour
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id, name as tour_name')
      .eq('id', id)
      .single()

    if (tourError) {
      console.error('[Tour Team API] Error fetching tour for ownership check:', tourError)
      if (tourError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) {
      console.log('[Tour Team API] User does not have access to this tour')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create the team member
    const teamMemberData = {
      ...validatedData,
      tour_id: id,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: teamMember, error: teamMemberError } = await supabase
      .from('tour_team_members')
      .insert(teamMemberData)
      .select()
      .single()

    if (teamMemberError) {
      console.error('[Tour Team API] Error creating team member:', teamMemberError)
      return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 })
    }

    console.log('[Tour Team API] Successfully created team member:', teamMember.id)

      return NextResponse.json({ 
        success: true, 
        member: teamMember,
        message: 'Team member added successfully to tour' 
      })

    } catch (error) {
      console.error('[Tour Team API] Error:', error)
      if (error instanceof z.ZodError) {
        return NextResponse.json({ 
          error: 'Validation error', 
          details: error.errors 
        }, { status: 400 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
} 