import { createHash } from "crypto"

export interface DisclosureManifestInput {
  offeringId: string
  version: number
  instrumentTerms: Record<string, unknown>
  riskFactors: unknown[]
  conflicts: unknown[]
  documentHashes: string[]
}

export function computeDisclosureManifestHash(input: DisclosureManifestInput): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        offeringId: input.offeringId,
        version: input.version,
        instrumentTerms: input.instrumentTerms,
        riskFactors: input.riskFactors,
        conflicts: input.conflicts,
        documentHashes: [...input.documentHashes].sort(),
      }),
    )
    .digest("hex")
}

export function projectMarketingFields(input: {
  status: string
  marketingProjection: Record<string, unknown>
}): Record<string, unknown> {
  if (input.status !== "published" && input.status !== "approved")
    return {
      summary: null,
      disclaimer: "Disclosures are not published.",
      liquidityDisclaimer:
        "No liquidity, appreciation, income, or exit is guaranteed.",
    }
  return {
    ...input.marketingProjection,
    liquidityDisclaimer:
      "No liquidity, appreciation, income, or exit is guaranteed. Secondary activity, if any, is partner-controlled.",
  }
}
