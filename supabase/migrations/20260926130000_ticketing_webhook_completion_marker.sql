-- =============================================================================
-- TICKET-005 / HF-INTG-006-TICKETING — observable completion for the ticketing
-- Stripe webhook claim ledger (forward-only, additive)
--
-- Gap (P0, filed by INTG-006 and confirmed by reading the claim site):
--   app/api/ticketing/webhook/route.ts claims every verified event through
--   claimWebhookEvent (lib/ticketing/finalize.ts) BEFORE processing, and
--   20260821000000_reconcile_ticketing_foundation.sql:339-345 defines
--
--     create table if not exists ticket_stripe_webhook_events (
--       id text primary key,
--       event_type text not null,
--       order_id uuid references ticket_sales(id) on delete set null,
--       processed_at timestamptz not null default now(),
--       payload_summary jsonb not null default '{}'::jsonb
--     );
--
--   processed_at is stamped by the column DEFAULT at INSERT time, so it records
--   the CLAIM, never the COMPLETION. claimWebhookEvent returned a boolean and
--   the route answered {received: true, duplicate: true} on the 23505 unique
--   violation, so a single transient database error after a successful claim
--   consumed the event: finalizePaidOrder threw, the route returned 500, Stripe
--   retried, the retry hit 23505, and the retry was acknowledged as a duplicate
--   with no processing. A PAID ticket order could stay permanently unfinalized.
--
-- This migration gives completion its own observable marker. It is the
-- additive form INTG-006 recommended (add a nullable column) rather than the
-- alternative of relaxing processed_at: processed_at stays the claim-time
-- stamp it already is, so no already-applied column's meaning is rewritten and
-- no NOT NULL has to be dropped.
--
--   completed_at  nullable timestamptz — written only after every handler write
--                 in the route has succeeded. NULL therefore means "claimed,
--                 not proven complete", which is the resume signal.
--   attempts      integer NOT NULL DEFAULT 1 — how many deliveries have
--                 processed this event (1 = first delivery, 2 = one resume, ...).
--                 It is the operator-visible signal that a money event needed a
--                 retry, and the resume path increments it rather than trusting
--                 an in-process counter.
--
-- Backfill is deliberately NONE, and that is the fail-closed choice: every row
-- written before this migration has an unknown outcome, because the old schema
-- could not distinguish "claimed then completed" from "claimed then abandoned".
-- Backfilling completed_at = processed_at would assert that every historical
-- claim finished, which is precisely the unprovable claim that caused this P0,
-- and it would silently discard the real abandoned events. Leaving them NULL
-- makes a replay of an old event RESUME instead of being falsely acknowledged;
-- the guarded transitions make a resume a no-op re-apply (release_ticket_inventory
-- and finalize_ticket_inventory are status-guarded, issueTicketsForOrder returns
-- existing tickets, and the financial_transactions partial unique idempotency
-- index absorbs a repeat ledger write).
--
-- Disposition (CP-051 — authored here, applied manually by an operator only;
-- never applied, reset, replayed, or pushed from the authoring lane):
--   1. ADD COLUMN completed_at timestamptz (nullable, no default) — catalog-only
--      ALTER, no table rewrite, no data touched.
--   2. ADD COLUMN attempts integer NOT NULL DEFAULT 1 — a constant default on a
--      new column is a metadata-only ALTER on PostgreSQL 11+; no rewrite, and
--      existing rows read back as 1.
--   3. CREATE INDEX on the incomplete subset only — bounded by in-flight events
--      (the completable ones leave the predicate), ShareLock only, and it makes
--      the operator query for stuck claims index-backed:
--        select * from ticket_stripe_webhook_events
--         where completed_at is null and processed_at < now() - interval '1 hour';
--
-- RLS is untouched: the table already has RLS enabled and the deny-all
-- service-role-only policy ticket_stripe_webhook_events_deny
-- (20260821000000_reconcile_ticketing_foundation.sql:631,813-816). No policy is
-- created or dropped here, so no client surface widens — completion is written
-- by the same service-role client that already claims the event.
-- =============================================================================

alter table public.ticket_stripe_webhook_events
  add column if not exists completed_at timestamptz;

alter table public.ticket_stripe_webhook_events
  add column if not exists attempts integer not null default 1;

create index if not exists idx_ticket_stripe_webhook_events_incomplete
  on public.ticket_stripe_webhook_events (processed_at)
  where completed_at is null;

comment on column public.ticket_stripe_webhook_events.completed_at is
  'Completion marker, written only after every handler write for the event succeeded. NULL means claimed-but-not-proven-complete, which is the resume signal: a duplicate delivery must resume the incomplete work and must never be acknowledged as an already-handled duplicate. processed_at remains the claim-time stamp; it is NOT a completion marker.';

comment on column public.ticket_stripe_webhook_events.attempts is
  'Number of deliveries that have processed this event. 1 = first delivery. Incremented on each completed resume so a repeatedly failing money event is operator-visible instead of silent.';

comment on index public.idx_ticket_stripe_webhook_events_incomplete is
  'Incomplete Stripe webhook claims only (completed_at is null), for the operator probe select * from ticket_stripe_webhook_events where completed_at is null and processed_at < now() - interval ''1 hour''. Bounded by in-flight events because a completed claim leaves the partial predicate.';
