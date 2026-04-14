import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const GET = withAuth(async (_request, { user }) => {
  try {
    const supabase = createServiceRoleClient()
    const userId = user.id

    const [
      followersResult,
      followingResult,
      conversationsResult,
      eventsResult,
      eventsV2Result,
      postsResult,
      jobsResult,
      projectsResult,
    ] = await Promise.allSettled([
      supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId),

      supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', userId),

      supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`),

      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('artist_id', userId)
        .gte('start_date', new Date().toISOString()),

      supabase
        .from('events_v2')
        .select('id', { count: 'exact', head: true })
        .eq('organizer_id', userId)
        .gte('start_at', new Date().toISOString()),

      supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),

      supabase
        .from('artist_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),

      supabase
        .from('collaboration_projects')
        .select('id', { count: 'exact', head: true }),
    ])

    function extractCount(result: PromiseSettledResult<any>): number {
      if (result.status !== 'fulfilled') return 0
      return (result.value as any).count ?? result.value.data?.length ?? 0
    }

    const followersCount = extractCount(followersResult)
    const followingCount = extractCount(followingResult)
    const totalConnections = followersCount + followingCount
    const conversationsCount = extractCount(conversationsResult)
    const eventsCount = extractCount(eventsResult) + extractCount(eventsV2Result)
    const postsCount = extractCount(postsResult)
    const jobsCount = extractCount(jobsResult)
    const projectsCount = extractCount(projectsResult)

    // Recent activity counts for change indicators (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const [recentFollowersResult, recentConversationsResult] = await Promise.allSettled([
      supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId)
        .gte('created_at', weekAgo),

      supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .gte('created_at', weekAgo),
    ])

    const recentFollowers = extractCount(recentFollowersResult)
    const recentConversations = extractCount(recentConversationsResult)

    return NextResponse.json({
      success: true,
      quickStats: {
        totalConnections,
        connectionsChange: recentFollowers > 0 ? `+${recentFollowers}` : '0',
        activeConversations: conversationsCount,
        conversationsChange: recentConversations > 0 ? `+${recentConversations}` : '0',
        communityEvents: eventsCount,
        eventsChange: `+${eventsCount}`,
      },
      featureStats: {
        fanEngagement: { total: followersCount, recent: recentFollowers },
        network: { total: followingCount, recent: 0 },
        jobs: { total: jobsCount, recent: 0 },
        messages: { total: conversationsCount, recent: recentConversations },
        events: { total: eventsCount, recent: 0 },
        collaborations: { total: projectsCount, recent: 0 },
        projectWorkspaces: { total: projectsCount, recent: 0 },
      },
    })
  } catch (error) {
    console.error('[Community Stats API] Error:', error)
    return NextResponse.json({
      success: true,
      quickStats: {
        totalConnections: 0,
        connectionsChange: '0',
        activeConversations: 0,
        conversationsChange: '0',
        communityEvents: 0,
        eventsChange: '0',
      },
      featureStats: {
        fanEngagement: { total: 0, recent: 0 },
        network: { total: 0, recent: 0 },
        jobs: { total: 0, recent: 0 },
        messages: { total: 0, recent: 0 },
        events: { total: 0, recent: 0 },
        collaborations: { total: 0, recent: 0 },
        projectWorkspaces: { total: 0, recent: 0 },
      },
    })
  }
})
