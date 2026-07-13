import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPostgrestErrorMessage } from '@/lib/supabase/postgrest-error'
import {
  mapArtistJobToUnified,
  mapVenueTemplateToUnified,
  mergeUnifiedJobsByDate,
  type UnifiedJobListItem,
} from '@/lib/rebuild/unified-jobs-list'

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error:
        'Unified POST /api/jobs is not enabled yet. Use POST /api/artist-jobs or venue staffing actions (see docs/tourify-rebuild-phase-0-1-dependency-map.md).',
    },
    { status: 405 }
  )
}

function parseCsv(value: string | null): string[] | undefined {
  if (!value) return undefined
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return items.length ? items : undefined
}

/**
 * Unified jobs facade (Phase 2–3 rebuild): merges artist gig board + venue staff postings.
 * Query params:
 * - venue_id: optional filter for venue templates (still merges artist when merge=1)
 * - merge: "1" — build `unified` list (artist open + published venue templates), sorted by date
 * - query: search title/description (artist + venue)
 * - employment_type, experience_level, remote, urgent: venue filters
 * - category_id, city, state, country, job_type, location_type, etc.: artist-only (passed through)
 * - page, per_page (default 20, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venue_id')
    const mergeUnified = searchParams.get('merge') === '1'
    const perPage = Math.max(1, Math.min(50, Number(searchParams.get('per_page') || '20')))
    const page = Math.max(1, Number(searchParams.get('page') || '1'))

    const queryText = searchParams.get('query') || searchParams.get('search') || null
    const employmentType = searchParams.get('employment_type')
    const experienceLevel = searchParams.get('experience_level')
    const remoteParam = searchParams.get('remote')
    const urgentOnly = searchParams.get('urgent') === 'true'

    const categoryId = searchParams.get('category_id')
    const city = searchParams.get('city')
    const state = searchParams.get('state')
    const country = searchParams.get('country')
    const jobTypes = parseCsv(searchParams.get('job_type'))
    const locationTypes = parseCsv(searchParams.get('location_type'))
    const experienceLevels = parseCsv(searchParams.get('required_experience'))
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrderAsc = searchParams.get('sort_order') === 'asc'

    const from = (page - 1) * perPage
    const to = from + perPage - 1

    // --- Artist jobs (open) ---
    let artistBuilder = supabase
      .from('artist_jobs')
      .select('*, category:artist_job_categories(*)', { count: 'exact' })
      .eq('status', 'open')

    if (queryText)
      artistBuilder = artistBuilder.or(`title.ilike.%${queryText}%,description.ilike.%${queryText}%`)
    if (categoryId) artistBuilder = artistBuilder.eq('category_id', categoryId)
    if (city) artistBuilder = artistBuilder.ilike('city', `%${city}%`)
    if (state) artistBuilder = artistBuilder.ilike('state', `%${state}%`)
    if (country) artistBuilder = artistBuilder.ilike('country', `%${country}%`)
    if (jobTypes?.length) artistBuilder = artistBuilder.in('job_type', jobTypes)
    if (locationTypes?.length) artistBuilder = artistBuilder.in('location_type', locationTypes)
    if (experienceLevels?.length)
      artistBuilder = artistBuilder.in('required_experience', experienceLevels)

    const artistSortCol = ['created_at', 'title', 'payment_amount'].includes(sortBy) ? sortBy : 'created_at'
    artistBuilder = artistBuilder.order(artistSortCol, { ascending: sortOrderAsc })

    let artistJobs: any[] = []
    let artistCount = 0

    if (mergeUnified) {
      const fetchWindow = Math.min(400, page * perPage * 3)
      const { data: aj, error: artistErr, count: ac } = await artistBuilder.range(0, fetchWindow - 1)
      if (artistErr) throw artistErr
      artistJobs = aj || []
      artistCount = ac ?? artistJobs.length
    } else {
      const { data: aj, error: artistErr, count: ac } = await artistBuilder.range(from, to)
      if (artistErr) throw artistErr
      artistJobs = aj || []
      artistCount = ac ?? 0
    }

    // --- Venue job_posting_templates ---
    function buildStaffQuery(select: string) {
      let q = supabase.from('job_posting_templates').select(select, { count: 'exact' }).eq('status', 'published')
      if (venueId) q = q.eq('venue_id', venueId)
      if (queryText) q = q.or(`title.ilike.%${queryText}%,description.ilike.%${queryText}%`)
      if (employmentType) q = q.eq('employment_type', employmentType)
      if (experienceLevel) q = q.eq('experience_level', experienceLevel)
      if (remoteParam === 'true') q = q.eq('remote', true)
      if (remoteParam === 'false') q = q.eq('remote', false)
      if (urgentOnly) q = q.eq('urgent', true)
      return q.order('created_at', { ascending: false })
    }

    let staffPostings: any[] = []
    let staffCount = 0

    async function loadStaffRows(fromIdx: number, toIdx: number) {
      let staffBuilder = buildStaffQuery('*, venue:venues(name)')
      let { data: st, error: staffErr, count: sc } = await staffBuilder.range(fromIdx, toIdx)
      if (staffErr) {
        console.warn('[GET /api/jobs] venue embed failed, retrying without join:', getPostgrestErrorMessage(staffErr))
        staffBuilder = buildStaffQuery('*')
        const retry = await staffBuilder.range(fromIdx, toIdx)
        st = retry.data
        staffErr = retry.error
        sc = retry.count
      }
      if (staffErr) throw staffErr
      return { rows: st || [], count: sc ?? (st || []).length }
    }

    if (mergeUnified) {
      const fetchWindow = Math.min(400, page * perPage * 3)
      const { rows, count } = await loadStaffRows(0, fetchWindow - 1)
      staffPostings = rows
      staffCount = count
    } else {
      const { rows, count } = await loadStaffRows(from, to)
      staffPostings = rows
      staffCount = count
    }

    let unified: UnifiedJobListItem[] | undefined
    let unified_total = 0
    let unified_page = page
    let unified_per_page = perPage

    if (mergeUnified) {
      const aItems = (artistJobs || []).map((r) => mapArtistJobToUnified(r))
      const vItems = (staffPostings || []).map((r) => mapVenueTemplateToUnified(r))
      // Self-heal: never emit rows that can't resolve to a real detail route.
      const merged = mergeUnifiedJobsByDate(aItems, vItems).filter(
        (item) => Boolean(item.id) && Boolean(item.title)
      )
      // Real combined total from DB-level counts (not the capped in-memory window),
      // so client pagination/has_next is accurate.
      unified_total = (artistCount ?? 0) + (staffCount ?? 0)
      unified = merged.slice(from, to + 1)
    }

    return NextResponse.json({
      success: true,
      source: 'facade',
      data: {
        artist_jobs: artistJobs || [],
        artist_jobs_total: artistCount,
        staff_postings: staffPostings,
        staff_postings_total: staffCount,
        page,
        per_page: perPage,
        venue_id: venueId,
        viewer_id: user?.id ?? null,
        ...(mergeUnified && unified
          ? {
              unified,
              unified_total,
              unified_page,
              unified_per_page,
            }
          : {}),
      },
    })
  } catch (error) {
    console.error('[GET /api/jobs]', error)
    return NextResponse.json(
      { success: false, error: getPostgrestErrorMessage(error) || 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}
