import type { MusicCertificationStatus } from "./music-trust"

const ALLOWED_TRANSITIONS: Record<MusicCertificationStatus, MusicCertificationStatus[]> = {
  not_requested: ["draft"],
  draft: ["submitted", "withdrawn"],
  submitted: ["in_review", "withdrawn"],
  in_review: ["needs_information", "approved", "rejected"],
  needs_information: ["submitted", "withdrawn", "rejected"],
  approved: ["suspended", "revoked"],
  rejected: ["draft"],
  withdrawn: ["draft"],
  suspended: ["approved", "revoked"],
  revoked: [],
}

export interface CertificationTransitionInput {
  from: MusicCertificationStatus
  to: MusicCertificationStatus
}

export interface CertificationTransitionResult {
  allowed: boolean
  reason?: string
}

export function validateCertificationTransition({
  from,
  to,
}: CertificationTransitionInput): CertificationTransitionResult {
  const allowed = ALLOWED_TRANSITIONS[from].includes(to)

  if (allowed) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: `certification_transition_not_allowed:${from}:${to}`,
  }
}

export function certificationIsPubliclyActive(status: MusicCertificationStatus): boolean {
  return status === "approved"
}
