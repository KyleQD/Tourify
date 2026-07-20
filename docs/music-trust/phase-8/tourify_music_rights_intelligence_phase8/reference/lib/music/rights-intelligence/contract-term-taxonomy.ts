export const contractTermCategories = [
  "grant_scope", "term", "territory", "exclusivity", "options", "reversion",
  "accounting", "reserves", "audit", "recoupment", "commission", "approval",
  "mfn", "indemnity", "warranty", "ai_rights", "data_rights", "disputes",
] as const

export type ContractTermCategory = typeof contractTermCategories[number]

export interface ContractTermObservation {
  category: ContractTermCategory
  normalizedValue: string
  sourcePage?: number | null
  confidence: number
  humanConfirmed: boolean
}
