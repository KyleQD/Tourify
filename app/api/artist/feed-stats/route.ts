import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { computeArtistFeedEngagementRate } from '@/lib/artist/feed-stats'

interface EngagementRow {
  likes_count: number | null
  comments_count: number | null
  shares_count: number | null
  poll_total_votes: number | null
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateApiRequest(request)
    if (!authResult?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { supabase, user } = authResult
    const profileId = request.nextUrl.searchParams.get('profile_id')
    if (!profileId) {
      return NextResponse.json({ error: 'profile_id is required' }, { status: 400 })
    }

    const { data: artistProfile, error: artistError } = await supabase
      .from('artist_profiles')
      .select('id, user_id')
      .eq('id', profileId)
      .maybeSingle()

    if (artistError) {
      console.error('[artist feed-stats] Failed to load artist profile:', artistError)
      return NextResponse.json({ error: 'Failed to load artist profile' }, { status: 500 })
    }

    if (!artistProfile || artistProfile.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: account } = await supabase
      .from('accounts')
      .select('id, follower_count')
      .eq('profile_id', profileId)
      .eq('account_type', 'artist')
      .maybeSingle()

    let followers = Number(account?.follower_count) || 0

    if (account?.id && followers === 0) {
      const { count: followCount } = await supabase
        .from('account_follows')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', account.id)
      followers = followCount || 0
    }

    if (!account) {
      const { count: legacyFollowers } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', user.id)
      followers = legacyFollowers || 0
    }

    const { count: postCount, error: countError } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('posted_as_profile_id', profileId)

    if (countError) {
      console.error('[artist feed-stats] Failed to count posts:', countError)
      return NextResponse.json({ error: 'Failed to count posts' }, { status: 500 })
    }

    const { data: engagementRows, error: engagementError } = await supabase
      .from('posts')
      .select('likes_count, comments_count, shares_count, poll_total_votes')
      .eq('posted_as_profile_id', profileId)

    if (engagementError) {
      console.error('[artist feed-stats] Failed to load engagement:', engagementError)
      return NextResponse.json({ error: 'Failed to load engagement' }, { status: 500 })
    }

    const engagementTotal = ((engagementRows || []) as EngagementRow[]).reduce((sum, row) => {
      return (
        sum
        + (Number(row.likes_count) || 0)
        + (Number(row.comments_count) || 0)
        + (Number(row.shares_count) || 0)
        + (Number(row.poll_total_votes) || 0)
      )
    }, 0)

    const engagementRate = computeArtistFeedEngagementRate({
      engagementTotal,
      followers,
    })

    return NextResponse.json({
      success: true,
      data: {
        followers,
        postCount: postCount || 0,
        engagementTotal,
        engagementRate,
        profileId,
      },
    })
  } catch (error) {
    console.error('[artist feed-stats] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
