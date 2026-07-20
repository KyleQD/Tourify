export interface PolicySource {
  effectiveAt?: string
  publishedAt: string
  reviewedAt: string
  reviewBy: string
  status: "proposal" | "enacted" | "guidance" | "litigation" | "withdrawn" | "superseded"
}

export function policySourceIsCurrent(input: { source: PolicySource; now: string }): boolean {
  if (["withdrawn", "superseded"].includes(input.source.status)) return false
  return input.now < input.source.reviewBy
}
