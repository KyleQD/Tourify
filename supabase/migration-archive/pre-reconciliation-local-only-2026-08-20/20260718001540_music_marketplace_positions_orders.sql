-- Phase 4 P4-06/P4-07/P4-08: positions, transfers, partner orders — receipts only.
-- Official ownership remains with transfer agent / approved partner ledger.

begin;

do $$
begin
  if to_regclass('public.music_marketplace_offerings') is null then
    raise exception 'Missing public.music_marketplace_offerings. Apply 20260718001450_music_marketplace_offerings_investors.sql first.';
  end if;
end $$;

create table if not exists public.music_marketplace_security_classes (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.music_marketplace_offerings(id) on delete restrict,
  official_source text not null check (official_source in ('transfer_agent', 'regulated_partner')),
  partner_security_id text not null,
  quantity_scale integer not null default 0 check (quantity_scale >= 0),
  status text not null default 'active' check (status in ('active', 'suspended', 'matured', 'cancelled')),
  tokenization_enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (official_source, partner_security_id)
);

create table if not exists public.music_marketplace_positions (
  id uuid primary key default gen_random_uuid(),
  security_class_id uuid not null references public.music_marketplace_security_classes(id) on delete restrict,
  investor_user_id uuid not null references auth.users(id) on delete cascade,
  official_position_id text not null,
  quantity_minor numeric(78, 0) not null check (quantity_minor >= 0),
  restriction_status text not null default 'restricted' check (restriction_status in (
    'restricted', 'eligible_review', 'transferable', 'frozen'
  )),
  reconciliation_status text not null default 'pending' check (reconciliation_status in (
    'matched', 'pending', 'break'
  )),
  observed_at timestamptz not null,
  payload_hash text not null check (length(payload_hash) = 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (security_class_id, official_position_id)
);

create table if not exists public.music_marketplace_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.music_marketplace_positions(id) on delete restrict,
  requested_by uuid not null references auth.users(id) on delete cascade,
  transferee_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'denied_pending_review' check (status in (
    'denied_pending_review', 'eligibility_failed', 'submitted_to_partner',
    'partner_approved', 'partner_rejected', 'completed', 'cancelled'
  )),
  eligibility_snapshot jsonb not null default '{}'::jsonb,
  eligibility_passed boolean not null default false,
  partner_transfer_id text,
  quantity_minor numeric(78, 0) not null check (quantity_minor > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_repurchases (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references public.music_marketplace_positions(id) on delete restrict,
  quantity_minor numeric(78, 0) not null check (quantity_minor > 0),
  status text not null default 'proposed' check (status in (
    'proposed', 'partner_review', 'approved', 'settled', 'cancelled'
  )),
  partner_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_corporate_actions (
  id uuid primary key default gen_random_uuid(),
  security_class_id uuid not null references public.music_marketplace_security_classes(id) on delete restrict,
  action_type text not null check (action_type in (
    'split', 'reverse_split', 'dividend', 'maturity', 'termination', 'amendment', 'other'
  )),
  status text not null default 'announced' check (status in (
    'announced', 'partner_confirmed', 'applied', 'cancelled'
  )),
  effective_at timestamptz,
  partner_ref text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_token_mirrors (
  id uuid primary key default gen_random_uuid(),
  security_class_id uuid not null references public.music_marketplace_security_classes(id) on delete restrict,
  position_id uuid references public.music_marketplace_positions(id) on delete set null,
  chain text not null default 'sepolia',
  contract_address text,
  token_id text,
  status text not null default 'disabled' check (status in (
    'disabled', 'testnet', 'partner_only', 'production_blocked'
  )),
  is_legal_source_of_truth boolean not null default false check (is_legal_source_of_truth = false),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_partner_orders (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  investor_user_id uuid not null references auth.users(id) on delete cascade,
  security_class_id uuid not null references public.music_marketplace_security_classes(id) on delete restrict,
  partner_id text not null,
  partner_order_id text,
  side text not null check (side in ('buy', 'sell')),
  quantity_minor numeric(78, 0) not null check (quantity_minor > 0),
  price_minor bigint,
  currency text,
  status text not null default 'draft_local' check (status in (
    'draft_local', 'submitted_to_partner', 'partner_received', 'accepted', 'open',
    'partially_filled', 'filled', 'cancel_pending', 'cancelled', 'expired',
    'rejected', 'suspended', 'compliance_hold', 'settlement_failed'
  )),
  observed_at timestamptz,
  payload_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_executions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.music_marketplace_partner_orders(id) on delete restrict,
  partner_execution_id text not null unique,
  quantity_minor numeric(78, 0) not null check (quantity_minor > 0),
  price_minor bigint not null,
  fee_minor bigint not null default 0,
  executed_at timestamptz not null,
  payload_hash text not null check (length(payload_hash) = 64),
  created_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_settlements (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references public.music_marketplace_executions(id) on delete restrict,
  partner_settlement_id text,
  status text not null default 'pending' check (status in (
    'pending', 'settled', 'failed', 'cancelled', 'break'
  )),
  expected jsonb not null default '[]'::jsonb,
  actual jsonb,
  reconciliation_status text not null default 'pending' check (reconciliation_status in (
    'matched', 'pending', 'break'
  )),
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_market_data_ticks (
  id uuid primary key default gen_random_uuid(),
  security_class_id uuid not null references public.music_marketplace_security_classes(id) on delete cascade,
  partner_id text not null,
  bid_minor bigint,
  ask_minor bigint,
  last_minor bigint,
  currency text not null default 'USD',
  observed_at timestamptz not null,
  stale_after timestamptz not null,
  payload_hash text not null check (length(payload_hash) = 64),
  created_at timestamptz not null default now()
);

alter table public.music_marketplace_security_classes enable row level security;
alter table public.music_marketplace_positions enable row level security;
alter table public.music_marketplace_transfer_requests enable row level security;
alter table public.music_marketplace_repurchases enable row level security;
alter table public.music_marketplace_corporate_actions enable row level security;
alter table public.music_marketplace_token_mirrors enable row level security;
alter table public.music_marketplace_partner_orders enable row level security;
alter table public.music_marketplace_executions enable row level security;
alter table public.music_marketplace_settlements enable row level security;
alter table public.music_marketplace_market_data_ticks enable row level security;

revoke all on
  public.music_marketplace_security_classes,
  public.music_marketplace_positions,
  public.music_marketplace_transfer_requests,
  public.music_marketplace_repurchases,
  public.music_marketplace_corporate_actions,
  public.music_marketplace_token_mirrors,
  public.music_marketplace_partner_orders,
  public.music_marketplace_executions,
  public.music_marketplace_settlements,
  public.music_marketplace_market_data_ticks
from anon, authenticated;

grant select on public.music_marketplace_security_classes to authenticated;
grant select on public.music_marketplace_positions to authenticated;
grant select, insert on public.music_marketplace_transfer_requests to authenticated;
grant select on public.music_marketplace_repurchases to authenticated;
grant select on public.music_marketplace_corporate_actions to authenticated;
grant select on public.music_marketplace_token_mirrors to authenticated;
grant select, insert, update on public.music_marketplace_partner_orders to authenticated;
grant select on public.music_marketplace_executions to authenticated;
grant select on public.music_marketplace_settlements to authenticated;
grant select on public.music_marketplace_market_data_ticks to authenticated;

grant all on
  public.music_marketplace_security_classes,
  public.music_marketplace_positions,
  public.music_marketplace_transfer_requests,
  public.music_marketplace_repurchases,
  public.music_marketplace_corporate_actions,
  public.music_marketplace_token_mirrors,
  public.music_marketplace_partner_orders,
  public.music_marketplace_executions,
  public.music_marketplace_settlements,
  public.music_marketplace_market_data_ticks
to service_role;

drop policy if exists mm_security_classes_select on public.music_marketplace_security_classes;
create policy mm_security_classes_select on public.music_marketplace_security_classes
for select to authenticated using (exists (
  select 1 from public.music_marketplace_offerings o
  join public.music_marketplace_issuers i on i.id = o.issuer_id
  where o.id = offering_id and i.owner_user_id = (select auth.uid())
) or exists (
  select 1 from public.music_marketplace_positions p
  where p.security_class_id = id and p.investor_user_id = (select auth.uid())
));

drop policy if exists mm_positions_self on public.music_marketplace_positions;
create policy mm_positions_self on public.music_marketplace_positions
for select to authenticated using ((select auth.uid()) = investor_user_id);

drop policy if exists mm_positions_issuer on public.music_marketplace_positions;
create policy mm_positions_issuer on public.music_marketplace_positions
for select to authenticated using (exists (
  select 1 from public.music_marketplace_security_classes sc
  join public.music_marketplace_offerings o on o.id = sc.offering_id
  join public.music_marketplace_issuers i on i.id = o.issuer_id
  where sc.id = security_class_id and i.owner_user_id = (select auth.uid())
));

drop policy if exists mm_transfers_self on public.music_marketplace_transfer_requests;
create policy mm_transfers_self on public.music_marketplace_transfer_requests
for all to authenticated using ((select auth.uid()) = requested_by)
with check ((select auth.uid()) = requested_by);

drop policy if exists mm_repurchases_select on public.music_marketplace_repurchases;
create policy mm_repurchases_select on public.music_marketplace_repurchases
for select to authenticated using (exists (
  select 1 from public.music_marketplace_positions p
  where p.id = position_id and p.investor_user_id = (select auth.uid())
));

drop policy if exists mm_corp_actions_select on public.music_marketplace_corporate_actions;
create policy mm_corp_actions_select on public.music_marketplace_corporate_actions
for select to authenticated using (exists (
  select 1 from public.music_marketplace_security_classes sc
  join public.music_marketplace_positions p on p.security_class_id = sc.id
  where sc.id = security_class_id and p.investor_user_id = (select auth.uid())
) or exists (
  select 1 from public.music_marketplace_security_classes sc
  join public.music_marketplace_offerings o on o.id = sc.offering_id
  join public.music_marketplace_issuers i on i.id = o.issuer_id
  where sc.id = security_class_id and i.owner_user_id = (select auth.uid())
));

drop policy if exists mm_token_mirrors_select on public.music_marketplace_token_mirrors;
create policy mm_token_mirrors_select on public.music_marketplace_token_mirrors
for select to authenticated using (exists (
  select 1 from public.music_marketplace_positions p
  where p.id = position_id and p.investor_user_id = (select auth.uid())
) or exists (
  select 1 from public.music_marketplace_security_classes sc
  join public.music_marketplace_offerings o on o.id = sc.offering_id
  join public.music_marketplace_issuers i on i.id = o.issuer_id
  where sc.id = security_class_id and i.owner_user_id = (select auth.uid())
));

drop policy if exists mm_orders_self on public.music_marketplace_partner_orders;
create policy mm_orders_self on public.music_marketplace_partner_orders
for all to authenticated using ((select auth.uid()) = investor_user_id)
with check ((select auth.uid()) = investor_user_id);

drop policy if exists mm_executions_self on public.music_marketplace_executions;
create policy mm_executions_self on public.music_marketplace_executions
for select to authenticated using (exists (
  select 1 from public.music_marketplace_partner_orders o
  where o.id = order_id and o.investor_user_id = (select auth.uid())
));

drop policy if exists mm_settlements_self on public.music_marketplace_settlements;
create policy mm_settlements_self on public.music_marketplace_settlements
for select to authenticated using (exists (
  select 1 from public.music_marketplace_executions e
  join public.music_marketplace_partner_orders o on o.id = e.order_id
  where e.id = execution_id and o.investor_user_id = (select auth.uid())
));

drop policy if exists mm_market_data_select on public.music_marketplace_market_data_ticks;
create policy mm_market_data_select on public.music_marketplace_market_data_ticks
for select to authenticated using (true);

drop policy if exists mm_security_classes_service on public.music_marketplace_security_classes;
create policy mm_security_classes_service on public.music_marketplace_security_classes for all to service_role using (true) with check (true);
drop policy if exists mm_positions_service on public.music_marketplace_positions;
create policy mm_positions_service on public.music_marketplace_positions for all to service_role using (true) with check (true);
drop policy if exists mm_transfers_service on public.music_marketplace_transfer_requests;
create policy mm_transfers_service on public.music_marketplace_transfer_requests for all to service_role using (true) with check (true);
drop policy if exists mm_repurchases_service on public.music_marketplace_repurchases;
create policy mm_repurchases_service on public.music_marketplace_repurchases for all to service_role using (true) with check (true);
drop policy if exists mm_corp_actions_service on public.music_marketplace_corporate_actions;
create policy mm_corp_actions_service on public.music_marketplace_corporate_actions for all to service_role using (true) with check (true);
drop policy if exists mm_token_mirrors_service on public.music_marketplace_token_mirrors;
create policy mm_token_mirrors_service on public.music_marketplace_token_mirrors for all to service_role using (true) with check (true);
drop policy if exists mm_orders_service on public.music_marketplace_partner_orders;
create policy mm_orders_service on public.music_marketplace_partner_orders for all to service_role using (true) with check (true);
drop policy if exists mm_executions_service on public.music_marketplace_executions;
create policy mm_executions_service on public.music_marketplace_executions for all to service_role using (true) with check (true);
drop policy if exists mm_settlements_service on public.music_marketplace_settlements;
create policy mm_settlements_service on public.music_marketplace_settlements for all to service_role using (true) with check (true);
drop policy if exists mm_market_data_service on public.music_marketplace_market_data_ticks;
create policy mm_market_data_service on public.music_marketplace_market_data_ticks for all to service_role using (true) with check (true);

comment on table public.music_marketplace_positions is 'Official position sync from transfer agent; Tourify rows are not ownership SOT.';
comment on table public.music_marketplace_partner_orders is 'Partner ATS order receipts only; Tourify never matches orders.';
comment on table public.music_marketplace_token_mirrors is 'Optional token mirrors; is_legal_source_of_truth always false.';

commit;
