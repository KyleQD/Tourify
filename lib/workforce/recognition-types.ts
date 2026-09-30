export interface ProgressionLevel { level: number; label: string; credits: number; contexts: number; employers: number }
export interface RoleBadge {
  badge_key: string; label: string; credits: number; contexts: number; employers: number
  level: number; level_label: string; next_level: ProgressionLevel | null; model_version: number
}
export interface RoleEndorsement {
  id: string; role_key: string; role_label: string; endorsement: string
  verified_at: string; expires_at: string; verification: string
}
export interface Advancement {
  badge_key: string; previous_level: number; new_level: number; occurred_at: string; reason: string
}
export interface RecognitionProfile {
  badges: RoleBadge[]; endorsements: RoleEndorsement[]; history: Advancement[]; is_public: boolean
}
export interface CompletionAssignment {
  id: string; user_id: string; role_title: string; role_key: string | null
  status: string; starts_at: string | null; ends_at: string | null; event_id: string | null; tour_id: string | null
}
export interface VerifiedRoleCredit {
  id: string; assignment_id: string; user_id: string; role_key: string; verified_by: string
  verified_at: string; endorsement: string; evidence: string; endorsement_expires_at: string
  revoked_at: string | null; revocation_reason: string | null
}
export interface ManagerRecognition { assignments: CompletionAssignment[]; credits: VerifiedRoleCredit[] }
