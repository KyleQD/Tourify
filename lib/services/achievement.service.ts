import { supabase } from '@/lib/supabase'
import {
  achievementReads,
  fetchProfilesMap,
} from '@/lib/achievements/achievement-reads'
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
import { achievementEngine, resolveTarget, awardUnlockedAchievementRewards } from '@/lib/services/achievement-engine.service'
import type { AchievementRow } from '@/lib/services/achievement-engine.service'

export class AchievementService {
  private readonly supabase = supabase

  // =============================================
  // ACHIEVEMENTS
  // =============================================

  async getUserAchievements(userId: string): Promise<AchievementsResponse> {
    return achievementReads.getUserAchievements(userId)
  }

  async getAchievementStats(userId: string): Promise<AchievementStats> {
    return achievementReads.getAchievementStats(userId)
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
    return achievementReads.getUserBadges(userId)
  }

  async getBadgeStats(userId: string): Promise<BadgeStats> {
    return achievementReads.getBadgeStats(userId)
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
    return achievementReads.getUserEndorsements(userId)
  }

  async getVerifiedEndorsementsForVetting(userId: string): Promise<Endorsement[]> {
    const { data: rows, error } = await this.supabase
      .from('endorsements')
      .select('*')
      .eq('endorsee_id', userId)
      .eq('is_active', true)
      .eq('is_verified', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    const ids = new Set<string>()
    ;(rows || []).forEach((endorsement: any) => {
      if (endorsement.endorser_id) ids.add(endorsement.endorser_id)
      if (endorsement.endorsee_id) ids.add(endorsement.endorsee_id)
    })

    const profileById = await fetchProfilesMap([...ids])

    return (rows || []).map((endorsement: Endorsement) => ({
      ...endorsement,
      endorser: endorsement.endorser_id ? profileById[endorsement.endorser_id] : undefined,
      endorsee: endorsement.endorsee_id ? profileById[endorsement.endorsee_id] : undefined,
    }))
  }

  async getEndorsementStats(userId: string): Promise<EndorsementStats> {
    return achievementReads.getEndorsementStats(userId)
  }

  async createEndorsement(request: SkillEndorsementRequest): Promise<Endorsement> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const hasWorkContext = !!(
        request.job_id ||
        request.event_id ||
        request.collaboration_id ||
        request.project_id
      )

      let isVerified = hasWorkContext
      let verifiedBy: string | null = hasWorkContext ? user.id : null
      let verifiedAt: string | null = hasWorkContext ? new Date().toISOString() : null

      // If no explicit context, check whether endorser/endorsee already share completed work.
      if (!hasWorkContext) {
        const shared = await this.findSharedWorkContext(user.id, request.endorsee_id)
        if (shared) {
          isVerified = true
          verifiedBy = user.id
          verifiedAt = new Date().toISOString()
          if (shared.job_id) request.job_id = shared.job_id
          if (shared.event_id) request.event_id = shared.event_id
          if (shared.collaboration_id) request.collaboration_id = shared.collaboration_id
        }
      }

      const { data, error } = await this.supabase
        .from('endorsements')
        .upsert(
          {
            endorser_id: user.id,
            endorsee_id: request.endorsee_id,
            skill: request.skill,
            category: request.category,
            level: request.level ?? 3,
            comment: request.comment,
            project_id: request.project_id,
            collaboration_id: request.collaboration_id,
            event_id: request.event_id,
            job_id: request.job_id,
            is_verified: isVerified,
            verified_by: verifiedBy,
            verified_at: verifiedAt,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'endorser_id,endorsee_id,skill' }
        )
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

  /** Best-effort lookup for shared job/event/collaboration between two users. */
  private async findSharedWorkContext(
    endorserId: string,
    endorseeId: string
  ): Promise<{ job_id?: string; event_id?: string; collaboration_id?: string } | null> {
    try {
      const { data: rosterRows } = await this.supabase
        .from('hiring_candidates')
        .select('job_posting_id, user_id, status')
        .in('user_id', [endorserId, endorseeId])
        .in('status', ['approved', 'hired', 'active', 'onboarded'])
        .limit(40)

      if (rosterRows?.length) {
        const byJob = new Map<string, Set<string>>()
        for (const row of rosterRows) {
          const jobId = row.job_posting_id as string | null
          const userId = row.user_id as string | null
          if (!jobId || !userId) continue
          const set = byJob.get(jobId) || new Set<string>()
          set.add(userId)
          byJob.set(jobId, set)
        }
        for (const [jobId, users] of byJob.entries()) {
          if (users.has(endorserId) && users.has(endorseeId)) {
            return { job_id: jobId }
          }
        }
      }
    } catch {
      // Table may not exist in all environments — ignore.
    }

    try {
      const { data: collabRows } = await this.supabase
        .from('collaborations')
        .select('id, creator_id, collaborator_id, status')
        .or(
          `and(creator_id.eq.${endorserId},collaborator_id.eq.${endorseeId}),and(creator_id.eq.${endorseeId},collaborator_id.eq.${endorserId})`
        )
        .in('status', ['completed', 'active', 'accepted'])
        .limit(1)

      if (collabRows?.[0]?.id) {
        return { collaboration_id: collabRows[0].id as string }
      }
    } catch {
      // Optional table
    }

    return null
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

  async checkAndAwardAchievements(userId: string): Promise<Achievement[]> {
    try {
      const [
        postsResult,
        eventsAsOrganizerResult,
        eventsAsArtistResult,
        followersResult,
        profileResult,
        tracksResult,
      ] = await Promise.all([
        this.supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
        this.supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('organizer_id', userId),
        this.supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('artist_id', userId),
        this.supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', userId),
        this.supabase
          .from('profiles')
          .select('avatar_url, bio, location, full_name')
          .eq('id', userId)
          .maybeSingle(),
        this.supabase
          .from('tracks')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId),
      ])

      const profile = profileResult.data
      const profileFields = [profile?.avatar_url, profile?.bio, profile?.location, profile?.full_name]
      const filledFields = profileFields.filter(Boolean).length
      const profileComplete = filledFields === profileFields.length ? 100 : Math.round((filledFields / profileFields.length) * 100)

      const eventsCreated = (eventsAsOrganizerResult.count ?? 0) + (eventsAsArtistResult.count ?? 0)

      const stats: Record<string, number> = {
        posts_count: postsResult.count ?? 0,
        events_created: eventsCreated,
        followers_count: followersResult.count ?? 0,
        profile_completeness: profileComplete,
        tracks_uploaded: tracksResult.count ?? 0,
      }

      const { data: achievements, error: achievementsError } = await this.supabase
        .from('achievements')
        .select('id, name, requirements, metric_key, target_value, evaluation_mode, points')
        .eq('is_active', true)

      if (achievementsError || !achievements?.length) return []

      const { data: existingRows } = await this.supabase
        .from('user_achievements')
        .select('achievement_id, is_completed, current_value')
        .eq('user_id', userId)

      const existingMap = new Map(
        (existingRows || []).map(r => [r.achievement_id, r])
      )

      const newlyAwarded: AchievementRow[] = []
      const nowIso = new Date().toISOString()

      for (const achievement of achievements as AchievementRow[]) {
        const existing = existingMap.get(achievement.id)
        if (existing?.is_completed) continue

        const metricKey = achievement.metric_key
          || achievement.requirements?.metric_key
        if (!metricKey || stats[metricKey] === undefined) continue

        const currentStatValue = stats[metricKey]
        const target = resolveTarget(achievement)
        const prevValue = Number(existing?.current_value ?? 0)
        const nextValue = Math.max(prevValue, currentStatValue)
        const progressPercentage = Math.min(100, Math.round((nextValue / target) * 100))
        const isCompleted = nextValue >= target

        const { error: upsertError } = await this.supabase
          .from('user_achievements')
          .upsert(
            {
              user_id: userId,
              achievement_id: achievement.id,
              current_value: nextValue,
              target_value: target,
              progress_percentage: progressPercentage,
              is_completed: isCompleted,
              completed_at: isCompleted ? nowIso : null,
              updated_at: nowIso,
            },
            { onConflict: 'user_id,achievement_id' }
          )

        if (!upsertError && isCompleted) {
          newlyAwarded.push(achievement)
        }
      }

      if (newlyAwarded.length > 0) {
        await awardUnlockedAchievementRewards({
          supabase: this.supabase,
          userId,
          unlockedAchievements: newlyAwarded,
        })
      }

      if (!newlyAwarded.length) return []

      const { data: fullAchievements } = await this.supabase
        .from('achievements')
        .select('*')
        .in('id', newlyAwarded.map(a => a.id))

      return (fullAchievements || []) as Achievement[]
    } catch (error) {
      console.error('Error checking achievements:', error)
      return []
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