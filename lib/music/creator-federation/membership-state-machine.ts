export type FederationMembershipState = "draft" | "submitted" | "diligence" | "local_approved" | "federation_review" | "active" | "suspended" | "withdrawn" | "expelled" | "rejected"

const transitions: Record<FederationMembershipState, FederationMembershipState[]> = {
  draft: ["submitted"], submitted: ["diligence", "rejected"], diligence: ["local_approved", "rejected"],
  local_approved: ["federation_review"], federation_review: ["active", "rejected"], active: ["suspended", "withdrawn", "expelled"],
  suspended: ["active", "withdrawn", "expelled"], withdrawn: [], expelled: [], rejected: [],
}

export function canTransitionFederationMembership(input: { from: FederationMembershipState; to: FederationMembershipState }): boolean {
  return transitions[input.from].includes(input.to)
}
