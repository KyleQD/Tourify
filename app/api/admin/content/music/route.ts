import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/auth/api-auth'

export const GET = withAdminAuth(async (request: NextRequest, { supabase }) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || undefined
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

  let query = supabase
    .from('artist_music')
    .select(`
      id,
      title,
      genre,
      created_at,
      user_id,
      moderation_status,
      is_visible,
      is_public,
      is_pinned,
      rights_confirmed,
      access_mode,
      preview_mode,
      preview_status,
      storage_bucket,
      storage_path,
      file_url,
      preview_storage_bucket,
      preview_storage_path,
      preview_file_url,
      listing_sync_status
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('moderation_status', status)

  const { data: rows, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tracks = rows || []
  const userIds = [...new Set(tracks.map((t: any) => t.user_id).filter(Boolean))]
  const trackIds = tracks.map((t: any) => t.id)

  let profileMap: Record<string, any> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', userIds)
    ;(profiles || []).forEach((p: any) => { profileMap[p.id] = p })
  }

  const reportCounts: Record<string, number> = {}
  if (trackIds.length > 0) {
    const { data: reports } = await supabase
      .from('content_reports')
      .select('content_id, status')
      .eq('content_type', 'music')
      .in('content_id', trackIds)
      .in('status', ['pending', 'reviewed'])
    ;(reports || []).forEach((report: any) => {
      reportCounts[report.content_id] = (reportCounts[report.content_id] || 0) + 1
    })
  }

  const items = tracks.map((t: any) => ({
    id: t.id,
    title: t.title,
    genre: t.genre,
    created_at: t.created_at,
    user_id: t.user_id,
    moderation_status: t.moderation_status || 'approved',
    is_visible: t.is_visible ?? true,
    is_public: t.is_public ?? false,
    is_pinned: t.is_pinned ?? false,
    rights_confirmed: t.rights_confirmed ?? false,
    access_mode: t.access_mode || 'free',
    preview_mode: t.preview_mode || 'full',
    preview_status: t.preview_status || 'not_required',
    storage_ready: Boolean(t.storage_path || t.file_url),
    preview_ready: t.preview_mode !== 'clip' || (t.preview_status === 'ready' && Boolean(t.preview_storage_path || t.preview_file_url)),
    listing_sync_status: t.listing_sync_status || null,
    reports_count: reportCounts[t.id] || 0,
    author_name: profileMap[t.user_id]?.full_name || profileMap[t.user_id]?.username || null,
  }))

  return NextResponse.json({ items })
})
