import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAdminAuth } from '@/lib/auth/api-auth'

const createTourJobSchema = z.object({
  title: z.string().min(1, 'Job title is required'),
  description: z.string().min(1, 'Job description is required'),
  category_id: z.string().min(1, 'Category is required'),
  job_type: z.enum(['one_time', 'recurring', 'tour', 'residency', 'collaboration']),
  payment_type: z.enum(['paid', 'unpaid', 'revenue_share', 'exposure']),
  payment_amount: z.number().optional(),
  payment_currency: z.string().default('USD'),
  payment_description: z.string().optional(),
  location: z.string().optional(),
  location_type: z.enum(['in_person', 'remote', 'hybrid']).default('in_person'),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  event_date: z.string().optional(),
  event_time: z.string().optional(),
  duration_hours: z.number().optional(),
  deadline: z.string().optional(),
  required_skills: z.array(z.string()).optional(),
  required_equipment: z.array(z.string()).optional(),
  required_experience: z.enum(['beginner', 'intermediate', 'professional']).optional(),
  required_genres: z.array(z.string()).optional(),
  age_requirement: z.string().optional(),
  benefits: z.array(z.string()).optional(),
  special_requirements: z.string().optional(),
  contact_email: z.string().email().optional(),
  contact_phone: z.string().optional(),
  external_link: z.string().url().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  featured: z.boolean().default(false),
  status: z.enum(['draft', 'open']).default('open'),
  tour_id: z.string().uuid('Invalid tour ID'),
  tour_name: z.string().optional(),
  tour_start_date: z.string().optional(),
  tour_end_date: z.string().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return withAdminAuth(async (_request, { user, supabase }) => {
    try {
      console.log('[Tour Jobs API] GET request for tour jobs:', id)

    // Verify the user owns this tour
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id')
      .eq('id', id)
      .single()

    if (tourError) {
      console.error('[Tour Jobs API] Error fetching tour for ownership check:', tourError)
      if (tourError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) {
      console.log('[Tour Jobs API] User does not have access to this tour')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch jobs for this tour
    const { data: jobs, error: jobsError } = await supabase
      .from('artist_jobs')
      .select('*')
      .eq('tour_id', id)
      .order('created_at', { ascending: false })

    if (jobsError) {
      console.error('[Tour Jobs API] Error fetching jobs:', jobsError)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    console.log('[Tour Jobs API] Successfully fetched jobs:', jobs?.length || 0)

      return NextResponse.json({ 
        success: true, 
        jobs: jobs || [],
        message: 'Tour jobs fetched successfully' 
      })

    } catch (error) {
      console.error('[Tour Jobs API] Error:', error)
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
      console.log('[Tour Jobs API] POST request for tour job:', id)

    const body = await request.json()
    const validatedData = createTourJobSchema.parse(body)

    // Verify the user owns this tour
    const { data: tour, error: tourError } = await supabase
      .from('tours')
      .select('user_id, name as tour_name')
      .eq('id', id)
      .single()

    if (tourError) {
      console.error('[Tour Jobs API] Error fetching tour for ownership check:', tourError)
      if (tourError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Tour not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 })
    }

    if (tour.user_id !== user.id) {
      console.log('[Tour Jobs API] User does not have access to this tour')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create the job with tour-specific information
    const jobData = {
      ...validatedData,
      user_id: user.id,
      tour_id: id,
      tour_name: tour.tour_name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: job, error: jobError } = await supabase
      .from('artist_jobs')
      .insert(jobData)
      .select()
      .single()

    if (jobError) {
      console.error('[Tour Jobs API] Error creating job:', jobError)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    console.log('[Tour Jobs API] Successfully created job:', job.id)

    // Also post to the main job board for broader visibility
    try {
      const mainJobData = {
        ...validatedData,
        user_id: user.id,
        tour_id: id,
        tour_name: tour.tour_name,
        title: `${validatedData.title} - ${tour.tour_name} Tour`,
        description: `${validatedData.description}\n\nThis position is for the ${tour.tour_name} tour running from ${validatedData.tour_start_date} to ${validatedData.tour_end_date}.`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const mainJobResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/artist-jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mainJobData)
      })

      if (mainJobResponse.ok) {
        console.log('[Tour Jobs API] Successfully posted to main job board')
      } else {
        console.log('[Tour Jobs API] Failed to post to main job board, but tour job was created')
      }
    } catch (error) {
      console.log('[Tour Jobs API] Error posting to main job board:', error)
      // Don't fail the request if posting to main job board fails
    }

      return NextResponse.json({ 
        success: true, 
        job,
        message: 'Tour job posted successfully' 
      })

    } catch (error) {
      console.error('[Tour Jobs API] Error:', error)
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