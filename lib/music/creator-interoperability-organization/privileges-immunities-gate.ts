export interface PrivilegeGateInput {
  legalInstrumentEffective: boolean
  hostJurisdiction: string
  beneficiaryClass: string
  functionalScope: string
  waiverAuthorityConfigured: boolean
  alternativeRemedyAvailable: boolean
}
export function evaluatePrivilege(input: PrivilegeGateInput) {
  const allowed = input.legalInstrumentEffective && Boolean(input.hostJurisdiction) && Boolean(input.beneficiaryClass) && Boolean(input.functionalScope) && input.waiverAuthorityConfigured && input.alternativeRemedyAvailable
  return { allowed, status: allowed ? "effective_exact_scope" : "not_applicable" }
}
