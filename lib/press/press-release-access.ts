import type { SupabaseClient } from '@supabase/supabase-js'
import { parsePressFormat } from '@/lib/press/formats'

export interface PressReleaseRow {
  id: string
  user_id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  format: string
  subtitle: string | null
  boilerplate: string | null
  embargo_until: string | null
  featured_image_url: string | null
  status: string
  published_at: string | null
  account_display_name: string | null
  account_username: string | null
  account_avatar_url: string | null
}

export async function getPressReleaseById(
  supabase: SupabaseClient,
  pressPostId: string
): Promise<PressReleaseRow | null> {
  const { data, error } = await supabase
    .from('artist_blog_posts')
    .select(`
      id,
      user_id,
      title,
      slug,
      content,
      excerpt,
      format,
      subtitle,
      boilerplate,
      embargo_until,
      featured_image_url,
      status,
      published_at,
      account_display_name,
      account_username,
      account_avatar_url
    `)
    .eq('id', pressPostId)
    .maybeSingle()

  if (error || !data) return null
  if (parsePressFormat(data.format, 'blog') !== 'press_release') return null
  return data as PressReleaseRow
}

export async function canAccessPressRelease(input: {
  supabase: SupabaseClient
  pressPostId: string
  userId: string
}): Promise<{ allowed: boolean; release: PressReleaseRow | null; isOwner: boolean }> {
  const release = await getPressReleaseById(input.supabase, input.pressPostId)
  if (!release) return { allowed: false, release: null, isOwner: false }

  const isOwner = release.user_id === input.userId
  if (isOwner) return { allowed: true, release, isOwner: true }

  const { data: share } = await input.supabase
    .from('press_release_shares')
    .select('id')
    .eq('press_post_id', input.pressPostId)
    .eq('recipient_user_id', input.userId)
    .maybeSingle()

  return { allowed: Boolean(share), release, isOwner: false }
}

export async function recordPressReleaseDownload(input: {
  supabase: SupabaseClient
  pressPostId: string
  userId: string
}) {
  await input.supabase
    .from('press_release_shares')
    .update({ downloaded_at: new Date().toISOString() })
    .eq('press_post_id', input.pressPostId)
    .eq('recipient_user_id', input.userId)
    .is('downloaded_at', null)
}
