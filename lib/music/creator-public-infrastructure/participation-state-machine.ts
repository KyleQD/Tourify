export type ParticipationState = "draft" | "active" | "suspended" | "withdrawing" | "withdrawn"

const transitions: Record<ParticipationState, ParticipationState[]> = {
  draft: ["active", "withdrawn"],
  active: ["suspended", "withdrawing"],
  suspended: ["active", "withdrawing"],
  withdrawing: ["withdrawn", "active"],
  withdrawn: [],
}

export function canTransitionParticipation(input: { from: ParticipationState; to: ParticipationState }): boolean {
  return transitions[input.from].includes(input.to)
}
