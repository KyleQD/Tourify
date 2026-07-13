import { NextRequest, NextResponse } from 'next/server'
import { ArtistJobsService } from '@/lib/services/artist-jobs.service'
import { createClient } from '@/lib/supabase/server'
import { getPostgrestErrorMessage } from '@/lib/supabase/postgrest-error'
import { CreateJobFormData } from '@/types/artist-jobs'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    
    // Get user (optional for viewing jobs)
    const { data: { user } } = await supabase.auth.getUser()
    
    const job = await ArtistJobsService.getJob(id, user?.id, supabase as any)
    
    if (!job) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: job
    })
  } catch (error) {
    console.error('Error in GET /api/artist-jobs/[id]:', error)
    return NextResponse.json(
      {
        success: false,
        error: getPostgrestErrorMessage(error) || 'Failed to fetch job',
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
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

    const updates: Partial<CreateJobFormData> = await request.json()
    
    const job = await ArtistJobsService.updateJob(id, updates, user.id, supabase as any)

    return NextResponse.json({
      success: true,
      data: job,
      message: 'Job updated successfully'
    })
  } catch (error) {
    console.error('Error in PUT /api/artist-jobs/[id]:', error)
    return NextResponse.json(
      {
        success: false,
        error: getPostgrestErrorMessage(error) || 'Failed to update job',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ success: false, error: 'status is required' }, { status: 400 })
    }

    const validStatuses = ['draft', 'open', 'paused', 'closed', 'filled']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status value' }, { status: 400 })
    }

    const { data: job, error } = await supabase
      .from('artist_jobs')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('posted_by', user.id)
      .select('*, category:artist_job_categories(*)')
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: job,
      message: `Job status updated to ${status}`,
    })
  } catch (error) {
    console.error('Error in PATCH /api/artist-jobs/[id]:', error)
    return NextResponse.json(
      { success: false, error: getPostgrestErrorMessage(error) || 'Failed to update job status' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
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

    await ArtistJobsService.deleteJob(id, user.id, supabase as any)

    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully'
    })
  } catch (error) {
    console.error('Error in DELETE /api/artist-jobs/[id]:', error)
    return NextResponse.json(
      {
        success: false,
        error: getPostgrestErrorMessage(error) || 'Failed to delete job',
      },
      { status: 500 }
    )
  }
} 