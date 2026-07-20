/**
 * Recoveries and claim payments hand off to Phase 3 royalty ledger.
 * Never rewrite posted journals; emit compensating handoff intents only.
 */

export interface Phase3RecoveryHandoffIntent {
  source: "music_rights_admin"
  caseId: string
  claimId?: string
  settlementId?: string
  amountMinor?: number
  currency?: string
  note: string
}

export function buildPhase3RecoveryHandoff(input: {
  caseId: string
  claimId?: string
  settlementId?: string
  amountMinor?: number
  currency?: string
}): Phase3RecoveryHandoffIntent {
  return {
    source: "music_rights_admin",
    caseId: input.caseId,
    claimId: input.claimId,
    settlementId: input.settlementId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    note: "Handoff intent only; Phase 3 ledger remains source of truth. No silent journal overwrite.",
  }
}
