export type AgreementEffectivenessStatus =
  | "draft"
  | "pending_signatures"
  | "executed"
  | "effective"
  | "suspended"
  | "terminated"
  | "expired"
  | "amended"

export interface DeliveryGateInput {
  agreementStatus: AgreementEffectivenessStatus
  conditionsSatisfied: boolean
  paymentRequired: boolean
  paymentConfirmed: boolean
  purpose: "preview" | "final" | "stem" | "artwork" | "other"
}

export interface DeliveryGateResult {
  allowed: boolean
  holdReason?: string
}

/**
 * Preview and search are never licences. Final/stem delivery requires an effective agreement.
 */
export function evaluateDeliveryGate(input: DeliveryGateInput): DeliveryGateResult {
  if (input.purpose === "preview")
    return { allowed: false, holdReason: "preview_is_not_a_licence" }

  if (input.agreementStatus !== "effective")
    return { allowed: false, holdReason: "agreement_not_effective" }

  if (!input.conditionsSatisfied)
    return { allowed: false, holdReason: "conditions_not_satisfied" }

  if (input.paymentRequired && !input.paymentConfirmed)
    return { allowed: false, holdReason: "payment_not_confirmed" }

  return { allowed: true }
}

export const LICENSING_DISCLAIMER =
  "Quotes, approvals, deposits, and delivery previews are not licences. Only an executed, effective agreement authorizes use. Tourify is not a CMO, PRO, publisher, label, insurer, counsel, or bank."
