export const MUSIC_UPLOAD_POLICY_VERSION = "1.0.0"
export const HUMAN_MUSIC_POLICY_VERSION = "1.0.0"
export const MUSIC_ORIGIN_SCHEMA_VERSION = "1.0.0"
export const MUSIC_CERTIFICATION_STANDARD_VERSION = "1.0.0"

export const MUSIC_AI_USE_CATEGORIES = [
  "human_created",
  "assistive_ai",
  "materially_generated",
  "unknown",
] as const

export const MUSIC_TRAINING_USE_POLICIES = ["rights_reserved", "licensed_only", "opted_in"] as const
export const MUSIC_ORIGIN_STATUSES = ["not_recorded", "pending", "recorded", "failed", "superseded"] as const
export const MUSIC_CERTIFICATION_STATUSES = [
  "not_requested", "draft", "submitted", "in_review", "needs_information",
  "approved", "rejected", "withdrawn", "suspended", "revoked",
] as const

export type MusicAiUseCategory = (typeof MUSIC_AI_USE_CATEGORIES)[number]
export type MusicTrainingUsePolicy = (typeof MUSIC_TRAINING_USE_POLICIES)[number]
export type MusicOriginStatus = (typeof MUSIC_ORIGIN_STATUSES)[number]
export type MusicCertificationStatus = (typeof MUSIC_CERTIFICATION_STATUSES)[number]

export interface MusicDeclarationPayload {
  rights_confirmed?: boolean
  ai_use_category?: MusicAiUseCategory
  ai_tools?: string[]
  ai_disclosure_details?: string | null
  synthesized_voice_or_likeness?: boolean
  contributor_disclosures_confirmed?: boolean
  source_material_available?: boolean
  training_use_policy?: MusicTrainingUsePolicy
  accepted_music_upload_policy?: boolean
  accepted_human_music_policy?: boolean
  music_upload_policy_version?: string
  human_music_policy_version?: string
  declaration_idempotency_key?: string
}

export interface MusicPublicationTrustInput {
  rightsConfirmed: boolean
  aiUseCategory: MusicAiUseCategory
  policyVersionsAccepted: boolean
  isPublic: boolean
  moderationStatus?: string | null
  isVisible?: boolean | null
  previewReady?: boolean
  humanOnlyGateEnabled?: boolean
}

export function resolveMusicPublicationTrust(input: MusicPublicationTrustInput) {
  if (!input.isPublic) return { allowed: true, blockingReasons: [] as string[] }
  const blockingReasons: string[] = []
  if (!input.rightsConfirmed) blockingReasons.push("rights_confirmation_required")
  if (!input.policyVersionsAccepted) blockingReasons.push("music_policy_acceptance_required")
  if (input.aiUseCategory === "unknown") blockingReasons.push("ai_disclosure_required")
  if (input.humanOnlyGateEnabled !== false && input.aiUseCategory === "materially_generated") {
    blockingReasons.push("materially_generated_music_not_publicly_eligible")
  }
  if (input.moderationStatus && input.moderationStatus !== "approved") blockingReasons.push("moderation_approval_required")
  if (input.isVisible === false) blockingReasons.push("track_visibility_required")
  if (input.previewReady === false) blockingReasons.push("preview_not_ready")
  return { allowed: blockingReasons.length === 0, blockingReasons }
}

export interface MusicTrustDisplay {
  label: string
  tone: "neutral" | "info" | "success" | "warning" | "danger"
  showCertificationBadge: boolean
}

export function deriveMusicTrustDisplay(input: {
  originStatus?: MusicOriginStatus | null
  certificationStatus?: MusicCertificationStatus | null
  certificationLevel?: number | null
}): MusicTrustDisplay {
  const certificationStatus = input.certificationStatus || "not_requested"
  if (certificationStatus === "approved" && (input.certificationLevel || 0) > 0) {
    return { label: "Human-created certified", tone: "success", showCertificationBadge: true }
  }
  if (certificationStatus === "suspended" || certificationStatus === "revoked") {
    return {
      label: certificationStatus === "suspended" ? "Certification suspended" : "Certification revoked",
      tone: "danger",
      showCertificationBadge: false,
    }
  }
  if (["submitted", "in_review", "needs_information"].includes(certificationStatus)) {
    return {
      label: certificationStatus === "needs_information" ? "Certification needs information" : "Certification in review",
      tone: certificationStatus === "needs_information" ? "warning" : "info",
      showCertificationBadge: false,
    }
  }
  if (input.originStatus === "recorded") return { label: "Origin recorded", tone: "info", showCertificationBadge: false }
  if (input.originStatus === "pending") return { label: "Origin processing", tone: "neutral", showCertificationBadge: false }
  return { label: "Artist submitted", tone: "neutral", showCertificationBadge: false }
}

export function buildMusicTrustDto(track: Record<string, unknown>, publication?: { allowed: boolean; blockingReasons: string[] }) {
  const display = deriveMusicTrustDisplay({
    originStatus: (track.origin_status as MusicOriginStatus | null) || "not_recorded",
    certificationStatus: (track.certification_status as MusicCertificationStatus | null) || "not_requested",
    certificationLevel: Number(track.certification_level || 0),
  })
  return {
    origin_status: track.origin_status || "not_recorded",
    certification_status: track.certification_status || "not_requested",
    certification_level: Number(track.certification_level || 0),
    certification_public_id: track.certification_public_id || null,
    public_label: display.label,
    label_tone: display.tone,
    show_certification_badge: display.showCertificationBadge,
    public_eligible: publication?.allowed ?? Boolean(track.is_public),
    blocking_reasons: publication?.blockingReasons || [],
    legacy: Number(track.trust_schema_version || 0) === 0,
  }
}
