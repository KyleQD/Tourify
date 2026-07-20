export interface OnchainInstrumentRecord {
  chain: string
  contractAddress?: string | null
  tokenId?: string | null
  status: "disabled" | "testnet" | "partner_only" | "production_blocked"
  isLegalSourceOfTruth: boolean
}

export function validateOnchainInstrument(record: OnchainInstrumentRecord): string[] {
  const issues: string[] = []
  if (record.isLegalSourceOfTruth)
    issues.push("onchain_cannot_be_legal_source_of_truth")
  if (record.status === "production_blocked")
    issues.push("production_onchain_blocked_without_partner_counsel")
  if (record.status === "disabled" && (record.contractAddress || record.tokenId))
    issues.push("disabled_instrument_should_not_expose_live_ids")
  return issues
}
