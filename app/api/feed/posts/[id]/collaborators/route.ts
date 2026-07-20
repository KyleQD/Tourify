import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: postId } = await params
  const { supabase } = auth

  const { data, error } = await supabase
    .from('feed_post_collaborators')
    .select('id, post_id, collaborator_user_id, collaborator_profile_id, status, invited_by_user_id, created_at, responded_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data || [] })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateApiRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: postId } = await params
  const { user, supabase } = auth
  const body = await request.json().catch(() => ({}))
  const action = String(body.action || '').toLowerCase()

  if (action !== 'accept' && action !== 'decline') {
    return NextResponse.json({ error: 'action must be accept or decline' }, { status: 400 })
  }

  const status = action === 'accept' ? 'accepted' : 'declined'
  const updatePayload: Record<string, unknown> = {
    status,
    responded_at: new Date().toISOString(),
  }

  if (body.collaborator_profile_id || body.profileId) {
    updatePayload.collaborator_profile_id = body.collaborator_profile_id || body.profileId
  }

  const { data, error } = await supabase
    .from('feed_post_collaborators')
    .update(updatePayload)
    .eq('post_id', postId)
    .eq('collaborator_user_id', user.id)
    .eq('status', 'invited')
    .select('id, post_id, collaborator_user_id, collaborator_profile_id, status, responded_at')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'No pending collaboration invite found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data })
}
