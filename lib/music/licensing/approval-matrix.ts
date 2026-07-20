import type { ClearanceLeg } from "./licensing-domain"

export interface ApprovalRecord { partyId: string; requestVersion: number; approved: boolean }
export interface EvaluateApprovalsInput { legs: ClearanceLeg[]; approvals: ApprovalRecord[]; currentRequestVersion: number }
export interface ApprovalEvaluation { clearable: boolean; missing: Array<{ legId: string; partyIds: string[] }>; blocked: string[] }

export function evaluateApprovals(input: EvaluateApprovalsInput): ApprovalEvaluation {
  const missing: ApprovalEvaluation["missing"] = []
  const blocked: string[] = []
  for (const leg of input.legs) {
    if (leg.status === "blocked") blocked.push(...leg.blockers)
    if (leg.status === "not_applicable") continue
    const approved = new Set(input.approvals.filter(a => a.approved && a.requestVersion === input.currentRequestVersion).map(a => a.partyId))
    const absent = leg.requiredApproverPartyIds.filter(id => !approved.has(id))
    if (absent.length) missing.push({ legId: leg.id, partyIds: absent })
  }
  return { clearable: missing.length === 0 && blocked.length === 0, missing, blocked }
}
