import type { ConsentScope, IntelligencePurpose } from "./rights-intelligence-domain"

export interface ResolveConsentInput {
  consents: ConsentScope[]
  subjectId: string
  purpose: IntelligencePurpose
  nowIso: string
}

export interface ConsentDecision {
  allowed: boolean
  reason: "active" | "missing" | "expired"
}

export function resolveConsent(input: ResolveConsentInput): ConsentDecision {
  const now = Date.parse(input.nowIso)
  const match = input.consents.find((consent) =>
    consent.subjectId === input.subjectId && consent.purpose === input.purpose,
  )
  if (!match) return { allowed: false, reason: "missing" }
  if (match.expiresAt && Date.parse(match.expiresAt) <= now) {
    return { allowed: false, reason: "expired" }
  }
  return { allowed: true, reason: "active" }
}
