import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminCapability } from '@/lib/auth/api-auth'
import {
  adminAccessErrorResponse,
  assertAdminTourAccess,
} from '@/lib/admin/admin-tour-event-access'

/**
 * SEC-201 — Legacy tour detail delegates to canonical org/collaborator access.
 * Prefer /api/admin/tours/[id] for new clients.
 */

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
  special_requirements: z.string().optional(),
})

function routeError(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Validation error', details: error.errors },
      { status: 400 },
    )
  }
  const resolved = adminAccessErrorResponse(error, fallback, 500)
  return NextResponse.json({ error: resolved.message }, { status: resolved.status })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return withAdminCapability('tour.view', async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const { data: tour, error: tourError } = await supabase
        .from('tours')
        .select('*')
        .eq('id', id)
        .single()

      if (tourError) {
        console.error('[Tour API] Error fetching tour:', tourError)
        if (tourError.code === 'PGRST116')
          return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
        return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
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

      const totalShows = events.length
      const completedShows = events.filter(
        (event: any) => event.status === 'settled' || event.status === 'completed',
      ).length
      const actualRevenue = events.reduce(
        (sum: number, event: any) => sum + (event.actual_revenue || 0),
        0,
      )
      const totalExpenses = events.reduce(
        (sum: number, event: any) => sum + (event.expenses || 0),
        0,
      )

      return NextResponse.json({
        ...tour,
        events,
        total_shows: totalShows,
        completed_shows: completedShows,
        actual_revenue: actualRevenue,
        expenses: totalExpenses,
      })
    } catch (error) {
      console.error('[Tour API] Error:', error)
      return routeError(error, 'Internal server error')
    }
  })(request)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return withAdminCapability('tour.manage', async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const body = await request.json()
      const validatedData = updateTourSchema.parse(body)

      const { data: updatedTour, error: updateError } = await supabase
        .from('tours')
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('[Tour API] Error updating tour:', updateError)
        return NextResponse.json({ error: 'Failed to update tour' }, { status: 500 })
      }

      return NextResponse.json(updatedTour)
    } catch (error) {
      console.error('[Tour API] Error:', error)
      return routeError(error, 'Internal server error')
    }
  })(request)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  return withAdminCapability('tour.delete', async (_request, { user, supabase, admin }) => {
    try {
      await assertAdminTourAccess({
        supabase,
        userId: user.id,
        tourId: id,
        orgId: admin.orgId,
      })

      const { error: linksDeleteError } = await supabase
        .from('tour_events')
        .delete()
        .eq('tour_id', id)

      if (linksDeleteError) {
        console.error('[Tour API] Error deleting associated event links:', linksDeleteError)
        return NextResponse.json({ error: 'Failed to delete associated event links' }, { status: 500 })
      }

      await supabase
        .from('events')
        .delete()
        .eq('tour_id', id)

      const { error: deleteError } = await supabase
        .from('tours')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('[Tour API] Error deleting tour:', deleteError)
        return NextResponse.json({ error: 'Failed to delete tour' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Tour deleted successfully',
      })
    } catch (error) {
      console.error('[Tour API] Error:', error)
      return routeError(error, 'Internal server error')
    }
  })(request)
}
