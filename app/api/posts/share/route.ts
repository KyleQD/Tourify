import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { parseUserFromRequestCookieHeader } from '@/lib/supabase/tourify-session-cookie'

export async function POST(request: NextRequest) {
  try {
    const user = parseUserFromRequestCookieHeader(request.headers.get('cookie'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      type = 'share',
      shared_content_type,
      shared_content_id,
      content,
      visibility = 'public',
      route_context = '/feed',
    } = body

    if (!shared_content_type || !shared_content_id) {
      return NextResponse.json(
        { error: 'shared_content_type and shared_content_id are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .eq('id', user.id)
      .single()

    const displayName = profile?.full_name || 'User'
    const username = profile?.username || 'user'

    let sharedMetadata: Record<string, any> = {
      shared_content_type,
      shared_content_id,
    }

    if (shared_content_type === 'job') {
      const { data: job } = await supabase
        .from('artist_jobs')
        .select('id, title, description, payment_type, payment_amount, location, city, state, job_type, posted_by')
        .eq('id', shared_content_id)
        .single()

      if (job) {
        sharedMetadata = {
          ...sharedMetadata,
          job_title: job.title,
          job_description: job.description?.substring(0, 200),
          job_payment_type: job.payment_type,
          job_payment_amount: job.payment_amount,
          job_location: [job.city, job.state].filter(Boolean).join(', ') || job.location,
          job_type: job.job_type,
          job_url: `/jobs?highlight=${shared_content_id}`,
        }
      }
    } else if (shared_content_type === 'job_posting') {
      const { data: posting } = await supabase
        .from('job_posting_templates')
        .select('id, title, description, employment_type, location, department')
        .eq('id', shared_content_id)
        .single()

      if (posting) {
        sharedMetadata = {
          ...sharedMetadata,
          job_title: posting.title,
          job_description: posting.description?.substring(0, 200),
          job_employment_type: posting.employment_type,
          job_location: posting.location,
          job_department: posting.department,
          job_url: `/jobs/${posting.id}`,
        }
      }
    }

    if (shared_content_type === 'post') {
      const { data: existing } = await supabase
        .from('posts')
        .select('id, shares_count')
        .eq('id', shared_content_id)
        .single()

      if (existing) {
        await supabase
          .from('posts')
          .update({ shares_count: (existing.shares_count || 0) + 1 })
          .eq('id', shared_content_id)
      }
    }

    const postContent = content?.trim() || (
      sharedMetadata.job_title
        ? `Check out this opportunity: ${sharedMetadata.job_title}`
        : 'Shared a post'
    )

    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: postContent,
        type: 'share',
        visibility,
        route_context,
        posted_as_account_type: 'primary',
        posted_as_profile_id: user.id,
        account_display_name: displayName,
        account_username: username,
        account_avatar_url: profile?.avatar_url || '',
        metadata: sharedMetadata,
      })
      .select()
      .single()

    if (postError) {
      console.error('Failed to create share post:', postError)
      return NextResponse.json(
        { error: 'Failed to share: ' + postError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      post,
      message: 'Shared successfully',
    })
  } catch (error) {
    console.error('Share API error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
