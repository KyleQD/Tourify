import { evaluateLocalSovereignty } from "../local-sovereignty-gate"

describe("evaluateLocalSovereignty",()=>{
 it("denies reserved powers",()=>expect(evaluateLocalSovereignty({requestedPower:"membership",delegatedPowers:["membership"],reservedPowers:["membership"],localDecisionStatus:"approved",delegationExpired:false}).allowed).toBe(false))
})
