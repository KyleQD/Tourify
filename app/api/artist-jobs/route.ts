import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPostgrestErrorCode, getPostgrestErrorMessage } from '@/lib/supabase/postgrest-error'
import { resolveArtistJobCategoryId } from '@/lib/artist-jobs/categories'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

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

function sanitizePublicJob(row: JsonRecord): JsonRecord {
  const {
    contact_email: _contactEmail,
    contact_phone: _contactPhone,
    ...safe
  } = row

  return {
    ...safe,
    required_skills: Array.isArray(safe.required_skills) ? safe.required_skills : [],
    required_equipment: Array.isArray(safe.required_equipment) ? safe.required_equipment : [],
    required_genres: Array.isArray(safe.required_genres) ? safe.required_genres : [],
    instruments_needed: Array.isArray(safe.instruments_needed) ? safe.instruments_needed : [],
    benefits: Array.isArray(safe.benefits) ? safe.benefits : [],
    attachments: safe.attachments && typeof safe.attachments === 'object' ? safe.attachments : {},
    collaboration_details:
      safe.collaboration_details && typeof safe.collaboration_details === 'object'
        ? safe.collaboration_details
        : {},
    applications_count: Number(safe.applications_count ?? 0),
    views_count: Number(safe.views_count ?? 0),
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
    const featuredOnly = searchParams.get('featured_only') === 'true'
    const postedByMe = searchParams.get('posted_by') === 'me'
    const includeAllStatuses = searchParams.get('include_all_statuses') === 'true'
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
    const shouldUseUserScopedRead = postedByMe || includeAllStatuses
    let readClient = supabase
    if (!shouldUseUserScopedRead) {
      try {
        readClient = createServiceRoleClient()
      } catch (error) {
        console.warn('[GET /api/artist-jobs] Service read client unavailable; using request-scoped client.', error)
      }
    }

    if (postedByMe && !user?.id) {
      return NextResponse.json({
        success: true,
        data: {
          jobs: [],
          total_count: 0,
          page,
          per_page: perPage,
          total_pages: 0,
          has_next: false,
          has_previous: false,
        },
      })
    }

    let queryBuilder = readClient
      .from('artist_jobs')
      .select('*, category:artist_job_categories(*)', { count: 'exact' })

    if (postedByMe && user?.id) {
      queryBuilder = queryBuilder.eq('posted_by', user.id)
    } else if (!includeAllStatuses) {
      queryBuilder = queryBuilder.eq('status', 'open')
    }

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

    const jobRows = shouldUseUserScopedRead
      ? ((jobs || []) as JsonRecord[])
      : ((jobs || []) as JsonRecord[]).map(sanitizePublicJob)
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
    return NextResponse.json(
      { success: false, error: getPostgrestErrorMessage(error) || 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { resolveActingContext } = await import('@/lib/auth/acting-context')
    const { getPostedByType } = await import('@/lib/accounts/account-types')

    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx
    const { userId, accountType, profileId, supabase } = ctx

    const body = (await request.json()) as JsonRecord
    if (!body.title || !body.description || !body.category_id)
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: title, description, category_id',
        },
        { status: 400 }
      )

    const categoryId = await resolveArtistJobCategoryId(supabase, String(body.category_id))
    if (!categoryId)
      return NextResponse.json({ success: false, error: 'Invalid category_id format' }, { status: 400 })

    // Derive the posted_by_type from the verified acting context
    const resolvedPostedByType = getPostedByType(accountType)

    const insertPayload: JsonRecord = {
      title: body.title,
      description: body.description,
      category_id: categoryId,
      posted_by: userId,
      posted_by_type: resolvedPostedByType,
      posted_by_profile_id: profileId,
      poster_profile_id: profileId,
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
      contact_email: body.contact_email || null,
      contact_phone: body.contact_phone || null,
      external_link: body.external_link || null,
      priority: body.priority || 'normal',
      featured: normalizeBoolean(body.featured?.toString()) || false,
      status: body.status || 'open',
    }

    const serviceSupabase = createServiceRoleClient()
    const { data: created, error } = await serviceSupabase
      .from('artist_jobs')
      .insert(insertPayload)
      .select('*, category:artist_job_categories(*)')
      .single()

    if (error) throw error

    const { recordActingSnapshot } = await import('@/lib/auth/acting-context')
    await recordActingSnapshot(ctx, {
      action: 'job.create',
      resourceType: 'artist_job',
      resourceId: created?.id,
    })

    return NextResponse.json({
      success: true,
      data: created,
      message: 'Job created successfully',
    })
  } catch (error) {
    console.error('Error in POST /api/artist-jobs:', error)
    const message = getPostgrestErrorMessage(error) || 'Failed to create job'
    const code = getPostgrestErrorCode(error)
    const clientErrorCodes = new Set(['23503', '23514', '22P02', '23502'])
    const status =
      code === '42501'
        ? 403
        : code && clientErrorCodes.has(code)
          ? 400
          : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
