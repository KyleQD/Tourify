import { allocateMoney, type MoneyAmount, type RationalShare } from "./money"
import type { RoyaltyEligibleInterestV1 } from "./royalty-domain"

export interface AllocationInput {
  journalLineId: string
  amount: MoneyAmount
  usageDate: string
  territory?: string
  rightsCategory: string
  interests: RoyaltyEligibleInterestV1[]
}

export function selectEligibleInterests(input: AllocationInput): RoyaltyEligibleInterestV1[] {
  return input.interests.filter((interest) => {
    if (interest.status !== "eligible") return false
    if (interest.rightsCategory !== input.rightsCategory) return false
    if (input.usageDate < interest.validFrom) return false
    if (interest.validTo && input.usageDate > interest.validTo) return false
    if (
      input.territory
      && interest.territoryCodes.length > 0
      && !interest.territoryCodes.includes("WORLDWIDE")
      && !interest.territoryCodes.includes(input.territory)
    )
      return false
    return true
  })
}

export function allocateRoyalty(input: AllocationInput) {
  const eligible = selectEligibleInterests(input)
  if (eligible.length === 0) return []

  const shares = eligible.map((interest) => ({
    id: interest.interestId,
    share: {
      numerator: BigInt(interest.numerator),
      denominator: BigInt(interest.denominator),
    } satisfies RationalShare,
  }))

  return allocateMoney({ amount: input.amount, shares }).map((row) => {
    const interest = eligible.find((item) => item.interestId === row.id)!
    return {
      ...row,
      payeePartyId: interest.payeePartyId,
      interest,
    }
  })
}
