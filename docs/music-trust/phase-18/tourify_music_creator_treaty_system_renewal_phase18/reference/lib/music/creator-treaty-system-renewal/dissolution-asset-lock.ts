export function evaluateDissolution(input: {
  dissolutionAuthorized: boolean;
  claimsProcessApproved: boolean;
  publicAssetScheduleApproved: boolean;
  archiveSuccessorConfirmed: boolean;
  essentialServicePlanApproved: boolean;
  creatorRightsAffected: boolean;
}) {
  if (input.creatorRightsAffected) return { allowed: false, reason: 'creator_rights_affected' } as const;
  const allowed = input.dissolutionAuthorized && input.claimsProcessApproved && input.publicAssetScheduleApproved && input.archiveSuccessorConfirmed && input.essentialServicePlanApproved;
  return { allowed, reason: allowed ? 'dissolution_controls_satisfied' : 'dissolution_incomplete' } as const;
}
