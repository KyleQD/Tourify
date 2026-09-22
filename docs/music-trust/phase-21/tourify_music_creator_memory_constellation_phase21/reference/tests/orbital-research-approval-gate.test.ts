import { evaluateOrbitalResearch } from "../lib/music/creator-memory-constellation/orbital-research-approval-gate";
const denied = evaluateOrbitalResearch({ researchOnly:false, competentStateAuthorityIdentified:false, launchAndPayloadApprovalEffective:false, registrationAndLiabilityReviewed:false, debrisReentryRetrievalReviewed:false, environmentalAndExportReviewApproved:false, insuranceEffective:false, terrestrialFallbackVerified:false });
if (denied.allowed) throw new Error("orbital deployment must default deny");
