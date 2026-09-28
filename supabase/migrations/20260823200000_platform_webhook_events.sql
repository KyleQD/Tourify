-- Generic platform-wide Stripe webhook event ledger.
--
-- Purpose: idempotency for ALL Stripe webhook consumers (subscriptions today,
-- other domains as they migrate). Insert-before-process with a unique
-- constraint on (provider, provider_event_id); a 23505 violation means the
-- event was already seen and must be acknowledged without reprocessing.
--
-- Safe to run online: creates one new table, touches nothing existing.
-- Backfill: none required (existing per-domain ledgers keep their history).

create table if not exists public.platform_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  provider_event_id text not null,
  event_type text,
  processing_status text not null default 'processing',
  attempts int not null default 1,
  payload_summary jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

alter table public.platform_webhook_events enable row level security;

-- No client policies: service-role only. Intentionally no anon/authenticated grants.

create index if not exists platform_webhook_events_provider_type_idx
  on public.platform_webhook_events (provider, event_type);
