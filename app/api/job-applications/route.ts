import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { recordAchievementMetricEvent } from '@/lib/services/achievement-metric-events.service'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { buildProfileSnapshot } from '@/lib/services/applicant-profile-snapshot.service'

/** List current user's staffing job applications (public board / job_posting_templates flow). */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)

    const { data, error } = await supabase
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
        job_posting:job_posting_templates(id, title, department, position, location, employment_type)
      `
      )
      .eq('applicant_id', user.id)
      .order('applied_at', { ascending: false })
      .limit(limit)


    if (error) {
      console.error('[job-applications GET]', error)
      return NextResponse.json({ success: false, error: 'Failed to load applications' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (e) {
    console.error('[job-applications GET]', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { job_posting_id, form_responses = {} } = body

    if (!job_posting_id) {
      return NextResponse.json(
        { success: false, error: 'Job posting ID is required' },
        { status: 400 }
      )
    }

    // Get job posting employer scope and applicant info. Fetch without the status
    // filter first so we can distinguish "missing" from "not accepting applications".
    const { data: jobPosting, error: jobError } = await supabase
      .from('job_posting_templates')
      .select('status, venue_id, employer_entity_type, employer_entity_id, title, department, position, applications_count, created_by, allow_applicant_messages')
      .eq('id', job_posting_id)
      .maybeSingle()

    if (jobError) {
      console.error('[job-applications POST] lookup failed:', jobError)
      return NextResponse.json(
        { success: false, error: 'Failed to load job posting' },
        { status: 500 }
      )
    }

    if (!jobPosting) {
      return NextResponse.json(
        { success: false, error: 'This job posting no longer exists.' },
        { status: 404 }
      )
    }

    if (jobPosting.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'This job posting is not accepting applications.' },
        { status: 409 }
      )
    }

    const employerEntityType =
      jobPosting.employer_entity_type ??
      (jobPosting.venue_id ? 'venue' : null)
    const employerEntityId =
      jobPosting.employer_entity_id ??
      jobPosting.venue_id ??
      null

    if (!employerEntityType || !employerEntityId) {
      return NextResponse.json(
        { success: false, error: 'Job posting is missing employer scope' },
        { status: 422 }
      )
    }

    // Quick Apply: capture an immutable snapshot of the applicant's general
    // profile so the hiring party can review them like a resume. Applying with
    // consent shares contact details even when the profile hides them publicly.
    const profileSnapshot = await buildProfileSnapshot({
      supabase,
      userId: user.id,
      authEmail: user.email,
      shareContact: true,
    })

    // Extract applicant info from form responses, falling back to the profile
    // snapshot so Quick Apply (which does not re-ask contact fields) still
    // records who applied.
    const applicantName =
      form_responses.full_name || form_responses.name || profileSnapshot?.basics.fullName || 'Unknown'
    const applicantEmail =
      form_responses.email || profileSnapshot?.contact.email || user.email || ''
    const applicantPhone = form_responses.phone || profileSnapshot?.contact.phone || ''

    // Simple rate limiting and duplicate protection
    // 1) Prevent duplicate application for the same job by the same user within 24h
    const { data: existing, error: existingErr } = await supabase
      .from('job_applications')
      .select('id, applied_at')
      .eq('job_posting_id', job_posting_id)
      .eq('applicant_id', user.id)
      .order('applied_at', { ascending: false })
      .limit(1)

    if (!existingErr && existing && existing.length > 0) {
      const lastAppliedAt = new Date(existing[0].applied_at)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      if (lastAppliedAt > oneDayAgo) {
        return NextResponse.json(
          { success: false, error: 'You have already applied for this role recently. Please try again later.' },
          { status: 429 }
        )
      }
    }

    // 2) Global per-user throttle: max 10 applications within the last hour
    const { data: recentApps } = await supabase
      .from('job_applications')
      .select('id, applied_at')
      .eq('applicant_id', user.id)
      .gte('applied_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    if ((recentApps?.length || 0) >= 10) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait before applying to more jobs.' },
        { status: 429 }
      )
    }

    // Organization/artist employers may not have a venue_id; venue-scoped rows
    // still populate venue_id for legacy queries.
    const resolvedVenueId =
      jobPosting.venue_id ??
      (employerEntityType === 'venue' ? employerEntityId : null)

    const { data: application, error: applicationError } = await supabase
      .from('job_applications')
      .insert({
        venue_id: resolvedVenueId,
        employer_entity_type: employerEntityType,
        employer_entity_id: employerEntityId,
        job_posting_id,
        applicant_id: user.id,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        applicant_phone: applicantPhone,
        status: 'pending',
        form_responses,
        profile_snapshot: profileSnapshot,
        profile_snapshot_version: profileSnapshot?.version ?? null,
        profile_shared_at: profileSnapshot ? new Date().toISOString() : null,
        applied_at: new Date().toISOString()
      })
      .select()
      .single()

    if (applicationError) {
      console.error('Error creating application:', applicationError)
      return NextResponse.json(
        { success: false, error: 'Failed to submit application' },
        { status: 500 }
      )
    }

    // Increment application count on job posting using RPC-safe approach
    await supabase.rpc('increment_applications_count', { p_job_id: job_posting_id })

    if (jobPosting.allow_applicant_messages && jobPosting.created_by && jobPosting.created_by !== user.id) {
      const serviceRoleSupabase = createServiceRoleClient()

      const { data: existingConversation } = await serviceRoleSupabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${jobPosting.created_by}),and(participant_1.eq.${jobPosting.created_by},participant_2.eq.${user.id})`)
        .maybeSingle()

      if (!existingConversation) {
        await serviceRoleSupabase
          .from('conversations')
          .insert({
            participant_1: user.id,
            participant_2: jobPosting.created_by,
            trust_tier: 'context',
            context_type: 'job_application',
            context_id: application.id,
            accepted_at: new Date().toISOString(),
            accepted_by: user.id,
          })
      }

      await serviceRoleSupabase
        .from('notifications')
        .insert({
          user_id: jobPosting.created_by,
          related_user_id: user.id,
          type: 'job_application',
          title: `New application for ${jobPosting.title}`,
          content: `${applicantName} applied and can be messaged directly.`,
          metadata: {
            job_posting_id,
            application_id: application.id,
          },
        })
    }

    await recordAchievementMetricEvent({
      supabase,
      userId: user.id,
      metricKey: 'jobs_applied_total',
      eventType: 'job_application_submitted',
      delta: 1,
      eventData: {
        job_posting_id,
        venue_id: jobPosting.venue_id,
        employer_entity_type: employerEntityType,
        employer_entity_id: employerEntityId,
      },
      relatedProjectId: job_posting_id,
    })

    return NextResponse.json({
      success: true,
      data: application
    })
  } catch (error) {
    console.error('Error in job application API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
