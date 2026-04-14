import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await context.params

    // Get the job posting with application form template
    const { data: jobPosting, error: jobError } = await supabase
      .from('job_posting_templates')
      .select(`
        *,
        application_form_template:application_form_templates(*)
      `)
      .eq('id', jobId)
      .eq('status', 'published')
      .single()

    if (jobError) {
      console.error('Error fetching job posting:', jobError)
      return NextResponse.json(
        { success: false, error: 'Job posting not found' },
        { status: 404 }
      )
    }

    // Increment view count (atomic via RPC when migration applied; fallback otherwise)
    const { error: rpcErr } = await supabase.rpc('increment_job_posting_views', { p_job_id: jobId })
    if (rpcErr) {
      await supabase
        .from('job_posting_templates')
        .update({ views_count: (jobPosting.views_count || 0) + 1 })
        .eq('id', jobId)
    }

    return NextResponse.json({
      success: true,
      data: jobPosting
    })
  } catch (error) {
    console.error('Error in job posting API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 