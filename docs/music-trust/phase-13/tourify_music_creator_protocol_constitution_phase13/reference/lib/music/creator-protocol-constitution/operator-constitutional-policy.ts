export interface OperatorInput {
  accreditationStatus: "approved" | "suspended" | "expired" | "revoked"
  jurisdictionApproved: boolean
  serviceLevelsCurrent: boolean
  independentKeys: boolean
  exitPackageCurrent: boolean
  constitutionalConflict: boolean
}
export function evaluateOperator(input:OperatorInput){
 const reasons:string[]=[]
 if(input.accreditationStatus!=="approved") reasons.push("OPERATOR_NOT_APPROVED")
 if(!input.jurisdictionApproved) reasons.push("JURISDICTION_NOT_APPROVED")
 if(!input.serviceLevelsCurrent) reasons.push("SERVICE_LEVEL_EVIDENCE_STALE")
 if(!input.independentKeys) reasons.push("KEY_CONTROL_NOT_INDEPENDENT")
 if(!input.exitPackageCurrent) reasons.push("EXIT_PACKAGE_STALE")
 if(input.constitutionalConflict) reasons.push("CONSTITUTIONAL_CONFLICT")
 return {allowed:reasons.length===0,reasons}
}
