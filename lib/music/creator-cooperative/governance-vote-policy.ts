export interface VotePolicyInput {
  eligibleVoters: number
  votesCast: number
  votesFor: number
  quorumPercent: number
  approvalPercent: number
  conflictedVotesExcluded: boolean
}

export function evaluateGovernanceVote(input: VotePolicyInput): { quorate: boolean; approved: boolean } {
  const quorate = input.eligibleVoters > 0 && (input.votesCast / input.eligibleVoters) * 100 >= input.quorumPercent
  const approved = quorate && input.votesCast > 0 && (input.votesFor / input.votesCast) * 100 >= input.approvalPercent && input.conflictedVotesExcluded
  return { quorate, approved }
}
