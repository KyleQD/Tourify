import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Current user's applications across artist board and venue staffing (job_posting_templates).
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const [artistRes, venueRes] = await Promise.all([
      supabase
        .from('artist_job_applications')
        .select(
          `
          id,
          status,
          applied_at,
          job_id,
          job:artist_jobs ( id, title, status, city, state, location )
        `
        )
        .eq('applicant_id', user.id)
        .order('applied_at', { ascending: false })
        .limit(80),
      supabase
        .from('job_applications')
        .select(
          `
          id,
          status,
          applied_at,
          reviewed_at,
          feedback,
          job_posting_id,
          venue_id,
          job_posting:job_posting_templates(id, title, department, position, location, employment_type, status)
        `
        )
        .eq('applicant_id', user.id)
        .order('applied_at', { ascending: false })
        .limit(80),
    ])

    if (artistRes.error) {
      console.error('[me/applications] artist', artistRes.error)
      return NextResponse.json({ success: false, error: 'Failed to load artist applications' }, { status: 500 })
    }
    if (venueRes.error) {
      console.error('[me/applications] venue', venueRes.error)
      return NextResponse.json({ success: false, error: 'Failed to load staffing applications' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        artist_applications: artistRes.data ?? [],
        venue_applications: venueRes.data ?? [],
      },
    })
  } catch (e) {
    console.error('[me/applications]', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
