import { describe, expect, it } from "vitest";
import { canActivatePhase20 } from "../lib/music/creator-cultural-memory-trust/phase20-activation-gate";
describe("activation",()=>{it("fails closed",()=>expect(canActivatePhase20({legalEntity:true,charterEffective:true,communityGovernance:true,multipleCustodians:true,independentImplementations:true,restorePassed:true,restrictionPropagationPassed:true,providerReplacementPassed:true,tourifyUnavailablePassed:false,unresolvedCriticalBlockers:0})).toBe(false));});
