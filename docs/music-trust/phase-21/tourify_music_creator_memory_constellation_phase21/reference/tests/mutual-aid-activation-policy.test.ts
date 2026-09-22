import { evaluateMutualAidActivation } from "../lib/music/creator-memory-constellation/mutual-aid-activation-policy";
const allowed = evaluateMutualAidActivation({ sourceAuthorityCurrent:true, receivingTrustActive:true, exactPurposeApproved:true, restrictionsCompatible:true, lifeSafetyCleared:true, incidentOwnerAssigned:true, expiresAt:"2099-01-01T00:00:00Z", now:"2026-01-01T00:00:00Z" });
if (!allowed.allowed) throw new Error(`expected allowed: ${allowed.reasons.join(",")}`);
const denied = evaluateMutualAidActivation({ sourceAuthorityCurrent:true, receivingTrustActive:true, exactPurposeApproved:true, restrictionsCompatible:false, lifeSafetyCleared:true, incidentOwnerAssigned:true, expiresAt:"2099-01-01T00:00:00Z", now:"2026-01-01T00:00:00Z" });
if (denied.allowed) throw new Error("expected restriction conflict denial");
