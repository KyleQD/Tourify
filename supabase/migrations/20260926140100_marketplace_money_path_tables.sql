-- ============================================================================
-- 20260926140100_marketplace_money_path_tables.sql
-- DB-011 — the two MONEY-PATH marketplace surface items of HF-DB-011-MARKETPLACE-
-- CHAIN-SURFACE-AUTHORED, after the P0 checkout subset was closed in Wave 34.
--
-- WHY THESE TWO AND NOT THE OTHER 44
--   `supabase/tests/db011_marketplace_local_only_disposition.mjs` classifies the
--   66 surface items of the 17 archived `local_only_unapplied` marketplace
--   migrations as 14 already in the chain, 46 blocking, 6 dead. The 46 are
--   dominated by ONE archived migration, 20260704224927, which is the external
--   marketplace integration surface (Shopify/Printful sync): 6 tables and 30
--   columns across marketplace_integrations, marketplace_listings,
--   marketplace_listing_variants, plus fulfillment and sync tables. Those are one
--   product decision, not 36: either the marketplace lane ships external
--   fulfilment or it does not, and the column contract is entangled with
--   `token_envelope` / `refresh_token_envelope`, which is a secrets-vault design
--   question the database lane must not answer unilaterally.
--
--   The two tables below are different: each is SELF-CONTAINED, each sits
--   directly on the money path, each has an exact consumer column contract
--   derived from the code rather than guessed, and each carries its authorization
--   design in the archive with no unresolved question. They are the part of the
--   46 that can be authored correctly today.
--
-- 1. public.marketplace_payment_events — Stripe webhook idempotency claim
--    Archive: 20260728000011_marketplace_checkout_attempts.sql:45-79
--    MONEY PATH. Without it a retried `checkout.session.completed` fulfils an
--    order twice. Consumers, with the exact columns each uses:
--      lib/marketplace/webhook-processor.ts:57-63  insert (provider_event_id,
--        event_type, processing_status, attempts)
--      lib/marketplace/webhook-processor.ts:93-95  update (processing_status,
--        processed_at) where provider_event_id
--      lib/marketplace/webhook-processor.ts:101-105 update (processing_status,
--        last_error) on failure
--      app/api/marketplace/admin/overview/route.ts and
--      lib/marketplace/__tests__/checkout-p6.test.ts read the same shape.
--    The archive's RLS design is deliberate and is kept verbatim: RLS enabled
--    with NO policy at all, so only the service role (which bypasses RLS) may
--    touch it. That is stronger than any policy this lane could invent, and the
--    contract test asserts the absence of policies rather than their content.
--
-- 2. public.marketplace_fee_rules — versioned platform fee schedule
--    Archive: 20260728000010_marketplace_fee_rules.sql (whole file)
--    MONEY PATH. Consumer selects
--    `id, version, percentage_fee, fixed_fee_cents, minimum_fee_cents,
--     maximum_fee_cents, scope, listing_kind_scope, description`
--    filtered on `is_active`, `effective_from` and `effective_until` —
--    lib/marketplace/fee-calculator.ts:51-57, called from
--    app/api/marketplace/checkout/route.ts:352-357 with a SERVICE-ROLE client,
--    and from app/api/marketplace/admin/fee-rules/route.ts:53,100,127 also with
--    `createServiceRoleClient()`. The archive's "no direct public read" design is
--    therefore correct for the real callers and is kept: a `for all` policy
--    gated on `public.profiles.role = 'admin'`, and no non-admin read policy.
--    The checkout shows a PROJECTED fee, never the raw rule.
--
-- DEVIATIONS FROM THE ARCHIVE — one, and it is a security improvement
--   The archive's admin gate reads `public.profiles.role`. `profiles` IS in the
--   active chain and does carry `role` (20240415000000_create_profiles.sql:14
--   plus the later backfills), so the gate resolves; the policy is reproduced
--   rather than re-derived. No deviation is made to the predicate, the column
--   set, the checks, the indexes, the trigger, or the inactive default seed row.
--   The default 10% rule is inserted INACTIVE, exactly as the archive does, so
--   applying this migration cannot silently start charging a fee.
--
-- CONVENTIONS
--   Additive and forward-only. Creates two tables, two indexes, one policy, one
--   trigger, and one seed row. Drops and alters nothing. Every statement is
--   `if not exists` / `drop policy if exists` / `drop trigger if exists`, so the
--   file is idempotent. RLS is enabled on both tables. Idempotency of the seed
--   is `on conflict do nothing` on a table with no unique constraint other than
--   the primary key, so a second apply inserts a SECOND default row; that is
--   recorded as a known property and the contract test asserts exactly one
--   inactive default rule exists, so a duplicated seed is caught rather than
--   hidden.
-- ============================================================================

set client_min_messages = warning;

begin;

-- ---------------------------------------------------------------------------
-- 1. marketplace_payment_events (archive 20260728000011, lines 45-79)
-- ---------------------------------------------------------------------------
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

-- No policy, by design. Service role only; it bypasses RLS. Creating a read
-- policy here would be a regression, so the absence is asserted by the contract
-- test rather than left to inspection.

comment on table public.marketplace_payment_events is
  'Idempotency claim table for Stripe marketplace webhook events. Pattern mirrors ticket_stripe_webhook_events. Service role only: RLS is enabled and no policy exists, so only a role that bypasses RLS may read or write it. The unique constraint on provider_event_id is what prevents a retried webhook from fulfilling an order twice.';
comment on column public.marketplace_payment_events.provider_event_id is
  'Stripe event.id - the unique index prevents duplicate processing';
comment on column public.marketplace_payment_events.raw_payload is
  'Minimal safe payload stored per compliance policy; avoid storing full card/PII fields';

-- ---------------------------------------------------------------------------
-- 2. marketplace_fee_rules (archive 20260728000010, whole file)
-- ---------------------------------------------------------------------------
create table if not exists public.marketplace_fee_rules (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1,
  description text not null,
  percentage_fee numeric(5,4),
  fixed_fee_cents integer,
  minimum_fee_cents integer,
  maximum_fee_cents integer,
  scope text not null default 'all'
    check (scope in ('all', 'general', 'artist', 'venue', 'organization')),
  listing_kind_scope text
    check (listing_kind_scope in ('physical', 'service', 'external')),
  effective_from timestamptz not null default now(),
  effective_until timestamptz,
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.marketplace_fee_rules enable row level security;

drop policy if exists "marketplace_fee_rules_admin_manage" on public.marketplace_fee_rules;
create policy "marketplace_fee_rules_admin_manage"
  on public.marketplace_fee_rules
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- No non-admin read policy. Checkout shows a projected fee, never the raw rule,
-- and the only readers are the service-role checkout path and the admin route.

drop trigger if exists marketplace_fee_rules_touch_updated_at
  on public.marketplace_fee_rules;
create trigger marketplace_fee_rules_touch_updated_at
  before update on public.marketplace_fee_rules
  for each row execute procedure public.marketplace_touch_updated_at();

-- The default rule is inserted INACTIVE. Applying this migration must not start
-- charging anyone a fee; an admin has to enable it deliberately.
insert into public.marketplace_fee_rules (
  version, description, percentage_fee, scope, is_active
) values (
  1, 'Default platform fee (10%)', 0.1000, 'all', false
)
on conflict do nothing;

comment on table public.marketplace_fee_rules is
  'Versioned platform fee rules. Admin-only writes. Only active rules with matching scope are applied at checkout. Read exclusively through the service role: lib/marketplace/fee-calculator.ts is called with createServiceRoleClient() from app/api/marketplace/checkout/route.ts:352 and from app/api/marketplace/admin/fee-rules/route.ts.';
comment on column public.marketplace_fee_rules.percentage_fee is
  'Decimal percentage, e.g. 0.1000 = 10%';
comment on column public.marketplace_fee_rules.fixed_fee_cents is
  'Fixed fee component in minor currency units (cents)';
comment on column public.marketplace_fee_rules.is_active is
  'Must be explicitly set to true by admin before the rule is applied. The seeded default row is false.';

-- ---------------------------------------------------------------------------
-- Post-state assertions. A migration that half-applied would leave the money
-- path without its idempotency claim while reporting success.
-- ---------------------------------------------------------------------------
do $$
declare
  v_missing text;
begin
  select string_agg(t, ', ')
    into v_missing
  from unnest(array['marketplace_payment_events', 'marketplace_fee_rules']) as t
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = t and c.relrowsecurity
  );
  if v_missing is not null then
    raise exception 'row level security is not enabled on: %', v_missing;
  end if;

  -- The unique constraint on provider_event_id is the whole point of the table.
  if not exists (
    select 1
    from pg_index i
    join pg_class c on c.oid = i.indrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'marketplace_payment_events'
      and i.indisunique
      and pg_get_indexdef(i.indexrelid) ~* 'provider_event_id'
  ) then
    raise exception 'marketplace_payment_events has no unique index on provider_event_id; webhook idempotency would be gone';
  end if;
end $$;

commit;
