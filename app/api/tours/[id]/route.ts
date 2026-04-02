import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

const updateTourSchema = z.object({
  name: z.string().min(1, 'Tour name is required').optional(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'completed', 'cancelled']).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  expected_revenue: z.number().min(0).optional(),
  budget: z.number().min(0).optional(),
  crew_size: z.number().min(0).optional(),
  transportation: z.string().optional(),
  accommodation: z.string().optional(),
  equipment_requirements: z.string().optional(),
  special_requirements: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {
      console.log('[Tour API] GET request for tour:', id)

    // Fetch tour
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('*')
      .eq('id', id)
      .single()

    if (tourError) {
      console.error('[Tour API] Error fetching tour:', tourError)
      if (tourError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    // Check if user owns this tour
    if (tour.user_id !== user.id) {
      console.log('[Tour API] User does not have access to this tour')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: links } = await supabase
      .from('tour_events')
      .select(`
        id,
        ordinal,
        events_v2 (
          id,
          title,
          status,
          start_at,
          capacity,
          settings
        )
      `)
      .eq('tour_id', id)
      .order('ordinal', { ascending: true })

    const events = (links || [])
      .map((link: any) => {
        const event = link.events_v2
        if (!event) return null
        const settings = event.settings && typeof event.settings === 'object'
          ? (event.settings as Record<string, unknown>)
          : {}
        return {
          id: event.id,
          name: event.title,
          venue_name: typeof settings.venue_label === 'string' ? settings.venue_label : 'Venue',
          event_date: event.start_at ? String(event.start_at).slice(0, 10) : null,
          status: event.status,
          capacity: event.capacity || 0,
          tickets_sold: 0,
          actual_revenue: Number(settings.actual_revenue || 0),
          expenses: Number(settings.expenses || 0),
        }
      })
      .filter(Boolean)

    // Calculate derived fields
    const totalShows = events.length
    const completedShows = events.filter((event: any) => event.status === 'settled' || event.status === 'completed').length
    const actualRevenue = events.reduce((sum: number, event: any) => sum + (event.actual_revenue || 0), 0)
    const totalExpenses = events.reduce((sum: number, event: any) => sum + (event.expenses || 0), 0)

    const tourWithCalculations = {
      ...tour,
      events,
      total_shows: totalShows,
      completed_shows: completedShows,
      actual_revenue: actualRevenue,
      expenses: totalExpenses
    }

    console.log('[Tour API] Successfully fetched tour:', id)

      return NextResponse.json(tourWithCalculations)

    } catch (error) {
      console.error('[Tour API] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {
      console.log('[Tour API] PATCH request for tour:', id)

    const body = await request.json()
    const validatedData = updateTourSchema.parse(body)

    // Verify the user owns this tour
    const { data: existingTour, error: fetchError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('[Tour API] Error fetching tour for ownership check:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (existingTour.user_id !== user.id) {
      console.log('[Tour API] User does not have access to this tour')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update the tour
    const { data: updatedTour, error: updateError } = await supabase
      .from('tours')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('[Tour API] Error updating tour:', updateError)
      return NextResponse.json({ error: 'Failed to update tour' }, { status: 500 })
    }

    console.log('[Tour API] Successfully updated tour:', id)

      return NextResponse.json(updatedTour)

    } catch (error) {
      console.error('[Tour API] Error:', error)
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {
      console.log('[Tour API] DELETE request for tour:', id)

    // Verify the user owns this tour
    const { data: existingTour, error: fetchError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('[Tour API] Error fetching tour for ownership check:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (existingTour.user_id !== user.id) {
      console.log('[Tour API] User does not have access to this tour')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete tour-event links first
    const { error: linksDeleteError } = await supabase
      .from('tour_events')
      .delete()
      .eq('tour_id', id)

    if (linksDeleteError) {
      console.error('[Tour API] Error deleting associated event links:', linksDeleteError)
      return NextResponse.json({ error: 'Failed to delete associated event links' }, { status: 500 })
    }

    // Best-effort cleanup for legacy event rows that still point to tour_id
    await supabase
      .from('events')
      .delete()
      .eq('tour_id', id)

    // Delete the tour
    const { error: deleteError } = await supabase
      .from('tours')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('[Tour API] Error deleting tour:', deleteError)
      return NextResponse.json({ error: 'Failed to delete tour' }, { status: 500 })
    }

    console.log('[Tour API] Successfully deleted tour:', id)

      return NextResponse.json({ 
        success: true, 
        message: 'Tour deleted successfully' 
      })

    } catch (error) {
      console.error('[Tour API] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }, {
    tourIdFromRequest: () => id
  })(request)
} 