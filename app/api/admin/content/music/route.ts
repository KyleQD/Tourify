import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

  let query = supabase
    .from('artist_music')
    .select('id, title, genre, created_at, user_id, moderation_status, is_visible, is_pinned')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('moderation_status', status)

  const { data: rows, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tracks = rows || []
  const userIds = [...new Set(tracks.map((t: any) => t.user_id).filter(Boolean))]

  let profileMap: Record<string, any> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', userIds)
    ;(profiles || []).forEach((p: any) => { profileMap[p.id] = p })
  }

  const items = tracks.map((t: any) => ({
    id: t.id,
    title: t.title,
    genre: t.genre,
    created_at: t.created_at,
    user_id: t.user_id,
    moderation_status: t.moderation_status || 'approved',
    is_visible: t.is_visible ?? true,
    is_pinned: t.is_pinned ?? false,
    author_name: profileMap[t.user_id]?.full_name || profileMap[t.user_id]?.username || null,
  }))

  return NextResponse.json({ items })
})
