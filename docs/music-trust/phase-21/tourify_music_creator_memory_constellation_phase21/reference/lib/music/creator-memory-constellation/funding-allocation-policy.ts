export interface FundingAllocationInput {
  emergencyEligibilityVerified: boolean;
  conflictsCleared: boolean;
  donorAccessConditionPresent: boolean;
  concentrationAfterAward: number;
  concentrationLimit: number;
  auditOwnerAssigned: boolean;
}

export function evaluateFundingAllocation(input: FundingAllocationInput): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!input.emergencyEligibilityVerified) reasons.push("eligibility_unverified");
  if (!input.conflictsCleared) reasons.push("conflict_not_cleared");
  if (input.donorAccessConditionPresent) reasons.push("donor_access_condition_prohibited");
  if (input.concentrationAfterAward > input.concentrationLimit) reasons.push("concentration_limit_exceeded");
  if (!input.auditOwnerAssigned) reasons.push("audit_owner_missing");
  return { allowed: reasons.length === 0, reasons };
}
