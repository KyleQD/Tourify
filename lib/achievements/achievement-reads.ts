import { supabase } from '@/lib/supabase'
import type {
  AchievementsResponse,
  AchievementStats,
  BadgesResponse,
  BadgeStats,
  Endorsement,
  EndorsementsResponse,
  EndorsementStats,
} from '@/types/achievements'

interface ProfileStub {
  id: string
  username: string
  full_name?: string
  avatar_url?: string
}

/** Batch-fetch profiles without PostgREST embeds (avoids PGRST200 when FK names differ). */
export async function fetchProfilesMap(ids: string[]): Promise<Record<string, ProfileStub>> {
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return {}

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url')
    .in('id', unique)

  if (error || !data?.length) return {}

  return (data as Array<{
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
  }>).reduce<Record<string, ProfileStub>>((acc, row) => {
    acc[row.id] = {
      id: row.id,
      username: row.username || 'user',
      full_name: row.full_name || undefined,
      avatar_url: row.avatar_url || undefined
    }
    return acc
  }, {})
}

async function getUserAchievements(userId: string): Promise<AchievementsResponse> {
  try {
    const { data: achievements, error: achievementsError } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (achievementsError) throw achievementsError

    const { data: userAchievements, error: userAchievementsError } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId)

    if (userAchievementsError) throw userAchievementsError

    const completedAchievements = userAchievements?.filter((ua) => ua.is_completed) || []
    const totalPoints = completedAchievements.reduce(
      (sum, ua) => sum + (ua.achievement?.points || 0),
      0
    )
    const completedCount = completedAchievements.length

    return {
      achievements: achievements || [],
      user_achievements: userAchievements || [],
      total_points: totalPoints,
      completed_count: completedCount,
      total_count: achievements?.length || 0
    }
  } catch (error) {
    console.error('Error fetching user achievements:', error)
    throw error
  }
}

async function getAchievementStats(userId: string): Promise<AchievementStats> {
  try {
    const { data: userAchievements, error } = await supabase
      .from('user_achievements')
      .select(`
        *,
        achievement:achievements(*)
      `)
      .eq('user_id', userId)

    if (error) throw error

    const completedAchievements = userAchievements?.filter(ua => ua.is_completed) || []
    const totalPoints = completedAchievements.reduce((sum, ua) => sum + (ua.achievement?.points || 0), 0)

    const rarityBreakdown = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0
    }

    const categoryBreakdown: Record<string, number> = {}

    completedAchievements.forEach(ua => {
      if (ua.achievement) {
        rarityBreakdown[ua.achievement.rarity as keyof typeof rarityBreakdown]++
        categoryBreakdown[ua.achievement.category] = (categoryBreakdown[ua.achievement.category] || 0) + 1
      }
    })

    return {
      total_achievements: userAchievements?.length || 0,
      completed_achievements: completedAchievements.length,
      total_points: totalPoints,
      rarity_breakdown: rarityBreakdown,
      category_breakdown: categoryBreakdown
    }
  } catch (error) {
    console.error('Error fetching achievement stats:', error)
    throw error
  }
}

async function getUserBadges(userId: string): Promise<BadgesResponse> {
  try {
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (badgesError) throw badgesError

    const { data: userBadges, error: userBadgesError } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*),
        granted_by_user:profiles!user_badges_granted_by_fkey(id, username, full_name, avatar_url)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    if (userBadgesError) throw userBadgesError

    const verificationBadges = userBadges?.filter(ub => ub.badge?.is_verification_badge) || []
    const expertiseBadges = userBadges?.filter(ub => ub.badge?.category === 'expertise') || []
    const recognitionBadges = userBadges?.filter(ub => ub.badge?.category === 'recognition') || []

    return {
      badges: badges || [],
      user_badges: userBadges || [],
      total_badges: userBadges?.length || 0,
      verification_badges: verificationBadges,
      expertise_badges: expertiseBadges,
      recognition_badges: recognitionBadges
    }
  } catch (error) {
    console.error('Error fetching user badges:', error)
    throw error
  }
}

async function getBadgeStats(userId: string): Promise<BadgeStats> {
  try {
    const { data: userBadges, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    if (error) throw error

    const rarityBreakdown = {
      common: 0,
      uncommon: 0,
      rare: 0,
      epic: 0,
      legendary: 0
    }

    const categoryBreakdown: Record<string, number> = {}

    userBadges?.forEach(ub => {
      if (ub.badge) {
        rarityBreakdown[ub.badge.rarity as keyof typeof rarityBreakdown]++
        categoryBreakdown[ub.badge.category] = (categoryBreakdown[ub.badge.category] || 0) + 1
      }
    })

    return {
      total_badges: userBadges?.length || 0,
      verification_badges: userBadges?.filter(ub => ub.badge?.is_verification_badge).length || 0,
      expertise_badges: userBadges?.filter(ub => ub.badge?.category === 'expertise').length || 0,
      recognition_badges: userBadges?.filter(ub => ub.badge?.category === 'recognition').length || 0,
      rarity_breakdown: rarityBreakdown,
      category_breakdown: categoryBreakdown
    }
  } catch (error) {
    console.error('Error fetching badge stats:', error)
    throw error
  }
}

async function getUserEndorsements(userId: string): Promise<EndorsementsResponse> {
  try {
    const { data: endorsementRows, error: endorsementsError } = await supabase
      .from('endorsements')
      .select('*')
      .eq('endorsee_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (endorsementsError) {
      console.warn('[achievements] endorsements query:', endorsementsError.message)
    }

    let rows = endorsementRows || []
    if (!rows.length && endorsementsError) {
      // Canonical fallback: environments that only have skill_endorsements.
      const { data: skillRows } = await supabase
        .from('skill_endorsements')
        .select('*')
        .eq('endorsed_id', userId)
        .order('created_at', { ascending: false })

      rows = (skillRows || []).map((r: any) => ({
        id: r.id,
        endorser_id: r.endorser_id,
        endorsee_id: r.endorsed_id,
        skill: r.skill,
        category: null,
        level: 3,
        comment: null,
        project_id: null,
        collaboration_id: null,
        event_id: null,
        job_id: null,
        is_verified: false,
        verified_by: null,
        verified_at: null,
        is_active: true,
        created_at: r.created_at,
        updated_at: r.created_at
      }))
    }

    const ids = new Set<string>()
    rows.forEach((e: { endorser_id?: string; endorsee_id?: string }) => {
      if (e.endorser_id) ids.add(e.endorser_id)
      if (e.endorsee_id) ids.add(e.endorsee_id)
    })
    const profileById = await fetchProfilesMap([...ids])

    const endorsements: Endorsement[] = rows.map((e: Endorsement) => ({
      ...e,
      endorser: e.endorser_id ? profileById[e.endorser_id] : undefined,
      endorsee: e.endorsee_id ? profileById[e.endorsee_id] : undefined
    }))

    const { data: skills, error: skillsError } = await supabase
      .from('user_skills')
      .select(`
        *,
        category:skill_categories(*)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    if (skillsError) throw skillsError

    const totalEndorsements = endorsements.length
    const averageLevel =
      totalEndorsements > 0
        ? endorsements.reduce((sum, e) => sum + e.level, 0) / totalEndorsements
        : 0

    return {
      endorsements,
      skills: skills || [],
      total_endorsements: totalEndorsements,
      average_level: averageLevel
    }
  } catch (error) {
    console.error('Error fetching user endorsements:', error)
    throw error
  }
}

async function getEndorsementStats(userId: string): Promise<EndorsementStats> {
  try {
    const { data: endorsements, error: endorsementsError } = await supabase
      .from('endorsements')
      .select('*')
      .eq('endorsee_id', userId)
      .eq('is_active', true)

    if (endorsementsError) throw endorsementsError

    const { data: skills, error: skillsError } = await supabase
      .from('user_skills')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (skillsError) throw skillsError

    const skillStats = new Map<string, { level: number; endorsements: number }>()

    endorsements?.forEach(endorsement => {
      const current = skillStats.get(endorsement.skill) || { level: 0, endorsements: 0 }
      skillStats.set(endorsement.skill, {
        level: current.level + endorsement.level,
        endorsements: current.endorsements + 1
      })
    })

    const topSkills = Array.from(skillStats.entries())
      .map(([skill, stats]) => ({
        skill,
        level: stats.endorsements > 0 ? Math.round(stats.level / stats.endorsements) : 0,
        endorsements: stats.endorsements
      }))
      .sort((a, b) => b.endorsements - a.endorsements)
      .slice(0, 5)

    const categoryBreakdown: Record<string, number> = {}
    endorsements?.forEach(endorsement => {
      if (endorsement.category) {
        categoryBreakdown[endorsement.category] = (categoryBreakdown[endorsement.category] || 0) + 1
      }
    })

    return {
      total_endorsements: endorsements?.length || 0,
      unique_skills: skills?.length || 0,
      average_level: endorsements?.length > 0
        ? endorsements.reduce((sum, e) => sum + e.level, 0) / endorsements.length
        : 0,
      top_skills: topSkills,
      category_breakdown: categoryBreakdown
    }
  } catch (error) {
    console.error('Error fetching endorsement stats:', error)
    throw error
  }
}

/** Client-safe achievement reads (browser Supabase + RLS). No engine/notification imports. */
export const achievementReads = {
  getUserAchievements,
  getAchievementStats,
  getUserBadges,
  getBadgeStats,
  getUserEndorsements,
  getEndorsementStats,
}
