-- Phase 3 P3-05/P3-07/P3-08/P3-09: valuation, fan utility, regulated finance readiness.

begin;

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  enabled boolean not null default false,
  rollout_percentage int not null default 0 check (rollout_percentage between 0 and 100),
  target_org_ids uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.music_valuation_model_versions (
  id uuid primary key default gen_random_uuid(),
  model_key text not null,
  version text not null,
  status text not null default 'draft' check (status in ('draft', 'validated', 'active', 'retired')),
  methodology_uri text not null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  assumptions_schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (model_key, version)
);

create table public.music_valuation_input_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  input_sha256 text not null check (length(input_sha256) = 64),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (owner_user_id, input_sha256)
);

create table public.music_valuation_catalog_valuations (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  input_snapshot_id uuid not null references public.music_valuation_input_snapshots(id) on delete restrict,
  model_version_id uuid not null references public.music_valuation_model_versions(id) on delete restrict,
  valuation_date date not null,
  currency text not null,
  downside_minor bigint not null,
  base_minor bigint not null,
  upside_minor bigint not null,
  confidence_score numeric(5,2) not null check (confidence_score >= 0 and confidence_score <= 100),
  assumptions jsonb not null default '{}'::jsonb,
  exclusions jsonb not null default '[]'::jsonb,
  disclaimer text not null default 'This valuation is a model estimate, not an offer to sell securities or a guarantee of future cash flows.',
  status text not null default 'draft' check (status in ('draft', 'review', 'issued', 'superseded', 'withdrawn')),
  created_at timestamptz not null default now()
);

create table public.music_valuation_scenarios (
  id uuid primary key default gen_random_uuid(),
  valuation_id uuid not null references public.music_valuation_catalog_valuations(id) on delete cascade,
  name text not null check (name in ('downside', 'base', 'upside')),
  present_value_minor bigint not null,
  cash_flows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (valuation_id, name)
);

create table public.music_valuation_reviews (
  id uuid primary key default gen_random_uuid(),
  valuation_id uuid not null references public.music_valuation_catalog_valuations(id) on delete cascade,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  decision text not null check (decision in ('approve', 'reject', 'request_changes', 'supersede')),
  notes text,
  created_at timestamptz not null default now()
);

insert into public.music_valuation_model_versions (model_key, version, status, methodology_uri)
values ('tourify_dcf_v1', '1.0.0', 'active', '/docs/music-trust/phase-3/tourify_music_royalty_valuation_phase3/11_CATALOG_VALUATION_METHODOLOGY.md')
on conflict (model_key, version) do nothing;

-- Fan utility (nonfinancial)
create table public.music_finance_fan_collectibles (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  artist_music_id uuid references public.artist_music(id) on delete set null,
  title text not null,
  utility_description text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  implies_investment boolean not null default false check (implies_investment = false),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Regulated offering readiness (partner-gated; no open market)
create table public.music_finance_offerings (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  partner_code text not null,
  status text not null default 'draft' check (status in (
    'draft', 'partner_review', 'approved', 'live', 'closed', 'blocked'
  )),
  instrument_type text not null default 'royalty_participation',
  accepts_orders boolean not null default false,
  counsel_approved boolean not null default false,
  partner_approved boolean not null default false,
  terms jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.music_finance_offering_orders (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.music_finance_offerings(id) on delete cascade,
  investor_ref text,
  status text not null default 'rejected' check (status in ('rejected', 'accepted', 'cancelled')),
  rejection_reason text,
  amount_minor bigint,
  currency text,
  created_at timestamptz not null default now()
);

create table public.music_finance_onchain_instruments (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid references public.music_finance_offerings(id) on delete set null,
  chain text not null default 'sepolia',
  contract_address text,
  token_id text,
  status text not null default 'disabled' check (status in ('disabled', 'testnet', 'partner_only', 'production_blocked')),
  is_legal_source_of_truth boolean not null default false check (is_legal_source_of_truth = false),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.music_valuation_model_versions enable row level security;
alter table public.music_valuation_input_snapshots enable row level security;
alter table public.music_valuation_catalog_valuations enable row level security;
alter table public.music_valuation_scenarios enable row level security;
alter table public.music_valuation_reviews enable row level security;
alter table public.music_finance_fan_collectibles enable row level security;
alter table public.music_finance_offerings enable row level security;
alter table public.music_finance_offering_orders enable row level security;
alter table public.music_finance_onchain_instruments enable row level security;

revoke all on
  public.music_valuation_model_versions,
  public.music_valuation_input_snapshots,
  public.music_valuation_catalog_valuations,
  public.music_valuation_scenarios,
  public.music_valuation_reviews,
  public.music_finance_fan_collectibles,
  public.music_finance_offerings,
  public.music_finance_offering_orders,
  public.music_finance_onchain_instruments
from anon, authenticated;

grant select on public.music_valuation_model_versions to authenticated;
grant select, insert on public.music_valuation_input_snapshots, public.music_valuation_catalog_valuations, public.music_valuation_scenarios to authenticated;
grant select, insert, update on public.music_finance_fan_collectibles, public.music_finance_offerings to authenticated;
grant select, insert on public.music_finance_offering_orders to authenticated;
grant select on public.music_finance_onchain_instruments to authenticated;
grant select, insert on public.music_valuation_reviews to authenticated;

grant all on
  public.music_valuation_model_versions,
  public.music_valuation_input_snapshots,
  public.music_valuation_catalog_valuations,
  public.music_valuation_scenarios,
  public.music_valuation_reviews,
  public.music_finance_fan_collectibles,
  public.music_finance_offerings,
  public.music_finance_offering_orders,
  public.music_finance_onchain_instruments
to service_role;

create policy music_valuation_models_select on public.music_valuation_model_versions
for select to authenticated using (status in ('validated', 'active') or true);

create policy music_valuation_inputs_owner on public.music_valuation_input_snapshots
for all to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);

create policy music_valuation_vals_owner on public.music_valuation_catalog_valuations
for all to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);

create policy music_valuation_scenarios_owner on public.music_valuation_scenarios
for all to authenticated using (exists (
  select 1 from public.music_valuation_catalog_valuations v
  where v.id = valuation_id and v.owner_user_id = (select auth.uid())
)) with check (exists (
  select 1 from public.music_valuation_catalog_valuations v
  where v.id = valuation_id and v.owner_user_id = (select auth.uid())
));

create policy music_valuation_reviews_owner on public.music_valuation_reviews
for select to authenticated using (exists (
  select 1 from public.music_valuation_catalog_valuations v
  where v.id = valuation_id and v.owner_user_id = (select auth.uid())
));

create policy music_finance_collectibles_owner on public.music_finance_fan_collectibles
for all to authenticated using ((select auth.uid()) = owner_user_id) with check (
  (select auth.uid()) = owner_user_id and implies_investment = false
);

create policy music_finance_offerings_owner on public.music_finance_offerings
for all to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);

create policy music_finance_orders_insert on public.music_finance_offering_orders
for insert to authenticated with check (true);
create policy music_finance_orders_select on public.music_finance_offering_orders
for select to authenticated using (exists (
  select 1 from public.music_finance_offerings o
  where o.id = offering_id and o.owner_user_id = (select auth.uid())
));

create policy music_finance_onchain_select on public.music_finance_onchain_instruments
for select to authenticated using (exists (
  select 1 from public.music_finance_offerings o
  where o.id = offering_id and o.owner_user_id = (select auth.uid())
) or offering_id is null);

create policy music_valuation_models_service on public.music_valuation_model_versions for all to service_role using (true) with check (true);
create policy music_valuation_inputs_service on public.music_valuation_input_snapshots for all to service_role using (true) with check (true);
create policy music_valuation_vals_service on public.music_valuation_catalog_valuations for all to service_role using (true) with check (true);
create policy music_valuation_scenarios_service on public.music_valuation_scenarios for all to service_role using (true) with check (true);
create policy music_valuation_reviews_service on public.music_valuation_reviews for all to service_role using (true) with check (true);
create policy music_finance_collectibles_service on public.music_finance_fan_collectibles for all to service_role using (true) with check (true);
create policy music_finance_offerings_service on public.music_finance_offerings for all to service_role using (true) with check (true);
create policy music_finance_orders_service on public.music_finance_offering_orders for all to service_role using (true) with check (true);
create policy music_finance_onchain_service on public.music_finance_onchain_instruments for all to service_role using (true) with check (true);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('music_valuation_enabled', 'Music catalog valuation', 'Enable model-governed catalog valuation ranges.', false, 0),
  ('music_fan_utility_enabled', 'Music fan utility collectibles', 'Enable nonfinancial fan-access collectibles.', false, 0),
  ('music_finance_offerings_enabled', 'Music regulated offerings', 'Partner-gated royalty participation readiness.', false, 0),
  ('music_finance_onchain_enabled', 'Music finance on-chain', 'Optional testnet/partner on-chain representations.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

comment on table public.music_valuation_catalog_valuations is 'Valuation ranges; never mutates rights or royalty ledger balances.';
comment on table public.music_finance_offerings is 'Partner-gated offerings; accepts_orders remains false without counsel+partner approval.';
comment on table public.music_finance_onchain_instruments is 'On-chain representations are never the legal source of truth.';

commit;
