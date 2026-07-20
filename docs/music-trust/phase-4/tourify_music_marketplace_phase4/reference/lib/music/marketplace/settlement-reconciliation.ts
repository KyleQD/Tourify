export interface SettlementLeg {
  currencyOrAsset: string
  expectedMinor: string
  actualMinor: string
}

export interface SettlementReconciliation {
  matched: boolean
  breaks: Array<{ currencyOrAsset: string; expectedMinor: string; actualMinor: string }>
}

export function reconcileSettlement(legs: SettlementLeg[]): SettlementReconciliation {
  const breaks = legs
    .filter((leg) => BigInt(leg.expectedMinor) !== BigInt(leg.actualMinor))
    .map(({ currencyOrAsset, expectedMinor, actualMinor }) => ({ currencyOrAsset, expectedMinor, actualMinor }))
  return { matched: breaks.length === 0, breaks }
}
