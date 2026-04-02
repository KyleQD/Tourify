import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user)
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const { data, error } = await supabase
      .from('artist_job_saves')
      .select(
        `
        job:artist_jobs(
          *,
          category:artist_job_categories(*)
        )
      `
      )
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: (data || []).map((item: any) => ({
        ...(item.job || {}),
        is_saved: true,
      })),
    })
  } catch (error) {
    console.error('Error in GET /api/artist-jobs/saved:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch saved jobs'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user)
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })

    const body = await request.json()
    const jobId = body?.job_id as string | undefined
    const action = body?.action as 'save' | 'unsave' | undefined
    if (!jobId || !action)
      return NextResponse.json(
        { success: false, error: 'job_id and action are required' },
        { status: 400 }
      )

    if (action === 'save') {
      const { error } = await supabase.from('artist_job_saves').upsert({
        job_id: jobId,
        user_id: user.id,
      })

      if (error) throw error
      return NextResponse.json({ success: true, message: 'Job saved' })
    }

    const { error } = await supabase
      .from('artist_job_saves')
      .delete()
      .eq('job_id', jobId)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Job unsaved',
    })
  } catch (error) {
    console.error('Error in POST /api/artist-jobs/saved:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save/unsave job'
      },
      { status: 500 }
    )
  }
} 