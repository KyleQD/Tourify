import type { LegacyCycleState } from "./legacy-domain"

const TRANSITIONS: Record<LegacyCycleState, LegacyCycleState[]> = {
  draft: ["proposed", "rejected", "archived"],
  proposed: ["under_review", "rejected", "archived"],
  under_review: ["approved", "rejected", "archived"],
  approved: ["effective", "suspended", "archived"],
  effective: ["suspended", "terminated", "archived"],
  suspended: ["effective", "terminated", "archived"],
  terminated: ["archived"],
  rejected: ["archived"],
  archived: [],
}

export function canTransitionLegacy(input: { from: LegacyCycleState; to: LegacyCycleState }) {
  return (TRANSITIONS[input.from] || []).includes(input.to)
}
