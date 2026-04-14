import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: any
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const { data: originalJob, error: fetchError } = await supabase
      .from('artist_jobs')
      .select('*')
      .eq('id', params.id)
      .eq('posted_by', user.id)
      .single()

    if (fetchError || !originalJob) {
      return NextResponse.json(
        { success: false, error: 'Job not found or you do not own this posting' },
        { status: 404 }
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
    }

    const { data: newJob, error: insertError } = await supabase
      .from('artist_jobs')
      .insert(repostData)
      .select('*, category:artist_job_categories(*)')
      .single()

    if (insertError) throw insertError

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
