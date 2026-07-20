/**
 * Licensing invoices/usage hand off to Phase 3 royalty ledger.
 * Never rewrite posted journals; emit compensating handoff intents only.
 */

export interface Phase3HandoffIntent {
  source: "music_licensing"
  agreementId: string
  usageReportId?: string
  invoiceId?: string
  amountMinor?: number
  currency?: string
  note: string
}

export function buildPhase3RoyaltyHandoff(input: {
  agreementId: string
  usageReportId?: string
  invoiceId?: string
  amountMinor?: number
  currency?: string
}): Phase3HandoffIntent {
  return {
    source: "music_licensing",
    agreementId: input.agreementId,
    usageReportId: input.usageReportId,
    invoiceId: input.invoiceId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    note: "Handoff intent only; Phase 3 ledger remains source of truth. No silent journal overwrite.",
  }
}
