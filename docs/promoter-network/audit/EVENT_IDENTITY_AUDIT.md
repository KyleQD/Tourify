# Event Identity Audit

**Phase:** P0-1  
**Audited:** 2026-08-17  
**Method:** read-only review of current application code, migrations, and generated database types. The configured project URL is `auqddrodjezjlypkzfpi`; this checkout is not linked to the Supabase CLI, so this document does not claim a live-catalog inspection.

## Current application contract

`events_v2` is the intended ticketing event root. The public-event read model in `lib/events/get-public-event-page.ts` resolves `ticketing_event_id` from `promoted_event_v2_id`, then `event_v2_id`, then an `events_v2.id = event.id` lookup. It queries `event_ticketing_config.event_id` and active `ticket_types.event_id` with that resolved ID. `components/events/public/event-rsvp-actions.tsx` passes it to `/tickets/purchase`.

The native purchase endpoint is `app/api/ticketing/enhanced/route.ts`. Its request schema requires `event_id`; the route reads `event_ticketing_config`, `ticket_types`, `promo_codes`, and `ticket_referrals` by that value, and passes it unmodified to `createPendingOrder` in `lib/ticketing/orders.ts`.

## Schema evidence

| Object | Current source-of-record evidence | Promoter decision |
|---|---|---|
| `events_v2` | `lib/database.types.ts` exposes `id`, `org_id`, `created_by`, `title`, `slug`, `start_at`, `end_at`, `venue_id`, `status`, and `settings`. `supabase/migrations/20260712120000_event_ticketing_foundation.sql` makes it the FK target for ticketing foundation tables. | Use only after live-FK verification is complete. |
| `event_ticketing_config` | Foundation migration defines one row per `event_id`, with `event_id uuid not null unique references events_v2(id)`, ownership, sale windows, currency, fees, taxes, and Connect-ready fields. | Reuse as event-level ticketing/configuration boundary. |
| `ticket_types` | Native checkout reads this table; the foundation migration extends it and the purchase route joins it to `events_v2`. It supplies `id`, `event_id`, price, availability/sold/reserved counts, active state, and sale windows. | Canonical active ticket-product input for promoter eligibility, pending live-FK verification. |
| `event_ticket_types` | `supabase/migrations/20260720075500_admin_legacy_ticketing_rls_sec108.sql` forces RLS and makes this table authenticated read-only; `docs/admin-feature-specs/discovery/TIX-002-ticketing-consumer-inventory.md` calls it inactive legacy compatibility. | Do not use. |
| `ticket_sales` | `lib/ticketing/orders.ts` creates the pending order with `event_id`, `ticket_type_id`, buyer, prices/discounts, fee fields, promo/referral references, reservation, Stripe session/payment IDs, and `metadata`. `lib/ticketing/finalize.ts` completes it. | Canonical current order/sale evidence for attribution and commissions. |
| `tickets` | Foundation migration creates individual tickets with `order_id -> ticket_sales`, `ticket_type_id -> ticket_types`, and `event_id -> events_v2`. `lib/ticketing/issuance.ts` is called after payment finalization. | Use for issued-ticket evidence only; attribute at sale/line-item level first. |
| `tours` / `tour_events` | Existing tables remain the tour relationship. No active ticket checkout route consumes a tour ID; all purchase and sale evidence is event-specific. | A later tour program may bind to `tours`/`tour_events`, but each attribution and commission must remain event-scoped. |

## Required live-catalog verification before P1

There is a material migration/type conflict. `lib/database.types.ts` still lists `ticket_types`, `ticket_campaigns`, `ticket_referrals`, and `ticket_shares` relationships to legacy `events`, while current migration and runtime code target `events_v2`. The authoritative remote catalog must be checked for:

```sql
select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint
where contype = 'f'
  and conrelid in (
    'public.ticket_types'::regclass,
    'public.ticket_sales'::regclass,
    'public.ticket_campaigns'::regclass,
    'public.ticket_referrals'::regclass,
    'public.ticket_shares'::regclass
  );
```

Do not add promoter FKs until that result proves the deployed parent relationships and the repository’s generated types are refreshed from the same catalog.

## Phase-0 answers

1. **Active checkout event FK:** application contract is `event_id` supplied to `ticket_sales`, `ticket_types`, and `event_ticketing_config`; current runtime assumes `events_v2`. Live FK still requires confirmation.
2. **Authoritative ticket product:** `ticket_types`, not `event_ticket_types`.
3. **Pre-issuance order:** `ticket_sales` is the pending order; `tickets` are issued during finalization.
4. **Tour linkage:** no checkout tour FK; resolve a future tour program to event instances through `tour_events` and retain the event ID on every sale record.
