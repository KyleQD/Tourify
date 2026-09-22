set client_min_messages = warning;

-- P2 Migration 011: marketplace_checkout_attempts + marketplace_payment_events
-- Two tables:
--   1. marketplace_checkout_attempts  — idempotency for checkout initiation
--   2. marketplace_payment_events     — idempotency for Stripe webhook delivery (critical gap from P0 audit)

-- ─── marketplace_checkout_attempts ───────────────────────────────────────────

create table if not exists public.marketplace_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  buyer_user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.marketplace_orders(id) on delete set null,
  input_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  unique (idempotency_key)
);

create index if not exists idx_marketplace_checkout_attempts_key
  on public.marketplace_checkout_attempts (idempotency_key);

create index if not exists idx_marketplace_checkout_attempts_buyer_time
  on public.marketplace_checkout_attempts (buyer_user_id, created_at desc);

alter table public.marketplace_checkout_attempts enable row level security;

-- Buyer reads their own checkout attempts
drop policy if exists "marketplace_checkout_attempts_buyer_read" on public.marketplace_checkout_attempts;
create policy "marketplace_checkout_attempts_buyer_read"
  on public.marketplace_checkout_attempts
  for select
  using (auth.uid() = buyer_user_id);

-- Service role writes via checkout route; no direct user INSERT policy.

comment on table public.marketplace_checkout_attempts is
  'Idempotency table for marketplace checkout initiation. Keyed by idempotency_key; expires after 30 minutes.';
comment on column public.marketplace_checkout_attempts.input_hash is
  'SHA-256 of the normalised checkout input payload for duplicate-detection';

-- ─── marketplace_payment_events ──────────────────────────────────────────────

create table if not exists public.marketplace_payment_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null,
  event_type text not null,
  processing_status text not null default 'received'
    check (processing_status in ('received', 'processing', 'processed', 'failed', 'ignored')),
  attempts integer not null default 0,
  last_error text,
  raw_payload jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider_event_id)
);

create index if not exists idx_marketplace_payment_events_provider_id
  on public.marketplace_payment_events (provider_event_id);

create index if not exists idx_marketplace_payment_events_status_time
  on public.marketplace_payment_events (processing_status, received_at desc);

alter table public.marketplace_payment_events enable row level security;

-- Service role only — no direct user access.
-- Policies are intentionally absent; only the service role (bypasses RLS) may read/write.

comment on table public.marketplace_payment_events is
  'Idempotency claim table for Stripe marketplace webhook events. Pattern mirrors ticket_stripe_webhook_events. Service role only.';
comment on column public.marketplace_payment_events.provider_event_id is
  'Stripe event.id — unique index prevents duplicate processing';
comment on column public.marketplace_payment_events.raw_payload is
  'Minimal safe payload stored per compliance policy; avoid storing full card/PII fields';
