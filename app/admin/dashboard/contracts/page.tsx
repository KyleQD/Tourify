import { notFound } from "next/navigation"

/**
 * Admin contracts surface is intentionally hidden (AUD-0112 / AUD-0067).
 * Live contracts inbox lives at /contracts for authenticated counterparties.
 */
export default function AdminContractsPage() {
  notFound()
}
