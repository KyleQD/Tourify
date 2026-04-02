import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  Achievement, 
  UserAchievement, 
  Badge, 
  UserBadge, 
  Endorsement, 
  UserSkill,
  SkillCategory,
  AchievementProgressEvent,
  SkillEndorsementRequest,
  AchievementProgressRequest,
  BadgeGrantRequest,
  SkillAddRequest,
  SkillUpdateRequest,
  AchievementsResponse,
  BadgesResponse,
  EndorsementsResponse,
  AchievementStats,
  BadgeStats,
  EndorsementStats
} from '@/types/achievements'
import { achievementEngine } from '@/lib/services/achievement-engine.service'

type ProfileStub = {
  id: string
  username: string
  full_name?: string
  avatar_url?: string
}

export class AchievementService {
  private supabase = createClientComponentClient()

  /** Batch-fetch profiles without PostgREST embeds (avoids PGRST200 when FK names differ). */
  private async fetchProfilesMap(ids: string[]): Promise<Record<string, ProfileStub>> {
    const unique = [...new Set(ids.filter(Boolean))]
    if (unique.length === 0) return {}

    const { data, error } = await this.supabase
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

  // =============================================
  // ACHIEVEMENTS
  // =============================================

  async getUserAchievements(userId: string): Promise<AchievementsResponse> {
    try {
      const { data: achievements, error: achievementsError } = await this.supabase
        .from('achievements')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (achievementsError) throw achievementsError

      const { data: userAchievements, error: userAchievementsError } = await this.supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('user_id', userId)

      if (userAchievementsError) throw userAchievementsError

      const totalPoints = userAchievements?.reduce((sum, ua) => sum + (ua.achievement?.points || 0), 0) || 0
      const completedCount = userAchievements?.filter(ua => ua.is_completed).length || 0

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

  async getAchievementStats(userId: string): Promise<AchievementStats> {
    try {
      const { data: userAchievements, error } = await this.supabase
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

  async recordAchievementProgress(request: AchievementProgressRequest): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Legacy path: if explicit achievement_id is provided, keep event insert behavior.
      if (request.achievement_id) {
        const { error } = await this.supabase
          .from('achievement_progress_events')
          .insert({
            user_id: user.id,
            achievement_id: request.achievement_id,
            metric_key: request.metric_key ?? null,
            metric_value: request.metric_value ?? null,
            event_type: request.event_type,
            event_value: request.event_value || 1,
            event_data: request.event_data || {},
            related_project_id: request.related_project_id,
            related_event_id: request.related_event_id,
            related_collaboration_id: request.related_collaboration_id
          })
        if (error) throw error
        return
      }

      // Metric path: evaluate unlocks against active achievement definitions.
      if (request.metric_key) {
        await achievementEngine.recordMetricEvent({
          supabase: this.supabase,
          userId: user.id,
          metricKey: request.metric_key,
          eventType: request.event_type,
          delta: request.evaluation_mode === 'absolute' ? undefined : request.event_value || 1,
          absoluteValue: request.evaluation_mode === 'absolute' ? request.metric_value : undefined,
          eventData: request.event_data || {},
          relatedEventId: request.related_event_id,
          relatedProjectId: request.related_project_id,
          relatedCollaborationId: request.related_collaboration_id
        })
        return
      }
    } catch (error) {
      console.error('Error recording achievement progress:', error)
      throw error
    }
  }

  async recordMetricProgress(args: {
    metric_key: string
    event_type: string
    delta?: number
    absolute_value?: number
    event_data?: Record<string, any>
    related_project_id?: string
    related_event_id?: string
    related_collaboration_id?: string
  }): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    await achievementEngine.recordMetricEvent({
      supabase: this.supabase,
      userId: user.id,
      metricKey: args.metric_key,
      eventType: args.event_type,
      delta: args.delta ?? 1,
      absoluteValue: args.absolute_value,
      eventData: args.event_data ?? {},
      relatedProjectId: args.related_project_id,
      relatedEventId: args.related_event_id,
      relatedCollaborationId: args.related_collaboration_id
    })
  }

  // =============================================
  // BADGES
  // =============================================

  async getUserBadges(userId: string): Promise<BadgesResponse> {
    try {
      const { data: badges, error: badgesError } = await this.supabase
        .from('badges')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (badgesError) throw badgesError

      const { data: userBadges, error: userBadgesError } = await this.supabase
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

  async getBadgeStats(userId: string): Promise<BadgeStats> {
    try {
      const { data: userBadges, error } = await this.supabase
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

  async grantBadge(request: BadgeGrantRequest): Promise<UserBadge> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await this.supabase
        .from('user_badges')
        .insert({
          user_id: request.user_id,
          badge_id: request.badge_id,
          granted_by: user.id,
          granted_reason: request.granted_reason,
          related_project_id: request.related_project_id,
          related_event_id: request.related_event_id,
          related_collaboration_id: request.related_collaboration_id,
          expires_at: request.expires_at
        })
        .select(`
          *,
          badge:badges(*),
          granted_by_user:profiles!user_badges_granted_by_fkey(id, username, full_name, avatar_url)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error granting badge:', error)
      throw error
    }
  }

  async revokeBadge(userBadgeId: string, reason?: string): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { error } = await this.supabase
        .from('user_badges')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          revocation_reason: reason
        })
        .eq('id', userBadgeId)

      if (error) throw error
    } catch (error) {
      console.error('Error revoking badge:', error)
      throw error
    }
  }

  // =============================================
  // ENDORSEMENTS
  // =============================================

  async getUserEndorsements(userId: string): Promise<EndorsementsResponse> {
    try {
      const { data: endorsementRows, error: endorsementsError } = await this.supabase
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
        const { data: skillRows } = await this.supabase
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
      const profileById = await this.fetchProfilesMap([...ids])

      const endorsements: Endorsement[] = rows.map((e: Endorsement) => ({
        ...e,
        endorser: e.endorser_id ? profileById[e.endorser_id] : undefined,
        endorsee: e.endorsee_id ? profileById[e.endorsee_id] : undefined
      }))

      const { data: skills, error: skillsError } = await this.supabase
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

  async getEndorsementStats(userId: string): Promise<EndorsementStats> {
    try {
      const { data: endorsements, error: endorsementsError } = await this.supabase
        .from('endorsements')
        .select('*')
        .eq('endorsee_id', userId)
        .eq('is_active', true)

      if (endorsementsError) throw endorsementsError

      const { data: skills, error: skillsError } = await this.supabase
        .from('user_skills')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (skillsError) throw skillsError

      // Calculate top skills
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

  async createEndorsement(request: SkillEndorsementRequest): Promise<Endorsement> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await this.supabase
        .from('endorsements')
        .insert({
          endorser_id: user.id,
          endorsee_id: request.endorsee_id,
          skill: request.skill,
          category: request.category,
          level: request.level,
          comment: request.comment,
          project_id: request.project_id,
          collaboration_id: request.collaboration_id,
          event_id: request.event_id,
          job_id: request.job_id
        })
        .select('*')
        .single()

      if (error) throw error
      const map = await this.fetchProfilesMap([data.endorser_id, data.endorsee_id])
      return {
        ...data,
        endorser: map[data.endorser_id],
        endorsee: map[data.endorsee_id]
      } as Endorsement
    } catch (error) {
      console.error('Error creating endorsement:', error)
      throw error
    }
  }

  async updateEndorsement(endorsementId: string, updates: Partial<SkillEndorsementRequest>): Promise<Endorsement> {
    try {
      const { data, error } = await this.supabase
        .from('endorsements')
        .update({
          level: updates.level,
          comment: updates.comment,
          category: updates.category,
          updated_at: new Date().toISOString()
        })
        .eq('id', endorsementId)
        .select('*')
        .single()

      if (error) throw error
      const map = await this.fetchProfilesMap([data.endorser_id, data.endorsee_id])
      return {
        ...data,
        endorser: map[data.endorser_id],
        endorsee: map[data.endorsee_id]
      } as Endorsement
    } catch (error) {
      console.error('Error updating endorsement:', error)
      throw error
    }
  }

  async deleteEndorsement(endorsementId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('endorsements')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', endorsementId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting endorsement:', error)
      throw error
    }
  }

  // =============================================
  // SKILLS
  // =============================================

  async getUserSkills(userId: string): Promise<UserSkill[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_skills')
        .select(`
          *,
          category:skill_categories(*),
          endorsements:endorsements(*)
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('is_primary_skill', { ascending: false })
        .order('endorsed_level', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching user skills:', error)
      throw error
    }
  }

  async addSkill(userId: string, request: SkillAddRequest): Promise<UserSkill> {
    try {
      const { data, error } = await this.supabase
        .from('user_skills')
        .insert({
          user_id: userId,
          skill_name: request.skill_name,
          category_id: request.category_id,
          self_assessed_level: request.self_assessed_level,
          description: request.description,
          years_experience: request.years_experience,
          is_primary_skill: request.is_primary_skill || false
        })
        .select(`
          *,
          category:skill_categories(*)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error adding skill:', error)
      throw error
    }
  }

  async updateSkill(userId: string, skillName: string, request: SkillUpdateRequest): Promise<UserSkill> {
    try {
      const { data, error } = await this.supabase
        .from('user_skills')
        .update({
          self_assessed_level: request.self_assessed_level,
          description: request.description,
          years_experience: request.years_experience,
          is_primary_skill: request.is_primary_skill,
          is_active: request.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('skill_name', skillName)
        .select(`
          *,
          category:skill_categories(*)
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating skill:', error)
      throw error
    }
  }

  async deleteSkill(userId: string, skillName: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_skills')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('skill_name', skillName)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting skill:', error)
      throw error
    }
  }

  async getSkillCategories(): Promise<SkillCategory[]> {
    try {
      const { data, error } = await this.supabase
        .from('skill_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error fetching skill categories:', error)
      throw error
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  async checkAndAwardAchievements(userId: string): Promise<void> {
    try {
      // This would implement the logic to check if a user qualifies for any achievements
      // based on their activity and progress
      // For now, this is a placeholder that would be called after significant user actions
      
      // Example: Check if user uploaded their first track
      // const { data: tracks } = await this.supabase
      //   .from('tracks')
      //   .select('id')
      //   .eq('user_id', userId)
      //   .limit(1)
      
      // if (tracks && tracks.length > 0) {
      //   await this.recordAchievementProgress({
      //     achievement_id: 'first-track-achievement-id',
      //     event_type: 'track_uploaded',
      //     event_value: 1
      //   })
      // }
    } catch (error) {
      console.error('Error checking achievements:', error)
      throw error
    }
  }

  async getPublicProfileAchievements(userId: string): Promise<{
    achievements: UserAchievement[]
    badges: UserBadge[]
    skills: UserSkill[]
    stats: {
      total_points: number
      completed_achievements: number
      total_badges: number
      total_endorsements: number
    }
  }> {
    try {
      const [achievementsResponse, badgesResponse, endorsementsResponse] = await Promise.all([
        this.getUserAchievements(userId),
        this.getUserBadges(userId),
        this.getUserEndorsements(userId)
      ])

      return {
        achievements: achievementsResponse.user_achievements.filter(ua => ua.is_completed),
        badges: badgesResponse.user_badges,
        skills: endorsementsResponse.skills,
        stats: {
          total_points: achievementsResponse.total_points,
          completed_achievements: achievementsResponse.completed_count,
          total_badges: badgesResponse.total_badges,
          total_endorsements: endorsementsResponse.total_endorsements
        }
      }
    } catch (error) {
      console.error('Error fetching public profile achievements:', error)
      throw error
    }
  }
}

// Export singleton instance
export const achievementService = new AchievementService() 