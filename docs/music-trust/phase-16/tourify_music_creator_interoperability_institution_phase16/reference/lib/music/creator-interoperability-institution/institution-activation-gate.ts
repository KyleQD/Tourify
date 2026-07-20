interface ActivationInput { legalBasisEffective:boolean; participantAuthorityVerified:boolean; organsOperational:boolean; hostReady:boolean; fundingApproved:boolean; oversightOperational:boolean; staffRemedyAvailable:boolean; privacyApproved:boolean; securityApproved:boolean; accessibilityApproved:boolean; competitionApproved:boolean; independentImplementations:number; independentOperators:number; tourifyUnavailableTestPassed:boolean; unresolvedCriticalBlockers:number; }
export function evaluateInstitutionActivation(input: ActivationInput) {
  const reasons:string[]=[];
  for (const [key,value] of Object.entries(input)) {
    if (key==='independentImplementations' && Number(value)<2) reasons.push(key);
    else if (key==='independentOperators' && Number(value)<2) reasons.push(key);
    else if (key==='unresolvedCriticalBlockers' && Number(value)>0) reasons.push(key);
    else if (typeof value==='boolean' && !value) reasons.push(key);
  }
  return { allowed:reasons.length===0, reasons };
}
