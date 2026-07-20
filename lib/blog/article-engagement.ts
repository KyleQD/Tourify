import type { SupabaseClient } from '@supabase/supabase-js'

export type ArticleEngageAction = 'view' | 'like' | 'unlike' | 'share'

export interface ArticleStats {
  views: number
  likes: number
  comments: number
  shares: number
}

function toStats(raw: unknown): ArticleStats {
  const stats = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    views: Math.max(0, Number(stats.views || 0)),
    likes: Math.max(0, Number(stats.likes || 0)),
    comments: Math.max(0, Number(stats.comments || 0)),
    shares: Math.max(0, Number(stats.shares || 0)),
  }
}

function nextStats(current: ArticleStats, action: ArticleEngageAction): ArticleStats {
  if (action === 'view')
    return { ...current, views: current.views + 1 }
  if (action === 'like')
    return { ...current, likes: current.likes + 1 }
  if (action === 'unlike')
    return { ...current, likes: Math.max(0, current.likes - 1) }
  return { ...current, shares: current.shares + 1 }
}

export async function incrementArticleStat(input: {
  supabase: SupabaseClient
  articleId: string
  action: ArticleEngageAction
  /** When set, only published public articles can receive engagement. */
  requirePublished?: boolean
}): Promise<
  | { success: true; stats: ArticleStats }
  | { success: false; error: string; status: number }
> {
  const { supabase, articleId, action, requirePublished = true } = input

  let query = supabase
    .from('artist_blog_posts')
    .select('id, stats, status')
    .eq('id', articleId)

  if (requirePublished)
    query = query.eq('status', 'published')

  const { data, error } = await query.maybeSingle()

  if (error) {
    console.error('[ArticleEngagement] Failed to load article:', error)
    return { success: false, error: 'Failed to load article', status: 500 }
  }

  if (!data)
    return { success: false, error: 'Article not found', status: 404 }

  const stats = nextStats(toStats(data.stats), action)

  const { error: updateError } = await supabase
    .from('artist_blog_posts')
    .update({ stats, updated_at: new Date().toISOString() })
    .eq('id', articleId)

  if (updateError) {
    console.error('[ArticleEngagement] Failed to update stats:', updateError)
    return { success: false, error: 'Failed to update engagement', status: 500 }
  }

  return { success: true, stats }
}

export async function bumpArticleSharesBy(input: {
  supabase: SupabaseClient
  articleId: string
  amount: number
}): Promise<void> {
  const amount = Math.max(0, Math.floor(input.amount))
  if (amount === 0) return

  const { data, error } = await input.supabase
    .from('artist_blog_posts')
    .select('id, stats')
    .eq('id', input.articleId)
    .maybeSingle()

  if (error || !data) {
    console.error('[ArticleEngagement] Failed to load article for share bump:', error)
    return
  }

  const current = toStats(data.stats)
  const stats = { ...current, shares: current.shares + amount }

  const { error: updateError } = await input.supabase
    .from('artist_blog_posts')
    .update({ stats, updated_at: new Date().toISOString() })
    .eq('id', input.articleId)

  if (updateError)
    console.error('[ArticleEngagement] Failed to bump shares:', updateError)
}
