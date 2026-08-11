# SEC-108 — Replace legacy ticketing RLS

## Acceptance criteria

Permissive policies are explicitly dropped, not shadowed; old tables become migration-only/read-only until retired.

## Migration

`supabase/migrations/20260720075500_admin_legacy_ticketing_rls_sec108.sql`

### Explicit drops (never shadow)

- `ticket_types_all`, `ticket_sales_all`, `ticket_campaigns_all`, `promo_codes_all`
- `ticket_campaigns_write`, `promo_codes_write`
- `ticket_shares_all`, `ticket_referrals_all`

Capability-based policies from `20260719230353_admin_ticketing_security.sql` are preserved.

### Legacy read-only

| Table | Behavior |
|-------|----------|
| `event_ticket_types` | FORCE RLS; select via ticketing.view/manage on matching `events_v2`; no authenticated writes |
| `ticket_purchases` | Same pattern when present |

Registry: `legacy_ticketing_migration_tables` (service-role / SQL only).

### Destination

Canonical writes go to `ticket_types`, `ticket_sales`, `tickets`, `event_ticketing_config`, etc. (TIX-* tasks continue cutover).
