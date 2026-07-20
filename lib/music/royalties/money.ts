export interface MoneyAmount {
  currency: string
  minorUnits: bigint
}

export interface RationalShare {
  numerator: bigint
  denominator: bigint
}

export function parseMinorUnits(value: string | number | bigint): bigint {
  if (typeof value === "bigint") return value
  if (typeof value === "number") {
    if (!Number.isInteger(value)) throw new Error("money_must_be_integer_minor_units")
    return BigInt(value)
  }
  if (!/^-?\d+$/.test(value)) throw new Error("money_must_be_integer_minor_units")
  return BigInt(value)
}

export function allocateMoney({
  amount,
  shares,
}: {
  amount: MoneyAmount
  shares: Array<{ id: string; share: RationalShare }>
}): Array<{ id: string; amount: MoneyAmount }> {
  if (shares.length === 0) return []
  if (shares.some(({ share }) => share.denominator <= 0n || share.numerator < 0n))
    throw new Error("invalid_share")

  const allocations = shares.map(({ id, share }) => ({
    id,
    amount: {
      currency: amount.currency,
      minorUnits: (amount.minorUnits * share.numerator) / share.denominator,
    },
  }))

  const allocated = allocations.reduce((sum, item) => sum + item.amount.minorUnits, 0n)
  let remainder = amount.minorUnits - allocated

  for (const item of [...allocations].sort((a, b) => a.id.localeCompare(b.id))) {
    if (remainder <= 0n) break
    item.amount.minorUnits += 1n
    remainder -= 1n
  }

  return allocations
}

export function assertBalancedJournal(entries: Array<{ debitMinor: bigint; creditMinor: bigint }>) {
  const debits = entries.reduce((sum, entry) => sum + entry.debitMinor, 0n)
  const credits = entries.reduce((sum, entry) => sum + entry.creditMinor, 0n)
  if (debits !== credits) throw new Error("journal_unbalanced")
  return { debits, credits }
}
