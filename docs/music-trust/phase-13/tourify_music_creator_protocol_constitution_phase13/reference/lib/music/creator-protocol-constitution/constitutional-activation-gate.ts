export interface ActivationEvidence {
  entityApproved:boolean; charterRatified:boolean; localOrganizations:number; independentImplementations:number; independentOperators:number;
  appealsOperational:boolean; successionTested:boolean; tourifyUnavailableTested:boolean; securityApproved:boolean; privacyApproved:boolean;
  accessibilityApproved:boolean; fundingApproved:boolean; unresolvedCriticalBlockers:number;
}
export function evaluateConstitutionalActivation(e:ActivationEvidence){
 const reasons:string[]=[]
 if(!e.entityApproved) reasons.push("ENTITY_NOT_APPROVED")
 if(!e.charterRatified) reasons.push("CHARTER_NOT_RATIFIED")
 if(e.localOrganizations<2) reasons.push("INSUFFICIENT_LOCAL_ORGANIZATIONS")
 if(e.independentImplementations<2) reasons.push("INSUFFICIENT_IMPLEMENTATIONS")
 if(e.independentOperators<2) reasons.push("INSUFFICIENT_OPERATORS")
 if(!e.appealsOperational) reasons.push("APPEALS_NOT_OPERATIONAL")
 if(!e.successionTested) reasons.push("SUCCESSION_NOT_TESTED")
 if(!e.tourifyUnavailableTested) reasons.push("TOURIFY_UNAVAILABLE_TEST_MISSING")
 if(!e.securityApproved||!e.privacyApproved||!e.accessibilityApproved||!e.fundingApproved) reasons.push("REQUIRED_APPROVAL_MISSING")
 if(e.unresolvedCriticalBlockers>0) reasons.push("CRITICAL_BLOCKERS_REMAIN")
 return {allowed:reasons.length===0,reasons}
}
