export type QuoteStatus = "draft" | "issued" | "countered" | "accepted" | "expired" | "withdrawn" | "superseded"
const transitions: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["issued", "withdrawn"], issued: ["countered", "accepted", "expired", "withdrawn", "superseded"],
  countered: ["issued", "withdrawn", "superseded"], accepted: ["superseded"], expired: [], withdrawn: [], superseded: []
}
export function canTransitionQuote(from: QuoteStatus, to: QuoteStatus): boolean { return transitions[from].includes(to) }
