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

export function validateCertificationTransition(from: MusicCertificationStatus, to: MusicCertificationStatus) {
  return ALLOWED_TRANSITIONS[from].includes(to)
    ? { allowed: true as const }
    : { allowed: false as const, reason: `certification_transition_not_allowed:${from}:${to}` }
}

export function certificationIsPubliclyActive(status: MusicCertificationStatus) {
  return status === "approved"
}

export function evidenceIsMutable(status: MusicCertificationStatus) {
  return status === "draft" || status === "needs_information"
}
