import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { canManagePost } from '@/lib/feed/post-management'

function extractPostId(url: string): string | null {
  const segments = new URL(url).pathname.split('/')
  const index = segments.indexOf('posts')
  return index >= 0 ? segments[index + 1] || null : null
}

function getPostMediaStoragePath(url: string, ownerUserId: string): string | null {
  try {
    const parsed = new URL(url)
    const marker = '/storage/v1/object/public/post-media/'
    const markerIndex = parsed.pathname.indexOf(marker)
    if (markerIndex < 0) return null

    const path = decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length))
    if (!path || !path.startsWith(`${ownerUserId}/`)) return null
    return path
  } catch {
    return null
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  const userId = auth?.user?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const postId = extractPostId(request.url)
  if (!postId) {
    return NextResponse.json({ error: 'Missing post id' }, { status: 400 })
  }

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, user_id, posted_as_profile_id, posted_as_type, media_urls')
    .eq('id', postId)
    .maybeSingle()

  if (postError) {
    console.error('[Posts API] Failed to fetch post for delete:', postError)
    return NextResponse.json({ error: 'Failed to load post' }, { status: 500 })
  }

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const canManage = await canManagePost({ supabase, post, userId })
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : []
  const deleteClient = post.user_id === userId ? supabase : createServiceRoleClient()

  const { data: deletedRows, error: deleteError } = await deleteClient
    .from('posts')
    .delete()
    .eq('id', postId)
    .select('id')

  if (deleteError) {
    console.error('[Posts API] Failed to delete post:', deleteError)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }

  if (!deletedRows?.length) {
    return NextResponse.json({ error: 'Post could not be deleted' }, { status: 500 })
  }

  const storageOwnerId = post.user_id || userId
  const storagePaths = mediaUrls
    .map((url: string) => getPostMediaStoragePath(url, storageOwnerId))
    .filter(Boolean) as string[]

  if (storagePaths.length > 0) {
    const { error: storageError } = await deleteClient.storage
      .from('post-media')
      .remove(storagePaths)

    if (storageError) {
      console.warn('[Posts API] Post deleted, but media cleanup failed:', storageError)
    }
  }

  return NextResponse.json({ success: true })
}
