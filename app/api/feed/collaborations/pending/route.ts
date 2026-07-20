import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export async function GET(request: NextRequest) {
  const auth = await authenticateApiRequest(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { user, supabase } = auth
  const limit = Math.min(parseInt(new URL(request.url).searchParams.get('limit') || '30'), 50)

  const { data: invites, error } = await supabase
    .from('feed_post_collaborators')
    .select('id, post_id, collaborator_user_id, collaborator_profile_id, status, invited_by_user_id, created_at')
    .eq('collaborator_user_id', user.id)
    .eq('status', 'invited')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message, data: [] }, { status: 500 })
  }

  const postIds = (invites || []).map((row: { post_id: string }) => row.post_id)
  if (postIds.length === 0) {
    return NextResponse.json({ success: true, data: [] })
  }

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      account_display_name,
      account_username,
      account_avatar_url,
      posted_as_profile_id,
      posted_as_type,
      user_id,
      media_urls,
      type,
      visibility
    `)
    .in('id', postIds)

  const postMap = new Map((posts || []).map((post: any) => [post.id, post]))
  const inviterIds = Array.from(
    new Set((invites || []).map((row: { invited_by_user_id: string }) => row.invited_by_user_id))
  )

  const { data: inviters } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', inviterIds)

  const inviterMap = new Map((inviters || []).map((profile: any) => [profile.id, profile]))

  const data = (invites || []).map((invite: any) => {
    const post = postMap.get(invite.post_id)
    const inviter = inviterMap.get(invite.invited_by_user_id)
    return {
      ...invite,
      post: post || null,
      inviter: inviter
        ? {
            id: inviter.id,
            username: inviter.full_name || inviter.username || 'User',
            avatar_url: inviter.avatar_url || null,
          }
        : null,
    }
  })

  return NextResponse.json({ success: true, data })
}
