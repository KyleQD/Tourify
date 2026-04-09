import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase/client'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

/** List current user's staffing job applications (public board / job_posting_templates flow). */
export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 100)

    const { data, error } = await supabaseAuth
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
    const supabaseAuth = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { job_posting_id, form_responses } = body

    if (!job_posting_id) {
      return NextResponse.json(
        { success: false, error: 'Job posting ID is required' },
        { status: 400 }
      )
    }

    // Get job posting to extract venue_id and applicant info
    const { data: jobPosting, error: jobError } = await supabase
      .from('job_posting_templates')
      .select('venue_id, title, department, position, applications_count')
      .eq('id', job_posting_id)
      .eq('status', 'published')
      .single()

    if (jobError || !jobPosting) {
      return NextResponse.json(
        { success: false, error: 'Job posting not found or not published' },
        { status: 404 }
      )
    }

    // Extract applicant info from form responses
    const applicantName = form_responses.full_name || form_responses.name || 'Unknown'
    const applicantEmail = form_responses.email || user.email || ''
    const applicantPhone = form_responses.phone || ''

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

    // Create the application
    const { data: application, error: applicationError } = await supabase
      .from('job_applications')
      .insert({
        venue_id: jobPosting.venue_id,
        job_posting_id,
        applicant_id: user.id,
        applicant_name: applicantName,
        applicant_email: applicantEmail,
        applicant_phone: applicantPhone,
        status: 'pending',
        form_responses,
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