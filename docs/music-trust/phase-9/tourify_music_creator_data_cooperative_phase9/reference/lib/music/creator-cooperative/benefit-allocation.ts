export interface BenefitInput { memberId: string; patronageUnits: bigint }
export interface BenefitAllocation { memberId: string; amountMinor: bigint }

export function allocateBenefitPool(input: { poolMinor: bigint; members: BenefitInput[] }): BenefitAllocation[] {
  const total = input.members.reduce((sum, member) => sum + member.patronageUnits, 0n)
  if (total <= 0n) return []
  let allocated = 0n
  return input.members.map((member, index) => {
    const amount = index === input.members.length - 1
      ? input.poolMinor - allocated
      : (input.poolMinor * member.patronageUnits) / total
    allocated += amount
    return { memberId: member.memberId, amountMinor: amount }
  })
}
