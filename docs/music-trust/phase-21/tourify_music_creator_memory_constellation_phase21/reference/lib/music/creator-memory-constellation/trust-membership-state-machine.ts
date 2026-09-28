export type TrustNodeState = "draft" | "under_review" | "approved" | "active" | "suspended" | "withdrawn" | "expired" | "rejected";

const transitions: Record<TrustNodeState, TrustNodeState[]> = {
  draft: ["under_review"],
  under_review: ["approved", "rejected"],
  approved: ["active", "expired"],
  active: ["suspended", "withdrawn", "expired"],
  suspended: ["active", "withdrawn", "expired"],
  withdrawn: [], expired: [], rejected: []
};

export function canTransitionTrustNode(input: { from: TrustNodeState; to: TrustNodeState }): boolean {
  return transitions[input.from].includes(input.to);
}
