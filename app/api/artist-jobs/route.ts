import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface JsonRecord {
  [key: string]: any
}

function parseCsv(value: string | null): string[] | undefined {
  if (!value) return undefined
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return items.length ? items : undefined
}

function normalizeBoolean(value: string | null): boolean | undefined {
  if (value === null) return undefined
  return value === 'true'
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
    const featuredOnly = searchParams.get('featured_only') === 'true'
    const perPage = Math.max(1, Number(searchParams.get('per_page') || '20'))
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const query = searchParams.get('query')
    const categoryId = searchParams.get('category_id')
    const city = searchParams.get('city')
    const state = searchParams.get('state')
    const country = searchParams.get('country')
    const paymentTypes = parseCsv(searchParams.get('payment_type'))
    const jobTypes = parseCsv(searchParams.get('job_type'))
    const locationTypes = parseCsv(searchParams.get('location_type'))
    const experienceLevels = parseCsv(searchParams.get('required_experience'))
    const requiredGenres = parseCsv(searchParams.get('required_genres'))
    const requiredSkills = parseCsv(searchParams.get('required_skills'))
    const minPayment = searchParams.get('min_payment')
    const maxPayment = searchParams.get('max_payment')
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') === 'asc'

    let queryBuilder = supabase
      .from('artist_jobs')
      .select('*, category:artist_job_categories(*)', { count: 'exact' })
      .eq('status', 'open')

    if (featuredOnly) queryBuilder = queryBuilder.eq('featured', true)
    if (query) queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`)
    if (categoryId) queryBuilder = queryBuilder.eq('category_id', categoryId)
    if (city) queryBuilder = queryBuilder.ilike('city', `%${city}%`)
    if (state) queryBuilder = queryBuilder.ilike('state', `%${state}%`)
    if (country) queryBuilder = queryBuilder.ilike('country', `%${country}%`)
    if (paymentTypes?.length) queryBuilder = queryBuilder.in('payment_type', paymentTypes)
    if (jobTypes?.length) queryBuilder = queryBuilder.in('job_type', jobTypes)
    if (locationTypes?.length) queryBuilder = queryBuilder.in('location_type', locationTypes)
    if (experienceLevels?.length) queryBuilder = queryBuilder.in('required_experience', experienceLevels)
    if (requiredGenres?.length) queryBuilder = queryBuilder.overlaps('required_genres', requiredGenres)
    if (requiredSkills?.length) queryBuilder = queryBuilder.overlaps('required_skills', requiredSkills)
    if (minPayment) queryBuilder = queryBuilder.gte('payment_amount', Number(minPayment))
    if (maxPayment) queryBuilder = queryBuilder.lte('payment_amount', Number(maxPayment))

    const from = (page - 1) * perPage
    const to = from + perPage - 1
    queryBuilder = queryBuilder.order(sortBy, { ascending: sortOrder }).range(from, to)

    const { data: jobs, error, count } = await queryBuilder
    if (error) throw error

    const jobRows = (jobs || []) as JsonRecord[]
    if (user?.id && jobRows.length > 0) {
      const jobIds = jobRows.map((job) => job.id)

      const [{ data: saves }, { data: applications }] = await Promise.all([
        supabase
          .from('artist_job_saves')
          .select('job_id')
          .eq('user_id', user.id)
          .in('job_id', jobIds),
        supabase
          .from('artist_job_applications')
          .select('*')
          .eq('applicant_id', user.id)
          .in('job_id', jobIds),
      ])

      const savedMap = new Set((saves || []).map((save: any) => save.job_id))
      const applicationMap = new Map((applications || []).map((app: any) => [app.job_id, app]))

      jobRows.forEach((job) => {
        job.is_saved = savedMap.has(job.id)
        job.user_application = applicationMap.get(job.id)
      })
    }

    const totalCount = count || 0
    const payload = {
      jobs: jobRows,
      total_count: totalCount,
      page,
      per_page: perPage,
      total_pages: Math.ceil(totalCount / perPage),
      has_next: from + perPage < totalCount,
      has_previous: page > 1,
    }

    return NextResponse.json({
      success: true,
      data: featuredOnly ? { jobs: jobRows } : payload,
    })
  } catch (error) {
    console.error('Error in GET /api/artist-jobs:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user)
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const body = (await request.json()) as JsonRecord
    if (!body.title || !body.description || !body.category_id)
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: title, description, category_id',
        },
        { status: 400 }
      )

    const insertPayload: JsonRecord = {
      title: body.title,
      description: body.description,
      category_id: body.category_id,
      posted_by: user.id,
      posted_by_type: body.posted_by_type || 'artist',
      job_type: body.job_type || 'one_time',
      payment_type: body.payment_type || 'paid',
      payment_amount: body.payment_amount || null,
      payment_currency: body.payment_currency || 'USD',
      payment_description: body.payment_description || null,
      location: body.location || null,
      location_type: body.location_type || null,
      city: body.city || null,
      state: body.state || null,
      country: body.country || null,
      event_date: body.event_date || null,
      event_time: body.event_time || null,
      duration_hours: body.duration_hours || null,
      deadline: body.deadline || null,
      required_skills: body.required_skills || [],
      required_equipment: body.required_equipment || [],
      required_experience: body.required_experience || null,
      required_genres: body.required_genres || [],
      age_requirement: body.age_requirement || null,
      benefits: body.benefits || [],
      special_requirements: body.special_requirements || null,
      contact_email: body.contact_email || user.email || null,
      contact_phone: body.contact_phone || null,
      external_link: body.external_link || null,
      priority: body.priority || 'normal',
      featured: normalizeBoolean(body.featured?.toString()) || false,
      status: body.status || 'open',
    }

    const { data: created, error } = await supabase
      .from('artist_jobs')
      .insert(insertPayload)
      .select('*, category:artist_job_categories(*)')
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: created,
      message: 'Job created successfully',
    })
  } catch (error) {
    console.error('Error in POST /api/artist-jobs:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create job',
      },
      { status: 500 }
    )
  }
}