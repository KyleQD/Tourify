/**
 * DDEX DSR adapter — deferred pilot implementation (ADR-P3-002).
 * Interface reserved so CSV pilot can ship without claiming full DDEX support.
 */

export const DDEX_ADAPTER_STATUS = "deferred" as const

export interface DdexParseResult {
  supported: false
  reason: string
}

export function parseDdexDsrRoyaltyReport(_xmlOrPayload: string): DdexParseResult {
  return {
    supported: false,
    reason: "DDEX DSR adapter deferred pending pilot fixtures; use generic CSV parser for Phase 3 pilot formats.",
  }
}
