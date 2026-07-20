export interface WaterfallParticipant {
  participantId: string
  contributionMinor: bigint
}

export interface ProRataAllocation {
  participantId: string
  amountMinor: bigint
}

export function allocateProRata(
  amountMinor: bigint,
  participants: WaterfallParticipant[],
): ProRataAllocation[] {
  const total = participants.reduce((sum, item) => sum + item.contributionMinor, 0n)
  if (total <= 0n) throw new Error("positive_total_contribution_required")

  let allocated = 0n
  const rows = participants.map((item, index) => {
    const isLast = index === participants.length - 1
    const amount = isLast
      ? amountMinor - allocated
      : (amountMinor * item.contributionMinor) / total
    allocated += amount
    return { participantId: item.participantId, amountMinor: amount }
  })

  return rows
}
