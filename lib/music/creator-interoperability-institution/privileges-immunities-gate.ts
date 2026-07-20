interface PrivilegeInput { legalInstrumentEffective:boolean; jurisdiction:string; coveredJurisdictions:string[]; beneficiaryCovered:boolean; functionNecessary:boolean; alternativeRemedyAvailable:boolean; }
export function evaluatePrivilege(input: PrivilegeInput) {
  const reasons:string[]=[]
  if (!input.legalInstrumentEffective) reasons.push('instrument_not_effective')
  if (!input.coveredJurisdictions.includes(input.jurisdiction)) reasons.push('jurisdiction_not_covered')
  if (!input.beneficiaryCovered) reasons.push('beneficiary_not_covered')
  if (!input.functionNecessary) reasons.push('functional_necessity_missing')
  if (!input.alternativeRemedyAvailable) reasons.push('alternative_remedy_missing')
  return { allowed:reasons.length===0, reasons }
}
