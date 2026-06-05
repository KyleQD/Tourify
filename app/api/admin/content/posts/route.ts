import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

  let query = supabase
    .from('posts')
    .select('id, content, created_at, user_id, moderation_status, is_visible, is_pinned')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('moderation_status', status)

  const { data: rows, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const posts = rows || []
  const userIds = [...new Set(posts.map((p: any) => p.user_id).filter(Boolean))]

  let profileMap: Record<string, any> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', userIds)
    ;(profiles || []).forEach((p: any) => { profileMap[p.id] = p })
  }

  const items = posts.map((p: any) => ({
    id: p.id,
    content: p.content,
    created_at: p.created_at,
    user_id: p.user_id,
    moderation_status: p.moderation_status || 'approved',
    is_visible: p.is_visible ?? true,
    is_pinned: p.is_pinned ?? false,
    author_name: profileMap[p.user_id]?.full_name || profileMap[p.user_id]?.username || null,
  }))

  return NextResponse.json({ items })
})
