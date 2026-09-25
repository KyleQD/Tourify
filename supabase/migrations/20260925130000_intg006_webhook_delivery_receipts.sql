-- INTG-006: durable receipt ledger for inbound provider webhooks that have no
-- provider-side signature timestamp (Supabase Database Webhooks).
--
-- Purpose: give those webhooks an atomic claim-before-side-effect boundary.
-- The existing public.notification_delivery_log is a delivery metrics table
-- (channels jsonb, delivered_at, read by notification metrics); it has no
-- uniqueness on notification_id, so a check-then-act dedupe on it races: two
-- concurrent deliveries both observe "not delivered" and both send.
--
-- This migration creates one new table. It does not alter, drop, or rewrite any
-- existing object, so it is safe to run online and forward-only.
--
-- Contract:
--   insert (provider, delivery_id) -> 23505 means the delivery was already
--   claimed. Routes then acknowledge the duplicate without side effects unless a
--   bounded reclaim (status 'failed', or 'processing' older than the bounded
--   window) is won atomically by exactly one request.
--
-- Apply order: this migration MUST be applied before deploying the webhook
-- route change that claims from it; the route fails closed (500) while the
-- table is absent, by design.
--
-- Safe to run online: creates one new table and its primary key, touches
-- nothing existing. Backfill: none required.

create table if not exists public.webhook_delivery_receipts (
  provider text not null,
  delivery_id text not null,
  status text not null default 'processing',
  attempts integer not null default 1,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  primary key (provider, delivery_id),
  constraint webhook_delivery_receipts_status_check
    check (status in ('processing', 'delivered', 'failed'))
);

comment on table public.webhook_delivery_receipts is
  'Atomic claim-before-side-effect receipt ledger for inbound provider webhooks (INTG-006).';

comment on column public.webhook_delivery_receipts.delivery_id is
  'Stable provider delivery identity: the provider event id or notification id.';

comment on column public.webhook_delivery_receipts.status is
  'processing = claimed/in-flight, delivered = completed, failed = prior attempt errored and may be reclaimed.';

alter table public.webhook_delivery_receipts enable row level security;

-- Default-deny: no anon/authenticated policies or column grants. Only
-- service_role (used by the server-only webhook routes) can read or write.
revoke all on table public.webhook_delivery_receipts from anon, authenticated;
grant all on table public.webhook_delivery_receipts to service_role;

-- Bounded-window reclaim support: only the oldest in-flight claims are ever
-- candidates for takeover, and the lookup is by (provider, status).
create index if not exists webhook_delivery_receipts_provider_status_idx
  on public.webhook_delivery_receipts (provider, status, received_at);
