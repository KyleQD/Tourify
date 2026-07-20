export interface PublicLawActionInput {
  currentSourceVerified: boolean;
  actorAuthorityCurrent: boolean;
  exactScopeDelegated: boolean;
  jurisdictionApproved: boolean;
  requiredReviewsComplete: boolean;
  stopped: boolean;
}
export function authorizePublicLawAction(i: PublicLawActionInput) {
  const allowed = i.currentSourceVerified && i.actorAuthorityCurrent && i.exactScopeDelegated && i.jurisdictionApproved && i.requiredReviewsComplete && !i.stopped;
  return { allowed, default: "deny", reasons: allowed ? [] : ["EXACT_SCOPE_AUTHORIZATION_FAILED"] };
}
