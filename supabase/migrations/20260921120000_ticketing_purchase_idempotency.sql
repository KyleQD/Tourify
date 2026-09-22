-- =============================================================================
-- DB-005 — Distributed DB-unique purchase idempotency on ticket_sales
-- (forward-only, additive; complements the TICKET-005 request-scoped dedup in
-- lib/ticketing/orders.ts findIdempotentPurchase and the enhanced purchase
-- route's Idempotency-Key handling)
--
-- Gap (TICKET-005 handoff, wave 2026-09-21): the active chain's ticket_sales
-- carries partial unique indexes on order_number, stripe_checkout_session_id,
-- and webhook_event_id, but no buyer-scoped purchase idempotency key. Two
-- concurrent FIRST requests carrying the same client-supplied idempotency key
-- can both create rows before the app's request-scoped lookup observes the
-- other, so a database-unique constraint is required to close the race.
--
-- This migration adds one partial unique expression index over the metadata
-- key the app already writes today:
--   * app/api/ticketing/enhanced/route.ts spreads metadata.idempotency_key
--     into the pending order (route lines ~544-546),
--   * lib/services/ticketing.service.ts sends the Idempotency-Key header plus
--     body metadata { idempotency_key } on checkout,
--   * findIdempotentPurchase matches (buyer, event, metadata @> {key}).
--
-- No application change is required and no column is added, so the generated
-- type contract (lib/database.types.ts) is untouched. The expression uses the
-- immutable jsonb ->> text operator; the partial predicate keeps legacy,
-- box-office, and key-less rows unindexed, and Postgres default
-- NULLS DISTINCT semantics leave buyer_user_id IS NULL rows uncollided.
--
-- Disposition (CP-051 — authored here, applied manually by the operator only;
-- never applied, reset, replayed, or pushed from the authoring lane):
--   1. CREATE UNIQUE INDEX ... on ticket_sales
--      (buyer_user_id, event_id, (metadata ->> 'idempotency_key'))
--      WHERE metadata ->> 'idempotency_key' IS NOT NULL;
--   2. Explicit scope note: the three existing partial unique indexes
--      (idx_ticket_sales_order_number, idx_ticket_sales_stripe_session,
--      idx_ticket_sales_webhook_event) are untouched, and no archived or
--      superseded SQL is referenced.
-- =============================================================================

create unique index if not exists idx_ticket_sales_purchase_idempotency
  on public.ticket_sales (buyer_user_id, event_id, (metadata ->> 'idempotency_key'))
  where metadata ->> 'idempotency_key' is not null;

comment on index public.idx_ticket_sales_purchase_idempotency is
  'DB-unique purchase idempotency: at most one order per (buyer_user_id, event_id, metadata.idempotency_key) while the key is present. The partial predicate excludes key-less legacy/box-office rows; NULLS DISTINCT leaves anonymous (buyer_user_id IS NULL) rows uncollided. Closes the concurrent-first-request race that request-scoped findIdempotentPurchase cannot see.'