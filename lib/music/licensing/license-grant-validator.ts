import type { ClearanceLeg, LicenseScope } from "./licensing-domain"
export interface ValidateGrantInput { scope: LicenseScope; legs: ClearanceLeg[]; agreementExecuted: boolean; conditionsSatisfied: boolean; paymentRequired: boolean; paymentConfirmed: boolean }
export interface GrantValidation { effective: boolean; errors: string[] }
export function validateLicenseGrant(input: ValidateGrantInput): GrantValidation {
  const errors: string[] = []
  if (!input.agreementExecuted) errors.push("agreement_not_executed")
  if (!input.conditionsSatisfied) errors.push("conditions_not_satisfied")
  if (input.paymentRequired && !input.paymentConfirmed) errors.push("payment_not_confirmed")
  for (const leg of input.legs) if (leg.status !== "satisfied" && leg.status !== "not_applicable") errors.push(`clearance_leg_${leg.id}_${leg.status}`)
  if (!input.scope.territories.length || !input.scope.media.length || !input.scope.uses.length) errors.push("scope_incomplete")
  return { effective: errors.length === 0, errors }
}
