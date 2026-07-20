export type RatificationState = "draft" | "local_review" | "approved_locally" | "signed" | "effective" | "suspended" | "withdrawal_pending" | "withdrawn" | "expired"

const transitions: Record<RatificationState, RatificationState[]> = {
  draft: ["local_review"], local_review: ["approved_locally", "draft"], approved_locally: ["signed"], signed: ["effective"],
  effective: ["suspended", "withdrawal_pending", "expired"], suspended: ["effective", "withdrawal_pending", "expired"],
  withdrawal_pending: ["withdrawn", "effective"], withdrawn: [], expired: []
}

export function canTransitionRatification(from: RatificationState, to: RatificationState): boolean { return transitions[from].includes(to) }
