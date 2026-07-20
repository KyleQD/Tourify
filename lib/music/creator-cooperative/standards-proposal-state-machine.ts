export type StandardsProposalState = "idea" | "member_consultation" | "ipr_review" | "board_approval" | "submitted" | "discussed" | "accepted" | "rejected" | "withdrawn" | "superseded"

export function standardsProposalCanBeSubmitted(input: { state: StandardsProposalState; iprApproved: boolean; boardApproved: boolean; representativeAuthorized: boolean }): boolean {
  return input.state === "board_approval" && input.iprApproved && input.boardApproved && input.representativeAuthorized
}
