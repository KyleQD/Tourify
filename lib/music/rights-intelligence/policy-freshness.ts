export interface PolicySourceVersion {
  publishedAt: string
  effectiveAt?: string | null
  reviewBy: string
  supersededAt?: string | null
}

export function policyFreshness(input: PolicySourceVersion, nowIso: string):
  "current" | "review_due" | "superseded" {
  if (input.supersededAt) return "superseded"
  return Date.parse(input.reviewBy) > Date.parse(nowIso) ? "current" : "review_due"
}
