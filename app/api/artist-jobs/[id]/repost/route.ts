import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { resolveActingContext, recordActingSnapshot } from '@/lib/auth/acting-context'
import { getPostedByType } from '@/lib/accounts/account-types'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveActingContext(request)
    if (ctx instanceof NextResponse) return ctx

    const { userId, accountType, profileId, supabase } = ctx
    const { id } = await params

    // Allow the original poster (by userId) or the entity that owns the job (by profileId)
    const { data: originalJob, error: fetchError } = await supabase
      .from('artist_jobs')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !originalJob) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    // Ownership check: the job must belong to the current user or the active entity
    const ownsJob =
      originalJob.posted_by === userId ||
      originalJob.poster_profile_id === profileId

    if (!ownsJob) {
      return NextResponse.json(
        { success: false, error: 'You do not own this job posting' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))

    const {
      id: _id,
      created_at: _createdAt,
      updated_at: _updatedAt,
      applications_count: _appCount,
      views_count: _viewsCount,
      status: _status,
      ...jobFields
    } = originalJob

    const repostData = {
      ...jobFields,
      title: body.title || originalJob.title,
      description: body.description || originalJob.description,
      status: 'open',
      applications_count: 0,
      views_count: 0,
      event_date: body.event_date || null,
      deadline: body.deadline || null,
      // Attribution: stamp which entity is reposting
      posted_by: userId,
      poster_profile_id: profileId,
      posted_by_type: getPostedByType(accountType),
    }

    const { data: newJob, error: insertError } = await createServiceRoleClient()
      .from('artist_jobs')
      .insert(repostData)
      .select('*, category:artist_job_categories(*)')
      .single()

    if (insertError) throw insertError

    await recordActingSnapshot(ctx, {
      action: 'job.repost',
      resourceType: 'artist_job',
      resourceId: newJob?.id,
      metadata: { original_job_id: id },
    })

    return NextResponse.json({
      success: true,
      data: newJob,
      message: 'Job reposted successfully',
    })
  } catch (error) {
    console.error('Error in POST /api/artist-jobs/[id]/repost:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to repost job' },
      { status: 500 }
    )
  }
}
