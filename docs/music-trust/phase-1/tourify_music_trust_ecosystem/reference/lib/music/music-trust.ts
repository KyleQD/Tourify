export const MUSIC_AI_USE_CATEGORIES = [
  "human_created",
  "assistive_ai",
  "materially_generated",
  "unknown",
] as const

export const MUSIC_TRAINING_USE_POLICIES = [
  "rights_reserved",
  "licensed_only",
  "opted_in",
] as const

export const MUSIC_ORIGIN_STATUSES = [
  "not_recorded",
  "pending",
  "recorded",
  "failed",
  "superseded",
] as const

export const MUSIC_CERTIFICATION_STATUSES = [
  "not_requested",
  "draft",
  "submitted",
  "in_review",
  "needs_information",
  "approved",
  "rejected",
  "withdrawn",
  "suspended",
  "revoked",
] as const

export type MusicAiUseCategory = (typeof MUSIC_AI_USE_CATEGORIES)[number]
export type MusicTrainingUsePolicy = (typeof MUSIC_TRAINING_USE_POLICIES)[number]
export type MusicOriginStatus = (typeof MUSIC_ORIGIN_STATUSES)[number]
export type MusicCertificationStatus = (typeof MUSIC_CERTIFICATION_STATUSES)[number]

export interface MusicPublicationTrustInput {
  rightsConfirmed: boolean
  aiUseCategory: MusicAiUseCategory
  policyVersionsAccepted: boolean
  isPublic: boolean
}

export interface MusicPublicationTrustResult {
  allowed: boolean
  blockingReasons: string[]
}

export interface MusicTrustDisplayInput {
  originStatus: MusicOriginStatus
  certificationStatus: MusicCertificationStatus
  certificationLevel: number
}

export interface MusicTrustDisplay {
  label: string
  tone: "neutral" | "info" | "success" | "warning" | "danger"
  showCertificationBadge: boolean
}

export function resolveMusicPublicationTrust({
  rightsConfirmed,
  aiUseCategory,
  policyVersionsAccepted,
  isPublic,
}: MusicPublicationTrustInput): MusicPublicationTrustResult {
  if (!isPublic) {
    return { allowed: true, blockingReasons: [] }
  }

  const blockingReasons: string[] = []

  if (!rightsConfirmed) {
    blockingReasons.push("rights_confirmation_required")
  }

  if (!policyVersionsAccepted) {
    blockingReasons.push("music_policy_acceptance_required")
  }

  if (aiUseCategory === "unknown") {
    blockingReasons.push("ai_disclosure_required")
  }

  if (aiUseCategory === "materially_generated") {
    blockingReasons.push("materially_generated_music_not_publicly_eligible")
  }

  return {
    allowed: blockingReasons.length === 0,
    blockingReasons,
  }
}

export function deriveMusicTrustDisplay({
  originStatus,
  certificationStatus,
  certificationLevel,
}: MusicTrustDisplayInput): MusicTrustDisplay {
  if (certificationStatus === "approved" && certificationLevel > 0) {
    return {
      label: "Human-created certified",
      tone: "success",
      showCertificationBadge: true,
    }
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

  if (originStatus === "recorded") {
    return {
      label: "Origin recorded",
      tone: "info",
      showCertificationBadge: false,
    }
  }

  if (originStatus === "pending") {
    return {
      label: "Origin processing",
      tone: "neutral",
      showCertificationBadge: false,
    }
  }

  return {
    label: "Artist submitted",
    tone: "neutral",
    showCertificationBadge: false,
  }
}
