export type NegotiationGroupState =
  | "proposed"
  | "legal_review"
  | "readiness_only"
  | "approved_for_simulation"
  | "separately_authorized"
  | "active"
  | "suspended"
  | "dissolved"

const allowed: Record<NegotiationGroupState, NegotiationGroupState[]> = {
  proposed: ["legal_review", "dissolved"],
  legal_review: ["readiness_only", "dissolved"],
  readiness_only: ["approved_for_simulation", "suspended", "dissolved"],
  approved_for_simulation: ["separately_authorized", "suspended", "dissolved"],
  separately_authorized: ["active", "suspended", "dissolved"],
  active: ["suspended", "dissolved"],
  suspended: ["readiness_only", "active", "dissolved"],
  dissolved: [],
}

export function canTransitionNegotiationGroup(from: NegotiationGroupState, to: NegotiationGroupState): boolean {
  return allowed[from].includes(to)
}
