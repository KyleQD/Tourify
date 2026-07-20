export type StewardshipState =
  | "draft" | "diligence" | "public_review" | "approved" | "sandbox"
  | "limited_production" | "production" | "suspended" | "transition" | "retired" | "rejected"

const transitions: Record<StewardshipState, readonly StewardshipState[]> = {
  draft: ["diligence", "rejected"],
  diligence: ["public_review", "rejected", "suspended"],
  public_review: ["approved", "diligence", "rejected"],
  approved: ["sandbox", "suspended"],
  sandbox: ["limited_production", "suspended", "transition", "retired"],
  limited_production: ["production", "sandbox", "suspended", "transition"],
  production: ["suspended", "transition", "retired"],
  suspended: ["sandbox", "limited_production", "production", "transition", "retired"],
  transition: ["sandbox", "limited_production", "production", "retired"],
  retired: [],
  rejected: ["draft"],
}

export function canTransitionStewardship({ from, to }: { from: StewardshipState; to: StewardshipState }): boolean {
  return transitions[from].includes(to)
}
