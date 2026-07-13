import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'
import { AdminTourEventOperationsService } from '@/lib/admin/tour-event-operations.service'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// Validation schemas for each step
const tourInitiationSchema = z.object({
  name: z.string().min(1, 'Tour name is required'),
  description: z.string().optional(),
  mainArtist: z.string().min(1, 'Main artist is required'),
  genre: z.string().optional(),
  coverImage: z.string().optional()
})

const routingDatesSchema = z.object({
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid start date'),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid end date'),
  route: z.array(z.object({
    city: z.string().min(1, 'City is required'),
    venue: z.string().min(1, 'Venue is required'),
    date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional()
  })).min(1, 'At least one route stop is required')
})

const eventsSchema = z.object({
  events: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Event name is required'),
    venue: z.string().min(1, 'Venue is required'),
    date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Invalid date'),
    time: z.string().optional(),
    description: z.string().optional(),
    capacity: z.number().int().min(0, 'Capacity must be non-negative').optional()
  })).min(1, 'At least one event is required')
})

const artistsCrewSchema = z.object({
  artists: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Artist name is required'),
    role: z.string().min(1, 'Role is required'),
    events: z.array(z.string()).default([])
  })).default([]),
  crew: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Crew member name is required'),
    role: z.string().min(1, 'Role is required'),
    events: z.array(z.string()).default([])
  })).default([])
})

const logisticsSchema = z.object({
  transportation: z.object({
    type: z.string().min(1, 'Transportation type is required'),
    details: z.string().optional(),
    cost: z.number().min(0, 'Cost must be non-negative').optional()
  }),
  accommodation: z.object({
    type: z.string().min(1, 'Accommodation type is required'),
    details: z.string().optional(),
    cost: z.number().min(0, 'Cost must be non-negative').optional()
  }),
  equipment: z.array(z.object({
    name: z.string().min(1, 'Equipment name is required'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    cost: z.number().min(0, 'Cost must be non-negative').optional()
  })).default([])
})

const ticketingFinancialsSchema = z.object({
  ticketTypes: z.array(z.object({
    name: z.string().min(1, 'Ticket type name is required'),
    price: z.number().min(0, 'Price must be non-negative'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    description: z.string().optional()
  })).default([]),
  budget: z.object({
    total: z.number().min(0, 'Total budget must be non-negative'),
    expenses: z.array(z.object({
      category: z.string().min(1, 'Expense category is required'),
      amount: z.number().min(0, 'Amount must be non-negative'),
      description: z.string().optional()
    })).default([])
  }),
  sponsors: z.array(z.object({
    name: z.string().min(1, 'Sponsor name is required'),
    contribution: z.number().min(0, 'Contribution must be non-negative'),
    type: z.string().optional()
  })).default([])
})

const completeTourDataSchema = z.object({
  step1: tourInitiationSchema,
  step2: routingDatesSchema,
  step3: eventsSchema,
  step4: artistsCrewSchema,
  step5: logisticsSchema,
  step6: ticketingFinancialsSchema
})

export const POST = withAdminAuth(async (request: NextRequest, { user }) => {
  try {
    const supabase = createServiceRoleClient()
    const body = await request.json()
    const validatedData = completeTourDataSchema.parse(body)

    // Validate date ranges
    const startDate = new Date(validatedData.step2.startDate)
    const endDate = new Date(validatedData.step2.endDate)
    
    if (endDate < startDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
    }

    // Validate that event dates fall within tour date range (with more flexible validation)
    const invalidEvents = []
    for (const event of validatedData.step3.events) {
      try {
        const eventDate = new Date(event.date)
        if (isNaN(eventDate.getTime())) {
          invalidEvents.push(`Event "${event.name}" has an invalid date format`)
        } else if (eventDate < startDate || eventDate > endDate) {
          invalidEvents.push(`Event "${event.name}" date (${event.date}) must fall within tour date range (${validatedData.step2.startDate} to ${validatedData.step2.endDate})`)
        }
      } catch (error) {
        invalidEvents.push(`Event "${event.name}" has an invalid date: ${event.date}`)
      }
    }

    if (invalidEvents.length > 0) {
      console.warn('[Tour Planner API] Date validation warnings:', invalidEvents)
      // Instead of failing, we'll log warnings and continue
      // This allows tours to be created even with date mismatches
    }

    const existingTourId = typeof body?.tourId === 'string' ? body.tourId : null
    let tour
    if (existingTourId) {
      tour = await AdminTourEventOperationsService.updateTour({
        supabase,
        userId: user.id,
        tourId: existingTourId,
        input: {
          name: validatedData.step1.name,
          description: validatedData.step1.description,
          main_artist: validatedData.step1.mainArtist,
          genre: validatedData.step1.genre,
          cover_image: validatedData.step1.coverImage,
          start_date: validatedData.step2.startDate,
          end_date: validatedData.step2.endDate,
          budget: validatedData.step6.budget.total,
          status: 'active',
          settings: {
            route: validatedData.step2.route,
            artists: validatedData.step4.artists,
            crew: validatedData.step4.crew,
            transportation: validatedData.step5.transportation,
            accommodation: validatedData.step5.accommodation,
            equipment: validatedData.step5.equipment,
            ticketTypes: validatedData.step6.ticketTypes,
            sponsors: validatedData.step6.sponsors,
            builder_mode: 'published',
          },
        },
      })
    } else {
      tour = await AdminTourEventOperationsService.createTourFromPlanner({
        supabase,
        userId: user.id,
        input: validatedData,
      })
      tour = await AdminTourEventOperationsService.publishTour({
        supabase,
        userId: user.id,
        tourId: String((tour as any).id),
      })
    }

    return NextResponse.json({
      tour: {
        ...tour,
        summary: {
          total_events: Array.isArray((tour as any).events) ? (tour as any).events.length : 0,
          total_team_members: validatedData.step4.artists.length + validatedData.step4.crew.length,
          total_expenses: validatedData.step6.budget.expenses.length + validatedData.step5.equipment.length,
          budget_utilization: (tour as any).budget && (tour as any).expenses
            ? (Number((tour as any).expenses) / Number((tour as any).budget)) * 100
            : 0,
        },
      },
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 })
    }

    console.error('[Tour Planner API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const GET = withAdminAuth(async (request: NextRequest, { user }) => {
  try {
    const supabase = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const tourId = searchParams.get('tour_id')

    if (!tourId) {
      return NextResponse.json({ error: 'Tour ID is required' }, { status: 400 })
    }

    // Fetch tour
    const { data: tour, error } = await supabase
      .from('tours')
      .select(`
        *,
        tour_team_members(
          id, role, contact_email, contact_phone, status, created_at
        ),
        event_expenses(
          id, category, description, amount, vendor, status, created_at
        )
      `)
      .eq('id', tourId)
      .or(`user_id.eq.${user.id},created_by.eq.${user.id}`)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      console.error('[Tour Planner API] Error fetching tour:', error)
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    const { data: tourEventLinks } = await supabase
      .from('tour_events')
      .select(`
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
      .eq('tour_id', tourId)
      .order('ordinal', { ascending: true })

    const linkedEvents = (tourEventLinks || [])
      .map((link: any) => {
        const event = link.events_v2
        if (!event) return null
        const settings = event.settings && typeof event.settings === 'object'
          ? (event.settings as Record<string, unknown>)
          : {}
        return {
          id: event.id,
          name: event.title,
          description: typeof settings.description === 'string' ? settings.description : '',
          venue_name: typeof settings.venue_label === 'string' ? settings.venue_label : '',
          event_date: event.start_at ? String(event.start_at).slice(0, 10) : '',
          event_time: typeof settings.planned_time === 'string'
            ? settings.planned_time
            : (event.start_at ? String(event.start_at).slice(11, 16) : ''),
          capacity: event.capacity || 0,
          status: event.status || 'scheduled',
          created_at: null,
          event_table: 'events_v2'
        }
      })
      .filter(Boolean)

    const { data: legacyEvents } = await supabase
      .from('events')
      .select('id, name, description, venue_name, event_date, event_time, capacity, status, created_at')
      .eq('tour_id', tourId)
      .order('event_date', { ascending: true })

    const eventsForPlanner = linkedEvents.length > 0
      ? linkedEvents
      : (legacyEvents || [])

    // Transform data for the planner
    const plannerData = {
      step1: {
        name: tour.name,
        description: tour.description,
        mainArtist: tour.artist_id || tour.user_id,
        genre: '', // Not stored in current schema
        coverImage: '' // Not stored in current schema
      },
      step2: {
        startDate: tour.start_date,
        endDate: tour.end_date,
        route: eventsForPlanner?.map((event: any) => ({
          city: event.venue_name?.split(',')[0] || '',
          venue: event.venue_name || '',
          date: event.event_date,
          coordinates: { lat: 0, lng: 0 } // Not stored in current schema
        })) || []
      },
      step3: {
        events: eventsForPlanner?.map((event: any) => ({
          id: event.id,
          name: event.name,
          venue: event.venue_name || '',
          date: event.event_date,
          time: event.event_time,
          description: event.description,
          capacity: event.capacity
        })) || []
      },
      step4: {
        artists: tour.tour_team_members?.filter((member: any) => 
          member.role.toLowerCase().includes('artist')
        ).map((member: any) => ({
          id: member.id,
          name: member.contact_email?.split('@')[0] || member.role,
          role: member.role.replace('Artist - ', ''),
          events: []
        })) || [],
        crew: tour.tour_team_members?.filter((member: any) => 
          !member.role.toLowerCase().includes('artist')
        ).map((member: any) => ({
          id: member.id,
          name: member.contact_email?.split('@')[0] || member.role,
          role: member.role,
          events: []
        })) || []
      },
      step5: {
        transportation: {
          type: tour.transportation?.split(':')[0] || '',
          details: tour.transportation?.split(':')[1]?.trim() || '',
          cost: 0 // Not stored separately in current schema
        },
        accommodation: {
          type: tour.accommodation?.split(':')[0] || '',
          details: tour.accommodation?.split(':')[1]?.trim() || '',
          cost: 0 // Not stored separately in current schema
        },
        equipment: tour.equipment_requirements?.split(',').map((eq: string) => ({
          name: eq.trim(),
          quantity: 1,
          cost: 0
        })) || []
      },
      step6: {
        ticketTypes: [], // Not stored in current schema
        budget: {
          total: tour.budget,
          expenses: tour.event_expenses?.map((expense: any) => ({
            category: expense.category,
            amount: expense.amount,
            description: expense.description
          })) || []
        },
        sponsors: [] // Not stored in current schema
      }
    }

    return NextResponse.json({ tour: plannerData })

  } catch (error) {
    console.error('[Tour Planner API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, {
  tourIdFromRequest: (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    return searchParams.get('tour_id') || undefined
  }
})
