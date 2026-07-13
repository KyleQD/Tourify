import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'

export interface ContentHubOverviewResponse {
  thisWeekCount: number
  recent: {
    music: number
    video: number
    photo: number
    blog: number
  }
  attention: {
    failedScheduledPosts: number
    blogDrafts: number
    unpublishedMusic: number
    oauthExpiringSoon: number
    oauthExpired: number
  }
  failedPosts: Array<{
    id: string
    content: string
    scheduled_for: string
    status: string
    platform_status: Record<string, string>
    platform_errors: Record<string, string>
    error_details: string | null
  }>
  expiringIntegrations: Array<{
    platform: string
    account_handle: string
    token_expires_at: string | null
    daysUntilExpiry: number | null
  }>
}

interface ScheduledPostOverviewRow {
  id: string
  content: string | null
  scheduled_for: string | null
  status: string | null
  platform_status: Record<string, string> | null
  platform_errors: Record<string, string> | null
  error_details: unknown
}

interface ArtistSocialIntegrationOverviewRow {
  platform: string
  account_handle: string
  token_expires_at: string | null
  is_connected: boolean | null
  access_token: string | null
  analytics: unknown
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (!Number.isFinite(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    if (!authResult?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabase, user } = authResult
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const safeCount = async (promise: PromiseLike<{ count: number | null; error: any }>) => {
      try {
        const result = await promise
        if (result.error) return 0
        return result.count || 0
      } catch {
        return 0
      }
    }

    const [
      musicRecent,
      videoRecent,
      photoRecent,
      blogRecent,
      blogDrafts,
      unpublishedMusic,
      failedPostsResult,
      integrationsResult,
    ] = await Promise.all([
      safeCount(
        supabase
          .from('artist_music')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', weekAgo)
      ),
      safeCount(
        supabase
          .from('artist_videos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', weekAgo)
      ),
      safeCount(
        supabase
          .from('artist_photos')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', weekAgo)
      ),
      safeCount(
        supabase
          .from('artist_blog_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', weekAgo)
      ),
      safeCount(
        supabase
          .from('artist_blog_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'draft')
      ),
      safeCount(
        supabase
          .from('artist_music')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_public', false)
      ),
      supabase
        .from('scheduled_posts')
        .select('id, content, scheduled_for, status, platform_status, platform_errors, error_details')
        .eq('user_id', user.id)
        .eq('status', 'failed')
        .order('scheduled_for', { ascending: false })
        .limit(10),
      supabase
        .from('artist_social_integrations')
        .select('platform, account_handle, token_expires_at, is_connected, access_token, analytics')
        .eq('user_id', user.id)
        .eq('is_connected', true),
    ])

    const recent = {
      music: musicRecent,
      video: videoRecent,
      photo: photoRecent,
      blog: blogRecent,
    }

    const integrations = (integrationsResult.data || []) as ArtistSocialIntegrationOverviewRow[]
    const expiringIntegrations = integrations
      .map((row) => {
        const days = daysUntil(row.token_expires_at)
        const analyticsStatus = String((row.analytics as any)?.status || '')
        const isExpired =
          (days != null && days < 0) ||
          analyticsStatus === 'needs_oauth' ||
          (!row.access_token && row.is_connected)
        return {
          platform: row.platform as string,
          account_handle: row.account_handle as string,
          token_expires_at: row.token_expires_at as string | null,
          daysUntilExpiry: days,
          isExpired,
        }
      })
      .filter((row) => row.isExpired || (row.daysUntilExpiry != null && row.daysUntilExpiry <= 7))

    const failedPosts = ((failedPostsResult.data || []) as ScheduledPostOverviewRow[]).map((post) => ({
      id: post.id as string,
      content: String(post.content || ''),
      scheduled_for: String(post.scheduled_for || ''),
      status: String(post.status || 'failed'),
      platform_status: (post.platform_status || {}) as Record<string, string>,
      platform_errors: (post.platform_errors || {}) as Record<string, string>,
      error_details:
        typeof post.error_details === 'string'
          ? post.error_details
          : post.error_details
            ? JSON.stringify(post.error_details)
            : null,
    }))

    const payload: ContentHubOverviewResponse = {
      thisWeekCount: recent.music + recent.video + recent.photo + recent.blog,
      recent,
      attention: {
        failedScheduledPosts: failedPosts.length,
        blogDrafts: blogDrafts,
        unpublishedMusic: unpublishedMusic,
        oauthExpiringSoon: expiringIntegrations.filter((r) => !r.isExpired).length,
        oauthExpired: expiringIntegrations.filter((r) => r.isExpired).length,
      },
      failedPosts,
      expiringIntegrations: expiringIntegrations.map(({ isExpired: _isExpired, ...rest }) => rest),
    }

    return NextResponse.json({ data: payload })
  } catch (error) {
    console.error('[artist content overview]', error)
    return NextResponse.json({ error: 'Failed to load content overview' }, { status: 500 })
  }
}
