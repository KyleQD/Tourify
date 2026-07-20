export interface ForecastCashFlow {
  period: string
  netCashMinor: bigint
  discountFactorMicros: bigint
}

export interface ValuationScenarioInput {
  currency: string
  name: "downside" | "base" | "upside"
  cashFlows: ForecastCashFlow[]
}

export interface ValuationScenarioResult {
  currency: string
  name: ValuationScenarioInput["name"]
  presentValueMinor: bigint
}

export function calculatePresentValue(input: ValuationScenarioInput): ValuationScenarioResult {
  const micros = 1_000_000n
  const presentValueMinor = input.cashFlows.reduce((total, flow) => {
    if (flow.discountFactorMicros < 0n) throw new Error("invalid_discount_factor")
    return total + (flow.netCashMinor * flow.discountFactorMicros) / micros
  }, 0n)

  return { currency: input.currency, name: input.name, presentValueMinor }
}
