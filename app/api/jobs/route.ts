import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPostgrestErrorMessage } from '@/lib/supabase/postgrest-error'

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

/**
 * Unified jobs facade (Phase 2 rebuild): merges artist gig board + optional venue staff postings.
 * Does not replace underlying tables — see docs/tourify-rebuild-phase-0-1-dependency-map.md
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
    const venueId = searchParams.get('venue_id')
    const perPage = Math.max(1, Math.min(50, Number(searchParams.get('per_page') || '20')))
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const artistQuery = supabase
      .from('artist_jobs')
      .select('*, category:artist_job_categories(*)', { count: 'exact' })
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .range(from, to)

    const { data: artistJobs, error: artistErr, count: artistCount } = await artistQuery
    if (artistErr) throw artistErr

    let staffPostings: unknown[] = []
    let staffCount = 0
    if (venueId) {
      const q = supabase
        .from('job_posting_templates')
        .select('*', { count: 'exact' })
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false })
        .range(0, perPage - 1)

      const { data: staff, error: staffErr, count: sc } = await q
      if (staffErr) throw staffErr
      staffPostings = staff || []
      staffCount = sc || 0
    }

    return NextResponse.json({
      success: true,
      source: 'facade',
      data: {
        artist_jobs: artistJobs || [],
        artist_jobs_total: artistCount ?? 0,
        staff_postings: staffPostings,
        staff_postings_total: staffCount,
        page,
        per_page: perPage,
        venue_id: venueId,
        viewer_id: user?.id ?? null,
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
