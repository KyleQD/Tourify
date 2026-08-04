import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Public recognition summary for a profile username.
 * Relies on additive RLS policies for completed achievements / visible badges.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const resolved = await params
    const username = decodeURIComponent(resolved.username)
    const supabase = await createClient()

    let { data: profile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .maybeSingle()

    if (!profile) {
      const byCustom = await supabase
        .from('profiles')
        .select('id, username')
        .eq('custom_url', username)
        .maybeSingle()
      profile = byCustom.data
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const userId = profile.id

    const [achievementsRes, userAchievementsRes, badgesRes, userBadgesRes, endorsementsRes] =
      await Promise.all([
        supabase.from('achievements').select('*').eq('is_active', true).order('display_order'),
        supabase
          .from('user_achievements')
          .select('*, achievement:achievements(*)')
          .eq('user_id', userId)
          .eq('is_completed', true),
        supabase.from('badges').select('*').eq('is_active', true).order('display_order'),
        supabase
          .from('user_badges')
          .select('*, badge:badges(*)')
          .eq('user_id', userId)
          .eq('is_active', true),
        supabase
          .from('endorsements')
          .select('*')
          .eq('endorsee_id', userId)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

    const userAchievements = userAchievementsRes.data || []
    const visibleBadges = (userBadgesRes.data || []).filter(
      (ub: any) => ub.metadata?.is_visible !== false
    )
    const totalPoints = userAchievements.reduce(
      (sum: number, ua: any) => sum + (ua.achievement?.points || 0),
      0
    )

    return NextResponse.json({
      userId,
      username: profile.username,
      achievements: achievementsRes.data || [],
      user_achievements: userAchievements,
      total_points: totalPoints,
      completed_count: userAchievements.length,
      badges: badgesRes.data || [],
      user_badges: visibleBadges,
      total_badges: visibleBadges.length,
      endorsements: endorsementsRes.data || [],
      total_endorsements: (endorsementsRes.data || []).length,
      errors: {
        achievements: achievementsRes.error?.message || userAchievementsRes.error?.message || null,
        badges: badgesRes.error?.message || userBadgesRes.error?.message || null,
        endorsements: endorsementsRes.error?.message || null,
      },
    })
  } catch (error) {
    console.error('[profile recognition]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
