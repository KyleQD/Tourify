import { rankUsageCandidates, type UsageCandidate } from "./usage-match"

export const RIGHTS_ADMIN_DISCLAIMER =
  "A Rights Passport or license is not an administration mandate. Matches and confidence scores are not infringement findings. No automated takedown or monetization claim is sent from fingerprint/metadata/AI alone. Tourify is not a CMO, PRO, publisher, label, fiduciary, counsel, or court."

export interface OutboundActionGateInput {
  hasActiveMandate: boolean
  humanReviewed: boolean
  automatedSubmissionEnabled: boolean
  autoTakedownEnabled: boolean
  action: "register" | "claim" | "monetize" | "takedown" | "legal_threat"
  matchConfidence?: number
}

export interface OutboundActionGateResult {
  allowed: boolean
  reason: string
}

/**
 * Hard stop: never send takedown/claim/legal threat from technical match alone.
 */
export function evaluateOutboundActionGate(input: OutboundActionGateInput): OutboundActionGateResult {
  if (!input.hasActiveMandate)
    return { allowed: false, reason: "no_active_mandate" }

  if (input.action === "takedown" || input.action === "legal_threat" || input.action === "monetize") {
    if (input.autoTakedownEnabled)
      return { allowed: false, reason: "auto_takedown_flag_must_remain_off_without_counsel" }
    if (!input.humanReviewed)
      return { allowed: false, reason: "human_review_required" }
  }

  if ((input.action === "register" || input.action === "claim") && !input.humanReviewed) {
    if (!input.automatedSubmissionEnabled)
      return { allowed: false, reason: "automated_submission_disabled" }
    if ((input.matchConfidence ?? 0) < 0.98)
      return { allowed: false, reason: "match_confidence_requires_manual_review" }
  }

  if (!input.humanReviewed && input.action !== "register")
    return { allowed: false, reason: "human_review_required" }

  return { allowed: true, reason: "approved" }
}

export function classifyMatchForAction(candidates: UsageCandidate[]): {
  decision: "auto_candidate" | "manual_review" | "no_match"
  mayAutoAct: boolean
} {
  const match = rankUsageCandidates(candidates)
  return {
    decision: match.decision,
    // Even auto_candidate never auto-sends takedown/claim without separate gates
    mayAutoAct: false,
  }
}
