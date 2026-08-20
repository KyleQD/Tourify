import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canApplicantWithdraw } from '@/lib/general/application-actions'
import { getWorkerApplications } from '@/lib/work-hub/read-model'
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

    const applications = await getWorkerApplications({ supabase, userId: user.id })
    if (applications.sources.artist === 'unavailable' && applications.sources.staffing === 'unavailable') {
      return NextResponse.json(
        { success: false, error: 'Applications are temporarily unavailable' },
        { status: 503 },
      )
    }

    return NextResponse.json({
      success: true,
      data: applications,
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
