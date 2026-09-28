import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canApplicantWithdraw } from '@/lib/general/application-actions'
import { z } from 'zod'

const applicantActionSchema = z.object({
  source: z.enum(['artist', 'staffing']),
  application_id: z.string().uuid(),
  action: z.literal('withdraw'),
})

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

    if (artistRes.error) console.error('[me/applications] artist', artistRes.error)
    if (venueRes.error) console.error('[me/applications] venue', venueRes.error)
    if (artistRes.error && venueRes.error) {
      return NextResponse.json(
        { success: false, error: 'Applications are temporarily unavailable' },
        { status: 503 },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        artist_applications: artistRes.error ? [] : artistRes.data ?? [],
        venue_applications: venueRes.error ? [] : venueRes.data ?? [],
        sources: {
          artist: artistRes.error ? 'unavailable' : 'ready',
          staffing: venueRes.error ? 'unavailable' : 'ready',
        },
        partial: Boolean(artistRes.error || venueRes.error),
        generated_at: new Date().toISOString(),
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (e) {
    console.error('[me/applications]', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const parsed = applicantActionSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid application action', details: parsed.error.issues },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      )
    }

    const { source, application_id: applicationId } = parsed.data
    const existingResult =
      source === 'artist'
        ? await supabase
            .from('artist_job_applications')
            .select('id,status')
            .eq('id', applicationId)
            .eq('applicant_id', user.id)
            .maybeSingle()
        : await supabase
            .from('job_applications')
            .select('id,status')
            .eq('id', applicationId)
            .eq('applicant_id', user.id)
            .maybeSingle()

    if (existingResult.error) {
      return NextResponse.json(
        { success: false, error: 'Application is temporarily unavailable' },
        { status: 503 },
      )
    }
    if (!existingResult.data) {
      return NextResponse.json(
        { success: false, error: 'Application not found or access denied' },
        { status: 404 },
      )
    }
    if (existingResult.data.status === 'withdrawn') {
      return NextResponse.json({
        success: true,
        data: { id: applicationId, status: 'withdrawn', unchanged: true },
      })
    }
    if (!canApplicantWithdraw(existingResult.data.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `This application can no longer be withdrawn from ${existingResult.data.status || 'its current state'}`,
        },
        { status: 409 },
      )
    }
    const currentStatus = existingResult.data.status as string

    const updateResult =
      source === 'artist'
        ? await supabase
            .from('artist_job_applications')
            .update({ status: 'withdrawn' })
            .eq('id', applicationId)
            .eq('applicant_id', user.id)
            .eq('status', currentStatus)
            .select('id,status')
            .maybeSingle()
        : await supabase
            .from('job_applications')
            .update({ status: 'withdrawn' })
            .eq('id', applicationId)
            .eq('applicant_id', user.id)
            .eq('status', currentStatus)
            .select('id,status')
            .maybeSingle()

    if (updateResult.error) {
      return NextResponse.json(
        { success: false, error: 'Application could not be withdrawn' },
        { status: 500 },
      )
    }
    if (!updateResult.data) {
      return NextResponse.json(
        { success: false, error: 'Application changed. Refresh and try again.' },
        { status: 409 },
      )
    }

    return NextResponse.json({
      success: true,
      data: { ...updateResult.data, unchanged: false },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid application action' },
      { status: 400 },
    )
  }
}
