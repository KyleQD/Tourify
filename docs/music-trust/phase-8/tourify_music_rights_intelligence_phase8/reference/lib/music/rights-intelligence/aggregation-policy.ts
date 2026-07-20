import type { CohortPolicy } from "./rights-intelligence-domain"

export interface CohortObservation {
  participantId: string
  controllerId: string
  weight: number
  observedAt: string
}

export interface AggregationDecision {
  allowed: boolean
  reasons: string[]
}

export function evaluateAggregationPolicy(input: {
  observations: CohortObservation[]
  policy: CohortPolicy
  nowIso: string
}): AggregationDecision {
  const reasons: string[] = []
  const participants = new Set(input.observations.map((row) => row.participantId))
  const controllers = new Set(input.observations.map((row) => row.controllerId))
  const total = input.observations.reduce((sum, row) => sum + row.weight, 0)
  const max = Math.max(0, ...input.observations.map((row) => row.weight))
  const maxWeightBps = total > 0 ? Math.round((max / total) * 10_000) : 10_000
  const cutoff = Date.parse(input.nowIso) - input.policy.minimumAgeDays * 86_400_000

  if (participants.size < input.policy.minimumParticipants) reasons.push("small_cohort")
  if (controllers.size < input.policy.minimumIndependentControllers) reasons.push("controller_concentration")
  if (maxWeightBps > input.policy.maximumParticipantWeightBps) reasons.push("participant_dominance")
  if (input.observations.some((row) => Date.parse(row.observedAt) > cutoff)) reasons.push("data_too_recent")
  return { allowed: reasons.length === 0, reasons }
}
