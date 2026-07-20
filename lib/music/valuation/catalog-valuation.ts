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

export const VALUATION_DISCLAIMER =
  "This valuation is a model estimate, not an offer to sell securities or a guarantee of future cash flows."

export function calculatePresentValue(input: ValuationScenarioInput): ValuationScenarioResult {
  const micros = 1_000_000n
  const presentValueMinor = input.cashFlows.reduce((total, flow) => {
    if (flow.discountFactorMicros < 0n) throw new Error("invalid_discount_factor")
    return total + (flow.netCashMinor * flow.discountFactorMicros) / micros
  }, 0n)

  return { currency: input.currency, name: input.name, presentValueMinor }
}

export function buildValuationRange(params: {
  currency: string
  downside: ForecastCashFlow[]
  base: ForecastCashFlow[]
  upside: ForecastCashFlow[]
}) {
  const downside = calculatePresentValue({ currency: params.currency, name: "downside", cashFlows: params.downside })
  const base = calculatePresentValue({ currency: params.currency, name: "base", cashFlows: params.base })
  const upside = calculatePresentValue({ currency: params.currency, name: "upside", cashFlows: params.upside })
  return { downside, base, upside, disclaimer: VALUATION_DISCLAIMER }
}
