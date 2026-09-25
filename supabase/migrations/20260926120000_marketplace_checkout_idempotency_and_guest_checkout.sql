-- ============================================================================
-- 20260926120000_marketplace_checkout_idempotency_and_guest_checkout.sql
--
-- DB-011 / MKT-004. Reconciles the P0 marketplace checkout money path.
--
-- WHY THIS EXISTS
--   app/api/marketplace/checkout/route.ts cannot reach the payment provider on
--   any environment built from the active chain:
--     * line 99  reads   public.marketplace_checkout_attempts  (relation absent)
--     * line 154 updates public.marketplace_checkout_attempts  (relation absent)
--     * line 464 upserts public.marketplace_checkout_attempts  (relation absent)
--     * line 392 inserts public.marketplace_orders with guest-checkout columns
--              that no active migration creates
--   The route fails closed on the first of those (lib/marketplace/
--   schema-readiness.ts:8 matches PostgREST PGRST205 and the route returns 503
--   schema_not_ready), so checkout is a launch blocker rather than a type error.
--
-- PROVENANCE
--   Every table and column below is taken from an archived, reviewed migration
--   that this repository already classifies as real work but never applied:
--     supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/
--       20260728000011_marketplace_checkout_attempts.sql
--       20260728000014_marketplace_orders_p6_guest_checkout.sql
--   (MANIFEST.csv:257 and :262, both `local_only_unapplied`).
--
--   Two deliberate departures from the archived text, each required by live
--   code rather than invented:
--     1. marketplace_checkout_attempts.guest_email — the archived table has no
--        such column, but app/api/marketplace/checkout/route.ts:467 writes it in
--        the same upsert that claims the idempotency key. The archived DDL is
--        behind the code; this is the only way to express what the caller does.
--     2. Nothing else is added. In particular no `updated_at`, no attempt
--        counter and no retry column, because no caller reads or writes one.
--
-- AUTHORIZATION
--   marketplace_checkout_attempts: RLS enabled; the only policy is a
--   buyer-scoped SELECT. INSERT and UPDATE are service-role only (the route and
--   the webhook processor both use createServiceRoleClient), exactly as the
--   archived migration intended. An unauthenticated caller therefore cannot
--   claim an idempotency key or mark someone else's attempt.
--
--   marketplace_orders: columns and indexes only. No policy, grant or RLS
--   setting is touched, so the existing order authorization surface is
--   unchanged.
--
-- FORWARD-ONLY AND ADDITIVE
--   No table is dropped, renamed or rewritten. No existing column changes type,
--   nullability or default. The archived statements are reproduced with
--   `if not exists` throughout so a target that already received the DDL
--   out-of-band converges instead of erroring. CP-051: authored only, not
--   applied by this task.
-- ============================================================================

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- 1. marketplace_checkout_attempts — checkout-initiation idempotency
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_checkout_attempts (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  buyer_user_id uuid references auth.users(id) on delete set null,
  -- guest_email is the email a signed-out buyer supplied. It mirrors
  -- marketplace_orders.guest_email and is nullable exactly as the route writes
  -- it (`buyer?.id ?? null` / `payload.guestEmail ?? null`).
  guest_email text,
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
-- FORCE, not just ENABLE. The table holds buyer PII (buyer_user_id, guest_email)
-- and deliberately has no INSERT or UPDATE policy, so FORCE guarantees that even
-- the table owner is subject to that absence. Service-role writes are unaffected
-- because that role has BYPASSRLS.
alter table public.marketplace_checkout_attempts force row level security;

-- Buyer reads their own checkout attempts. Guest attempts have a null
-- buyer_user_id and are therefore readable by nobody through this policy,
-- which is the intended outcome: a guest is served by order_id, not by a
-- client-side read of this table.
drop policy if exists "marketplace_checkout_attempts_buyer_read" on public.marketplace_checkout_attempts;
create policy "marketplace_checkout_attempts_buyer_read"
  on public.marketplace_checkout_attempts
  for select
  to authenticated
  using (auth.uid() = buyer_user_id);

comment on table public.marketplace_checkout_attempts is
  'Idempotency table for marketplace checkout initiation. Keyed by idempotency_key; expires after 30 minutes.';
comment on column public.marketplace_checkout_attempts.input_hash is
  'SHA-256 of the normalised checkout input payload for duplicate-detection';
comment on column public.marketplace_checkout_attempts.guest_email is
  'Email supplied by a signed-out buyer; null for an authenticated buyer. Mirrors marketplace_orders.guest_email.';

-- ---------------------------------------------------------------------------
-- 2. marketplace_orders — P6 guest checkout columns
-- ---------------------------------------------------------------------------
-- app/api/marketplace/checkout/route.ts:377-394 inserts exactly these six in
-- addition to the columns the chain already creates.
alter table public.marketplace_orders
  add column if not exists order_number                     text,
  add column if not exists applied_fee_snapshot             jsonb,
  add column if not exists idempotency_key                   text,
  add column if not exists guest_email                       text,
  add column if not exists guest_access_token                text,
  add column if not exists guest_access_token_expires_at     timestamptz;

-- Partial unique indexes rather than bare unique constraints: the columns are
-- nullable and a guest order is identified by its token, so NULL rows must not
-- collide with one another.
create unique index if not exists idx_marketplace_orders_order_number
  on public.marketplace_orders (order_number)
  where order_number is not null;

create index if not exists idx_marketplace_orders_guest_token
  on public.marketplace_orders (guest_access_token)
  where guest_access_token is not null;

create unique index if not exists idx_marketplace_orders_idempotency_key
  on public.marketplace_orders (idempotency_key)
  where idempotency_key is not null;

comment on column public.marketplace_orders.guest_access_token is
  'Plain-text opaque token for the guest order page. Server-side only; never returned by a client query.';
comment on column public.marketplace_orders.guest_email is
  'Email supplied at guest checkout; preserved after the order is claimed by a buyer account.';
