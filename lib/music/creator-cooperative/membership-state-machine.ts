export type MembershipState = "draft" | "applied" | "under_review" | "approved" | "active" | "suspended" | "withdrawn" | "expelled"

const transitions: Record<MembershipState, MembershipState[]> = {
  draft: ["applied"],
  applied: ["under_review", "withdrawn"],
  under_review: ["approved", "withdrawn"],
  approved: ["active", "withdrawn"],
  active: ["suspended", "withdrawn", "expelled"],
  suspended: ["active", "withdrawn", "expelled"],
  withdrawn: [],
  expelled: [],
}

export function canTransitionMembership(input: { from: MembershipState; to: MembershipState }): boolean {
  return transitions[input.from].includes(input.to)
}
