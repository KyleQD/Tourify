import { assertBalancedJournal } from "./money"

export interface JournalEntryDraft {
  accountCode: string
  debitMinor: bigint
  creditMinor: bigint
  sourceLineId?: string
  memo?: string
}

export function buildAcceptedRoyaltyJournalEntries(params: {
  currency: string
  netMinor: bigint
  deductionsMinor: bigint
  sourceLineId?: string
}): JournalEntryDraft[] {
  const gross = params.netMinor + params.deductionsMinor
  const entries: JournalEntryDraft[] = [
    {
      accountCode: "1100",
      debitMinor: gross,
      creditMinor: 0n,
      sourceLineId: params.sourceLineId,
      memo: "Royalty receivable",
    },
    {
      accountCode: "4100",
      debitMinor: 0n,
      creditMinor: params.netMinor,
      sourceLineId: params.sourceLineId,
      memo: "Royalty revenue recognized",
    },
  ]
  if (params.deductionsMinor > 0n)
    entries.push({
      accountCode: "5100",
      debitMinor: 0n,
      creditMinor: params.deductionsMinor,
      sourceLineId: params.sourceLineId,
      memo: "Source deductions",
    })

  assertBalancedJournal(entries.map((entry) => ({
    debitMinor: entry.debitMinor,
    creditMinor: entry.creditMinor,
  })))
  return entries
}

export function buildReversalEntries(entries: JournalEntryDraft[]): JournalEntryDraft[] {
  return entries.map((entry) => ({
    ...entry,
    debitMinor: entry.creditMinor,
    creditMinor: entry.debitMinor,
    memo: entry.memo ? `Reversal: ${entry.memo}` : "Reversal",
  }))
}
