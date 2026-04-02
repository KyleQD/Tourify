import { NextResponse } from 'next/server'
import { ArtistJobsService } from '@/lib/services/artist-jobs.service'
import { createClient } from '@/lib/supabase/server'
import { CreateApplicationFormData } from '@/types/artist-jobs'
import { achievementEngine } from '@/lib/services/achievement-engine.service'
import { isJobApplicationStatus } from '@/lib/hiring/states'

const allowedJobTransitions: Record<string, string[]> = {
  pending: ['reviewed', 'shortlisted', 'accepted', 'rejected', 'withdrawn'],
  reviewed: ['shortlisted', 'accepted', 'rejected', 'withdrawn'],
  shortlisted: ['accepted', 'rejected', 'withdrawn'],
  accepted: ['withdrawn'],
  rejected: [],
  withdrawn: [],
}

const allowedCollaborationTransitions: Record<string, string[]> = {
  pending: ['reviewed', 'accepted', 'rejected', 'withdrawn'],
  reviewed: ['accepted', 'rejected', 'withdrawn'],
  accepted: ['withdrawn'],
  rejected: [],
  withdrawn: [],
}

function canTransition(
  currentStatus: string,
  nextStatus: string,
  applicationType: 'job' | 'collaboration'
) {
  if (currentStatus === nextStatus) return true
  if (applicationType === 'collaboration')
    return (allowedCollaborationTransitions[currentStatus] || []).includes(nextStatus)
  return (allowedJobTransitions[currentStatus] || []).includes(nextStatus)
}

async function writeArtistHiringAuditEvent(input: {
  supabase: any
  actorUserId: string
  applicationId: string
  jobId: string
  applicationType: 'job' | 'collaboration'
  fromStatus: string
  toStatus: string
}) {
  const { supabase, actorUserId, applicationId, jobId, applicationType, fromStatus, toStatus } = input
  const title = `Application status changed: ${fromStatus} -> ${toStatus}`
  const content = `${applicationType} application ${applicationId} for job ${jobId} moved from ${fromStatus} to ${toStatus}.`
  const metadata = {
    actor_user_id: actorUserId,
    application_id: applicationId,
    job_id: jobId,
    application_type: applicationType,
    from_status: fromStatus,
    to_status: toStatus,
    timestamp: new Date().toISOString(),
  }

  try {
    await supabase.from('hiring_audit_events').insert({
      application_id: applicationId,
      job_id: jobId,
      actor_user_id: actorUserId,
      action: `${applicationType}_status_transition`,
      from_status: fromStatus,
      to_status: toStatus,
      title,
      content,
      metadata,
    })
  } catch (error) {
    console.warn('⚠️ [Artist Jobs API] Failed to write hiring_audit_events row:', error)
  }

  try {
    await supabase.from('notifications').insert({
      user_id: actorUserId,
      type: 'artist_application_status_transition',
      title,
      content,
      metadata,
    })
  } catch (error) {
    console.warn('⚠️ [Artist Jobs API] Failed to write status audit event:', error)
  }
}

export async function GET(
  request: Request,
  { params }: any
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required'
        },
        { status: 401 }
      )
    }

    const applications = await ArtistJobsService.getJobApplications(params.id, user.id)

    return NextResponse.json({
      success: true,
      data: applications
    })
  } catch (error) {
    console.error('Error in GET /api/artist-jobs/[id]/applications:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch applications'
      },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: any
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required'
        },
        { status: 401 }
      )
    }

    const applicationData: CreateApplicationFormData = await request.json()
    
    // Ensure job_id matches the route parameter
    applicationData.job_id = params.id

    // Validate required fields
    if (!applicationData.contact_email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Contact email is required'
        },
        { status: 400 }
      )
    }

    const application = await ArtistJobsService.applyToJob(applicationData, user.id)

    await writeArtistHiringAuditEvent({
      supabase,
      actorUserId: user.id,
      applicationId: application.id,
      jobId: params.id,
      applicationType: 'job',
      fromStatus: 'created',
      toStatus: application.status,
    })

    return NextResponse.json({
      success: true,
      data: application,
      message: 'Application submitted successfully'
    })
  } catch (error) {
    console.error('Error in POST /api/artist-jobs/[id]/applications:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit application'
      },
      { status: 500 }
    )
  }
} 

export async function PATCH(
  request: Request,
  { params }: any
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required'
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      applicationId,
      status,
      feedback,
      responseMessage,
      applicationType = 'job'
    } = body as {
      applicationId: string
      status: string
      feedback?: string
      responseMessage?: string
      applicationType?: 'job' | 'collaboration'
    }

    if (!applicationId || !status) {
      return NextResponse.json(
        { success: false, error: 'applicationId and status are required' },
        { status: 400 }
      )
    }

    const isCollaborationFlow = applicationType === 'collaboration'
    const isValidStatus = isCollaborationFlow
      ? ['pending', 'reviewed', 'accepted', 'rejected', 'withdrawn'].includes(status)
      : isJobApplicationStatus(status) || status === 'accepted'

    if (!isValidStatus) {
      return NextResponse.json(
        { success: false, error: 'Invalid application status' },
        { status: 400 }
      )
    }

    // Verify job ownership before status mutation
    const { data: jobOwnerRow, error: ownerError } = await supabase
      .from('artist_jobs')
      .select('id, posted_by, job_type')
      .eq('id', params.id)
      .single()

    if (ownerError || !jobOwnerRow) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    if (jobOwnerRow.posted_by !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: You can only review applications for your own jobs' },
        { status: 403 }
      )
    }

    if (applicationType === 'collaboration' || jobOwnerRow.job_type === 'collaboration') {
      const { data: currentApplication } = await supabase
        .from('collaboration_applications')
        .select('id, status')
        .eq('id', applicationId)
        .single()

      if (!currentApplication) {
        return NextResponse.json(
          { success: false, error: 'Application not found' },
          { status: 404 }
        )
      }

      if (!canTransition(currentApplication.status, status, 'collaboration')) {
        return NextResponse.json(
          { success: false, error: `Cannot transition from ${currentApplication.status} to ${status}` },
          { status: 409 }
        )
      }

      const updatedApplication = await ArtistJobsService.updateCollaborationApplicationStatus(
        applicationId,
        status as any,
        user.id,
        responseMessage
      )

      await writeArtistHiringAuditEvent({
        supabase,
        actorUserId: user.id,
        applicationId,
        jobId: params.id,
        applicationType: 'collaboration',
        fromStatus: currentApplication.status,
        toStatus: status,
      })

      if (status === 'accepted' && updatedApplication.applicant_id) {
        await achievementEngine.recordMetricEvent({
          supabase: supabase as any,
          userId: updatedApplication.applicant_id,
          metricKey: 'collaborations_completed_total',
          eventType: 'collaboration_application_accepted',
          delta: 1,
          eventSource: 'api_artist_jobs_application_patch',
          eventData: {
            application_id: updatedApplication.id,
            job_id: params.id
          }
        })
      }

      return NextResponse.json({
        success: true,
        data: updatedApplication,
        message: 'Collaboration application status updated'
      })
    }

    const { data: currentApplication } = await supabase
      .from('artist_job_applications')
      .select('id, status')
      .eq('id', applicationId)
      .single()

    if (!currentApplication) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      )
    }

    if (!canTransition(currentApplication.status, status, 'job')) {
      return NextResponse.json(
        { success: false, error: `Cannot transition from ${currentApplication.status} to ${status}` },
        { status: 409 }
      )
    }

    const updatedApplication = await ArtistJobsService.updateApplicationStatus(
      applicationId,
      status as any,
      user.id,
      feedback
    )

    await writeArtistHiringAuditEvent({
      supabase,
      actorUserId: user.id,
      applicationId,
      jobId: params.id,
      applicationType: 'job',
      fromStatus: currentApplication.status,
      toStatus: status,
    })

    return NextResponse.json({
      success: true,
      data: updatedApplication,
      message: 'Application status updated'
    })
  } catch (error) {
    console.error('Error in PATCH /api/artist-jobs/[id]/applications:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update application status'
      },
      { status: 500 }
    )
  }
}