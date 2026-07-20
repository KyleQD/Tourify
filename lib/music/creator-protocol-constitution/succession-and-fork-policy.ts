export interface SuccessionInput {
  trigger: "planned" | "incapacity" | "insolvency" | "capture" | "security_failure" | "fork"
  approvedAuthorityChain: boolean
  successorQualified: boolean
  continuityPackageCurrent: boolean
  localExitAvailable: boolean
  assetScheduleVerified: boolean
}
export function evaluateSuccession(input: SuccessionInput){
  const reasons:string[]=[]
  if(!input.approvedAuthorityChain) reasons.push("AUTHORITY_CHAIN_MISSING")
  if(!input.successorQualified) reasons.push("SUCCESSOR_NOT_QUALIFIED")
  if(!input.continuityPackageCurrent) reasons.push("CONTINUITY_PACKAGE_STALE")
  if(!input.localExitAvailable) reasons.push("LOCAL_EXIT_REQUIRED")
  if(!input.assetScheduleVerified) reasons.push("ASSET_SCHEDULE_UNVERIFIED")
  return {allowed:reasons.length===0,reasons}
}
