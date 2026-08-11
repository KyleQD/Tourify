import { evaluatePhase21Activation } from "../lib/music/creator-memory-constellation/phase21-activation-gate";
const result = evaluatePhase21Activation({ approvedCharter:true, independentTrustCount:3, independentImplementationCount:2, mutualAidDrillPassed:true, restrictionConflictTestPassed:true, providerReplacementPassed:true, tourifyUnavailablePassed:true, unresolvedCriticalBlockers:0, orbitalDeploymentRequested:false });
if (!result.allowed) throw new Error(result.reasons.join(","));
