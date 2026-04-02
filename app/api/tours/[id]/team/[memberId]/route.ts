import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

const updateTeamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  role: z.string().min(1, 'Role is required').optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  status: z.enum(['confirmed', 'pending', 'declined']).optional(),
  arrival_date: z.string().optional(),
  departure_date: z.string().optional(),
  responsibilities: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {
      console.log('[Tour Team Member API] GET request for team member:', memberId)

    // Verify the user owns this tour
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (tourError) {
      console.error('[Tour Team Member API] Error fetching tour for ownership check:', tourError)
      if (tourError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) {
      console.log('[Tour Team Member API] User does not have access to this tour')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch the specific team member
    const { data: teamMember, error: teamMemberError } = await supabase
      .from('tour_team_members')
      .select('*')
      .eq('id', memberId)
      .eq('tour_id', id)
      .single()

    if (teamMemberError) {
      console.error('[Tour Team Member API] Error fetching team member:', teamMemberError)
      if (teamMemberError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch team member' }, { status: 500 })
    }

    console.log('[Tour Team Member API] Successfully fetched team member:', memberId)

      return NextResponse.json({ 
        success: true, 
        member: teamMember,
        message: 'Team member fetched successfully' 
      })

    } catch (error) {
      console.error('[Tour Team Member API] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {
      console.log('[Tour Team Member API] PATCH request for team member:', memberId)

    const body = await request.json()
    const validatedData = updateTeamMemberSchema.parse(body)

    // Verify the user owns this tour
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (tourError) {
      console.error('[Tour Team Member API] Error fetching tour for ownership check:', tourError)
      if (tourError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) {
      console.log('[Tour Team Member API] User does not have access to this tour')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update the team member
    const { data: updatedMember, error: updateError } = await supabase
      .from('tour_team_members')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .eq('tour_id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Tour Team Member API] Error updating team member:', updateError)
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 })
    }

    console.log('[Tour Team Member API] Successfully updated team member:', memberId)

      return NextResponse.json({ 
        success: true, 
        member: updatedMember,
        message: 'Team member updated successfully' 
      })

    } catch (error) {
      console.error('[Tour Team Member API] Error:', error)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id, memberId } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {
      console.log('[Tour Team Member API] DELETE request for team member:', memberId)

    // Verify the user owns this tour
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (tourError) {
      console.error('[Tour Team Member API] Error fetching tour for ownership check:', tourError)
      if (tourError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) {
      console.log('[Tour Team Member API] User does not have access to this tour')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete the team member
    const { error: deleteError } = await supabase
      .from('tour_team_members')
      .delete()
      .eq('id', memberId)
      .eq('tour_id', id)

    if (deleteError) {
      console.error('[Tour Team Member API] Error deleting team member:', deleteError)
      return NextResponse.json({ error: 'Failed to delete team member' }, { status: 500 })
    }

    console.log('[Tour Team Member API] Successfully deleted team member:', memberId)

      return NextResponse.json({ 
        success: true, 
        message: 'Team member removed successfully' 
      })

    } catch (error) {
      console.error('[Tour Team Member API] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
} 