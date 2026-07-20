export interface MoneyAmount {
  currency: string
  minorUnits: bigint
}

export interface RationalShare {
  numerator: bigint
  denominator: bigint
}

export function allocateMoney({
  amount,
  shares,
}: {
  amount: MoneyAmount
  shares: Array<{ id: string; share: RationalShare }>
}): Array<{ id: string; amount: MoneyAmount }> {
  if (shares.some(({ share }) => share.denominator <= 0n || share.numerator < 0n)) {
    throw new Error("invalid_share")
  }

  const allocations = shares.map(({ id, share }) => ({
    id,
    amount: {
      currency: amount.currency,
      minorUnits: (amount.minorUnits * share.numerator) / share.denominator,
    },
  }))

  const allocated = allocations.reduce((sum, item) => sum + item.amount.minorUnits, 0n)
  let remainder = amount.minorUnits - allocated

  for (const item of allocations.sort((a, b) => a.id.localeCompare(b.id))) {
    if (remainder <= 0n) break
    item.amount.minorUnits += 1n
    remainder -= 1n
  }

  return allocations
}
