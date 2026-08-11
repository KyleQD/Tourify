/**
 * SEC-108 — Legacy ticketing RLS contract.
 */

export const SEC108_DROPPED_PERMISSIVE_POLICIES = [
  "ticket_types_all",
  "ticket_sales_all",
  "ticket_campaigns_all",
  "promo_codes_all",
  "ticket_campaigns_write",
  "promo_codes_write",
  "ticket_shares_all",
  "ticket_referrals_all",
] as const

export const SEC108_LEGACY_READ_ONLY_TABLES = [
  "event_ticket_types",
  "ticket_purchases",
] as const

export const SEC108_LEGACY_REGISTRY_TABLE = "legacy_ticketing_migration_tables"

export const SEC108_DESTINATION_TABLES = [
  "ticket_types",
  "ticket_sales",
  "tickets",
  "event_ticketing_config",
] as const
