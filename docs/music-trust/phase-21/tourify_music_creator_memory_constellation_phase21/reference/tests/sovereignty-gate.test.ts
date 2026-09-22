import { evaluateSovereigntyGate } from "../lib/music/creator-memory-constellation/sovereignty-gate";
const result = evaluateSovereigntyGate({ requestedScope:["temporary_preservation"], delegatedScopes:["temporary_preservation"], reservedScopes:["permanent_transfer"], authorityCurrent:true, localDecisionConflict:false });
if (!result.allowed) throw new Error(result.reasons.join(","));
const denied = evaluateSovereigntyGate({ requestedScope:["permanent_transfer"], delegatedScopes:["permanent_transfer"], reservedScopes:["permanent_transfer"], authorityCurrent:true, localDecisionConflict:false });
if (denied.allowed) throw new Error("reserved scope must be denied");
