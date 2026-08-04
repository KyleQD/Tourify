/**
 * SEC-202 — Separation-of-duties predicates (shared, no domain imports).
 */

export type SeparationOfDutiesAction = "approve" | "pay" | "settle"

export interface SeparationOfDutiesResult {
  ok: boolean
  code?: string
  message?: string
  requiresSeparationOfDuties?: boolean
}

const SOD_ACTIONS = new Set<SeparationOfDutiesAction>(["approve", "pay", "settle"])

export function evaluateSeparationOfDuties(args: {
  actorUserId: string
  priorActorUserId?: string | null
  action: SeparationOfDutiesAction | string
}): SeparationOfDutiesResult {
  if (!SOD_ACTIONS.has(args.action as SeparationOfDutiesAction)) return { ok: true }
  const prior = args.priorActorUserId?.trim()
  if (!prior) return { ok: true }
  if (prior === args.actorUserId) {
    return {
      ok: false,
      code: "separation_of_duties",
      message: `Separation of duties: the same actor cannot ${args.action} a record they previously submitted.`,
      requiresSeparationOfDuties: true,
    }
  }
  return { ok: true }
}
