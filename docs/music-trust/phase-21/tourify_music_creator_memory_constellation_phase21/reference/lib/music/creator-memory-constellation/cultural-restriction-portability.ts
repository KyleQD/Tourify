import type { RestrictionProfile } from "./constellation-domain";

export interface RestrictionMergeResult { allowed: boolean; effective?: RestrictionProfile; reasons: string[]; }

export function mergeRestrictionProfiles(input: { source: RestrictionProfile; receiverSupportedPurposes: string[] }): RestrictionMergeResult {
  const reasons: string[] = [];
  const allowedPurposes = input.source.allowedPurposes.filter((purpose) => input.receiverSupportedPurposes.includes(purpose));
  if (allowedPurposes.length === 0) reasons.push("no_compatible_allowed_purpose");
  if (input.source.onwardTransferAllowed === false) reasons.push("onward_transfer_prohibited");
  return {
    allowed: reasons.length === 0,
    effective: reasons.length === 0 ? { ...input.source, allowedPurposes, onwardTransferAllowed: false } : undefined,
    reasons
  };
}
