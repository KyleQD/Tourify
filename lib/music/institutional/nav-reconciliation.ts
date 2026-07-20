export interface NavLine {
  key: string
  amountMinor: bigint
}

export interface NavDifference {
  key: string
  officialMinor: bigint
  parallelMinor: bigint
  differenceMinor: bigint
}

export function reconcileNavLines(
  official: NavLine[],
  parallel: NavLine[],
): NavDifference[] {
  const keys = new Set([...official.map((x) => x.key), ...parallel.map((x) => x.key)])
  return [...keys].map((key) => {
    const officialMinor = official.find((x) => x.key === key)?.amountMinor ?? 0n
    const parallelMinor = parallel.find((x) => x.key === key)?.amountMinor ?? 0n
    return {
      key,
      officialMinor,
      parallelMinor,
      differenceMinor: parallelMinor - officialMinor,
    }
  })
}
