// Achievement, Badge, and Endorsement System Types

export interface Achievement {
  id: string
  name: string
  description: string
  category: AchievementCategory
  subcategory?: string
  icon: string
  color: string
  bg_color: string
  border_color: string
  requirements: Record<string, any>
  /** Canonical metric key used by the evaluator engine */
  metric_key?: string
  /** Optional denormalized target value (fallback to requirements.target) */
  target_value?: number
  /** How progress is evaluated: increment from events or absolute snapshot values */
  evaluation_mode?: 'increment' | 'absolute'
  /** Tier/level inside a family of achievements */
  level?: number
  /** Family key for grouped/tiered rendering */
  group_key?: string
  /** Catalog version for migrations/seed updates */
  catalog_version?: number
  points: number
  rarity: AchievementRarity
  is_active: boolean
  is_hidden: boolean
  display_order: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface UserAchievement {
  id: string
  user_id: string
  achievement_id: string
  progress_percentage: number
  is_completed: boolean
  completed_at?: string
  current_value: number
  target_value: number
  progress_data: Record<string, any>
  related_project_id?: string
  related_event_id?: string
  related_collaboration_id?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  // Joined data
  achievement?: Achievement
}

export interface Badge {
  id: string
  name: string
  description: string
  category: BadgeCategory
  subcategory?: string
  icon: string
  color: string
  bg_color: string
  border_color: string
  level: number
  rarity: BadgeRarity
  is_verification_badge: boolean
  is_auto_granted: boolean
  requirements: Record<string, any>
  auto_grant_conditions: Record<string, any>
  is_active: boolean
  display_order: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  is_active: boolean
  granted_at: string
  expires_at?: string
  revoked_at?: string
  granted_by?: string
  granted_reason?: string
  revoked_by?: string
  revocation_reason?: string
  related_project_id?: string
  related_event_id?: string
  related_collaboration_id?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  // Joined data
  badge?: Badge
  granted_by_user?: {
    id: string
    username: string
    full_name?: string
    avatar_url?: string
  }
}

export interface Endorsement {
  id: string
  endorser_id: string
  endorsee_id: string
  skill: string
  category?: EndorsementCategory
  level: number
  comment?: string
  project_id?: string
  collaboration_id?: string
  event_id?: string
  job_id?: string
  is_verified: boolean
  verified_by?: string
  verified_at?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined data
  endorser?: {
    id: string
    username: string
    full_name?: string
    avatar_url?: string
  }
  endorsee?: {
    id: string
    username: string
    full_name?: string
    avatar_url?: string
  }
}

export interface SkillCategory {
  id: string
  name: string
  description?: string
  icon?: string
  color: string
  parent_category_id?: string
  display_order: number
  is_active: boolean
  created_at: string
  // Joined data
  parent_category?: SkillCategory
  subcategories?: SkillCategory[]
}

export interface UserSkill {
  id: string
  user_id: string
  skill_name: string
  category_id?: string
  self_assessed_level?: number
  endorsed_level: number
  total_endorsements: number
  description?: string
  years_experience?: number
  is_primary_skill: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined data
  category?: SkillCategory
  endorsements?: Endorsement[]
}

export interface AchievementProgressEvent {
  id: string
  user_id: string
  achievement_id?: string
  event_type: string
  event_value: number
  metric_key?: string
  metric_value?: number
  event_source?: string
  event_data: Record<string, any>
  related_project_id?: string
  related_event_id?: string
  related_collaboration_id?: string
  created_at: string
}

// Enums
export type AchievementCategory = 
  | 'music' 
  | 'performance' 
  | 'collaboration' 
  | 'business' 
  | 'community' 
  | 'technical' 
  | 'creative' 
  | 'leadership' 
  | 'innovation' 
  | 'milestone'

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type BadgeCategory = 
  | 'verification' 
  | 'expertise' 
  | 'specialization' 
  | 'recognition' 
  | 'partnership' 
  | 'certification' 
  | 'award' 
  | 'milestone' 
  | 'community' 
  | 'custom'

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type EndorsementCategory = 
  | 'technical' 
  | 'creative' 
  | 'business' 
  | 'interpersonal' 
  | 'leadership' 
  | 'specialized'

// Achievement Requirements Types
export interface AchievementRequirements {
  // Music achievements
  tracks_uploaded?: number
  track_streams?: number
  albums_released?: number
  total_streams?: number
  
  // Performance achievements
  performances_completed?: number
  festival_headlines?: number
  sold_out_shows?: number
  
  // Collaboration achievements
  collaborations_completed?: number
  genres_collaborated?: number
  
  // Business achievements
  paying_clients?: number
  total_earnings?: number
  media_features?: number
  
  // Community achievements
  artists_helped?: number
  artists_mentored?: number
  community_size?: number
  
  // Generic achievements
  projects_completed?: number
  events_attended?: number
  reviews_received?: number
  average_rating?: number
  platform_years?: number
}

// Badge Requirements Types
export interface BadgeRequirements {
  verification_status?: string
  skills?: string[]
  experience_years?: number
  projects_completed?: number
  events_worked?: number
  average_rating?: number
  minimum_reviews?: number
  client_satisfaction?: number
  minimum_clients?: number
  industry_recognition?: boolean
  partnership_status?: string
  partnership_tier?: string
  platform_years?: number
}

// API Response Types
export interface AchievementsResponse {
  achievements: Achievement[]
  user_achievements: UserAchievement[]
  total_points: number
  completed_count: number
  total_count: number
}

export interface BadgesResponse {
  badges: Badge[]
  user_badges: UserBadge[]
  total_badges: number
  verification_badges: UserBadge[]
  expertise_badges: UserBadge[]
  recognition_badges: UserBadge[]
}

export interface EndorsementsResponse {
  endorsements: Endorsement[]
  skills: UserSkill[]
  total_endorsements: number
  average_level: number
}

export interface SkillEndorsementRequest {
  endorsee_id: string
  skill: string
  level: number
  comment?: string
  category?: EndorsementCategory
  project_id?: string
  collaboration_id?: string
  event_id?: string
  job_id?: string
}

export interface AchievementProgressRequest {
  achievement_id?: string
  metric_key?: string
  metric_value?: number
  evaluation_mode?: 'increment' | 'absolute'
  event_type: string
  event_value?: number
  event_data?: Record<string, any>
  related_project_id?: string
  related_event_id?: string
  related_collaboration_id?: string
}

// Utility Types
export interface AchievementStats {
  total_achievements: number
  completed_achievements: number
  total_points: number
  rarity_breakdown: Record<AchievementRarity, number>
  category_breakdown: Record<AchievementCategory, number>
}

export interface BadgeStats {
  total_badges: number
  verification_badges: number
  expertise_badges: number
  recognition_badges: number
  rarity_breakdown: Record<BadgeRarity, number>
  category_breakdown: Record<BadgeCategory, number>
}

export interface EndorsementStats {
  total_endorsements: number
  unique_skills: number
  average_level: number
  top_skills: Array<{
    skill: string
    level: number
    endorsements: number
  }>
  category_breakdown: Record<EndorsementCategory, number>
}

// Component Props Types
export interface AchievementCardProps {
  achievement: Achievement
  userAchievement?: UserAchievement
  showProgress?: boolean
  onClick?: () => void
}

export interface BadgeCardProps {
  badge: Badge
  userBadge?: UserBadge
  showDetails?: boolean
  onClick?: () => void
}

export interface EndorsementCardProps {
  endorsement: Endorsement
  showEndorser?: boolean
  showActions?: boolean
  onEndorse?: (skill: string, level: number, comment?: string) => void
}

export interface SkillCardProps {
  skill: UserSkill
  showEndorsements?: boolean
  showActions?: boolean
  onEndorse?: (level: number, comment?: string) => void
}

// Achievement Progress Tracking
export interface AchievementProgress {
  achievement_id: string
  current_value: number
  target_value: number
  progress_percentage: number
  is_completed: boolean
  requirements_met: Record<string, boolean>
  next_milestone?: {
    value: number
    description: string
  }
}

// Badge Granting
export interface BadgeGrantRequest {
  badge_id: string
  user_id: string
  granted_reason?: string
  related_project_id?: string
  related_event_id?: string
  related_collaboration_id?: string
  expires_at?: string
}

// Skill Management
export interface SkillAddRequest {
  skill_name: string
  category_id?: string
  self_assessed_level?: number
  description?: string
  years_experience?: number
  is_primary_skill?: boolean
}

export interface SkillUpdateRequest {
  skill_name: string
  self_assessed_level?: number
  description?: string
  years_experience?: number
  is_primary_skill?: boolean
  is_active?: boolean
} 