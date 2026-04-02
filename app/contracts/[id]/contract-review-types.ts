export interface ContractReviewRow {
  id: string
  title: string
  terms?: string | null
  status: string
  user_id: string
  counterparty_user_id?: string | null
  metadata?: {
    signatures?: Record<
      string,
      { legal_name?: string; signed_at?: string; user_id?: string }
    >
  } | null
}
