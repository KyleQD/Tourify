import { createHash } from "node:crypto"
import type { NormalizedRoyaltyLineDraft } from "./royalty-domain"
import { parseMinorUnits } from "./money"

export const CSV_PARSER_VERSION = "tourify-csv-v1"

function hashRow(payload: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex")
}

function dollarsToMinor(value: string): bigint {
  const cleaned = value.replace(/[$,\s]/g, "")
  if (!cleaned) return 0n
  const negative = cleaned.startsWith("-")
  const abs = negative ? cleaned.slice(1) : cleaned
  const [whole, fraction = ""] = abs.split(".")
  const frac = (fraction + "00").slice(0, 2)
  const minor = BigInt(whole || "0") * 100n + BigInt(frac)
  return negative ? -minor : minor
}

/** First pilot provider parser: generic CSV with header row. */
export function parseGenericRoyaltyCsv(params: {
  sourceBatchId: string
  provider: string
  csvText: string
}): { lines: NormalizedRoyaltyLineDraft[]; sourceTotalMinor: bigint } {
  const rows = params.csvText.trim().split(/\r?\n/)
  if (rows.length < 2) return { lines: [], sourceTotalMinor: 0n }
  const headers = rows[0].split(",").map((header) => header.trim().toLowerCase())
  const lines: NormalizedRoyaltyLineDraft[] = []
  let sourceTotalMinor = 0n

  for (let index = 1; index < rows.length; index += 1) {
    const cells = rows[index].split(",").map((cell) => cell.trim())
    if (cells.every((cell) => !cell)) continue
    const record: Record<string, string> = {}
    headers.forEach((header, headerIndex) => {
      record[header] = cells[headerIndex] || ""
    })

    const net = dollarsToMinor(record.net || record.net_royalty || record.amount || "0")
    const gross = dollarsToMinor(record.gross || record.gross_royalty || record.net || record.amount || "0")
    const deductions = gross >= net ? gross - net : 0n
    const absNet = net < 0n ? -net : net
    sourceTotalMinor += absNet

    const payload = { ...record, rowNumber: index }
    lines.push({
      sourceBatchId: params.sourceBatchId,
      sourceRowNumber: index,
      sourceRowHash: hashRow(payload),
      provider: params.provider,
      usageStart: record.usage_start || record.period_start || record.date || new Date().toISOString().slice(0, 10),
      usageEnd: record.usage_end || record.period_end || record.date || new Date().toISOString().slice(0, 10),
      territory: record.territory || record.country || undefined,
      currency: (record.currency || "USD").toUpperCase(),
      grossRoyaltyMinor: gross < 0n ? -gross : gross,
      deductionsMinor: deductions,
      netRoyaltyMinor: absNet,
      isrc: record.isrc || undefined,
      iswc: record.iswc || undefined,
      upc: record.upc || undefined,
      providerAssetId: record.asset_id || record.track_id || undefined,
      usageType: record.usage_type || record.type || undefined,
      units: record.units || undefined,
      rawPayload: payload,
    })
  }

  // validate parse path uses integer helpers
  parseMinorUnits(sourceTotalMinor)
  return { lines, sourceTotalMinor }
}

export function reconcileSourceTotals(params: {
  sourceTotalMinor: bigint
  normalizedTotalMinor: bigint
  toleranceMinor?: bigint
}): { ok: boolean; varianceMinor: bigint } {
  const tolerance = params.toleranceMinor ?? 0n
  const variance = params.sourceTotalMinor - params.normalizedTotalMinor
  const abs = variance < 0n ? -variance : variance
  return { ok: abs <= tolerance, varianceMinor: variance }
}
