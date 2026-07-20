import { evaluateConstitutionalActivation } from "../constitutional-activation-gate"

describe("evaluateConstitutionalActivation",()=>{
 it("denies incomplete activation",()=>expect(evaluateConstitutionalActivation({entityApproved:true,charterRatified:true,localOrganizations:1,independentImplementations:1,independentOperators:1,appealsOperational:false,successionTested:false,tourifyUnavailableTested:false,securityApproved:true,privacyApproved:true,accessibilityApproved:true,fundingApproved:true,unresolvedCriticalBlockers:0}).allowed).toBe(false))
})
