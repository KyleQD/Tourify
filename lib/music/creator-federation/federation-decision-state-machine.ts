export type FederationProposalState = "draft" | "review" | "voting" | "provisional_result" | "local_ratification" | "effective" | "rejected" | "withdrawn" | "expired"

export function evaluateFederationDecision(input: { yes: number; no: number; abstain: number; quorum: number; threshold: number; vetoed: boolean; requiredOrganizations: string[]; ratifiedOrganizations: string[] }): { passes: boolean; reason: string } {
  const total = input.yes + input.no + input.abstain
  if (total < input.quorum) return { passes: false, reason: "quorum_not_met" }
  if (input.vetoed) return { passes: false, reason: "valid_veto" }
  const decisive = input.yes + input.no
  if (decisive === 0 || input.yes / decisive < input.threshold) return { passes: false, reason: "threshold_not_met" }
  const missing = input.requiredOrganizations.filter((id) => !input.ratifiedOrganizations.includes(id))
  if (missing.length > 0) return { passes: false, reason: "local_ratification_incomplete" }
  return { passes: true, reason: "approved_and_ratified" }
}
