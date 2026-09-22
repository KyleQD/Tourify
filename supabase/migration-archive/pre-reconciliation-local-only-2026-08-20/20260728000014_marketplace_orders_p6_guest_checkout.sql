set client_min_messages = warning;

-- P6 Migration: marketplace_orders guest checkout columns + checkout idempotency helpers
--
-- Adds columns required by the P6 guest checkout and idempotency spec:
--   order_number           — human-readable, display-safe order identifier
--   applied_fee_snapshot   — JSONB snapshot of the fee rule applied at checkout time
--   idempotency_key        — ties one Stripe Checkout session to one pending order
--   guest_email            — email used for guest checkout (preserved after claim)
--   guest_access_token     — plain-text opaque token stored server-side (not hashed)
--   guest_access_token_expires_at — expiry for the guest access link (72h)
--
-- All changes are additive (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- ─── marketplace_orders extra columns ─────────────────────────────────────────

alter table public.marketplace_orders
  add column if not exists order_number        text,
  add column if not exists applied_fee_snapshot jsonb,
  add column if not exists idempotency_key      text,
  add column if not exists guest_email          text,
  add column if not exists guest_access_token   text,
  add column if not exists guest_access_token_expires_at timestamptz;

-- Unique index on order_number so we can look up by it safely
create unique index if not exists idx_marketplace_orders_order_number
  on public.marketplace_orders (order_number)
  where order_number is not null;

-- Index for guest token lookups (used on every guest page load)
create index if not exists idx_marketplace_orders_guest_token
  on public.marketplace_orders (guest_access_token)
  where guest_access_token is not null;

-- Unique index on idempotency_key so concurrent identical checkouts are rejected
create unique index if not exists idx_marketplace_orders_idempotency_key
  on public.marketplace_orders (idempotency_key)
  where idempotency_key is not null;

-- ─── order_number sequence helper ────────────────────────────────────────────
-- Generate a human-readable order number: TFY-YYYYMMDD-XXXXXXXX

create or replace function public.generate_marketplace_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date  text := to_char(now(), 'YYYYMMDD');
  v_rand  text := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
begin
  return 'TFY-' || v_date || '-' || v_rand;
end;
$$;

comment on function public.generate_marketplace_order_number() is
  'Generates a human-readable marketplace order number: TFY-YYYYMMDD-XXXXXXXX';

-- ─── Auto-populate order_number on insert ─────────────────────────────────────

create or replace function public.marketplace_orders_set_order_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.order_number is null then
    new.order_number := generate_marketplace_order_number();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_marketplace_orders_order_number on public.marketplace_orders;
create trigger trg_marketplace_orders_order_number
  before insert on public.marketplace_orders
  for each row execute procedure public.marketplace_orders_set_order_number();

-- ─── marketplace_checkout_attempts: add guest_email column ────────────────────
-- Guest checkout attempts don't have a buyer_user_id; track guest_email instead.

alter table public.marketplace_checkout_attempts
  add column if not exists guest_email text;

-- ─── RLS for guest_access_token ───────────────────────────────────────────────
-- The guest_access_token column must NOT be readable by anon or authenticated
-- users via the normal RLS policies — only the service role accesses it.
-- Existing RLS on marketplace_orders already restricts rows; the column-level
-- protection is enforced by never SELECTing guest_access_token in user-facing
-- queries (API routes use service role for token lookups).

comment on column public.marketplace_orders.order_number is
  'Human-readable order identifier for display. Format: TFY-YYYYMMDD-XXXXXXXX. Auto-populated by trigger.';
comment on column public.marketplace_orders.applied_fee_snapshot is
  'JSON snapshot of the marketplace_fee_rules row applied at checkout time. Immutable after order creation.';
comment on column public.marketplace_orders.idempotency_key is
  'Client-supplied idempotency key for the checkout request. Unique per in-flight order.';
comment on column public.marketplace_orders.guest_email is
  'Email address used for guest checkout. Preserved unchanged after buyer_user_id claim.';
comment on column public.marketplace_orders.guest_access_token is
  'Opaque, random, non-enumerable token for guest order access. Service role only.';
comment on column public.marketplace_orders.guest_access_token_expires_at is
  'Expiry timestamp for guest_access_token. Default 72 hours from order creation.';
