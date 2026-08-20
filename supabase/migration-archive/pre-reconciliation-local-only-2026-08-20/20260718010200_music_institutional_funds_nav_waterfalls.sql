-- Phase 5 S6–S7: funds/SPVs, commitments, calls, NAV sync, waterfalls, distributions.
-- Official fund administration/NAV remains external.

begin;

do $$
begin
  if to_regclass('public.music_institutional_organizations') is null then
    raise exception 'Apply 20260718010000_music_institutional_participants_deals_dataroom.sql first.';
  end if;
end $$;

create table if not exists public.music_institutional_fund_vehicles (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  sponsor_organization_id uuid references public.music_institutional_organizations(id) on delete set null,
  legal_name text not null,
  vehicle_type text not null check (vehicle_type in (
    'private_fund', 'spv', 'continuation', 'other'
  )),
  status text not null default 'planning' check (status in (
    'planning', 'raising', 'closed', 'investing', 'harvesting', 'liquidating', 'terminated'
  )),
  administrator_provider_id text,
  adviser_provider_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_capital_commitments (
  id uuid primary key default gen_random_uuid(),
  fund_vehicle_id uuid not null references public.music_institutional_fund_vehicles(id) on delete cascade,
  investor_organization_id uuid not null references public.music_institutional_organizations(id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null,
  status text not null check (status in (
    'draft', 'submitted_to_partner', 'accepted', 'rejected', 'canceled'
  )),
  official_provider_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_capital_calls (
  id uuid primary key default gen_random_uuid(),
  fund_vehicle_id uuid not null references public.music_institutional_fund_vehicles(id) on delete cascade,
  call_number integer not null,
  due_at timestamptz,
  total_amount_minor bigint not null check (total_amount_minor > 0),
  currency text not null,
  status text not null default 'announced' check (status in (
    'announced', 'partner_confirmed', 'funded', 'canceled'
  )),
  official_provider_reference text,
  created_at timestamptz not null default now(),
  unique (fund_vehicle_id, call_number)
);

create table if not exists public.music_institutional_fund_subscriptions (
  id uuid primary key default gen_random_uuid(),
  fund_vehicle_id uuid not null references public.music_institutional_fund_vehicles(id) on delete cascade,
  investor_organization_id uuid not null references public.music_institutional_organizations(id) on delete cascade,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null,
  status text not null default 'draft',
  official_provider_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_nav_periods (
  id uuid primary key default gen_random_uuid(),
  fund_vehicle_id uuid not null references public.music_institutional_fund_vehicles(id) on delete cascade,
  valuation_date date not null,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in (
    'draft', 'administrator_final', 'parallel_estimate', 'superseded', 'break'
  )),
  total_nav_minor bigint,
  currency text,
  administrator_reference text,
  is_official boolean not null default false,
  parallel_estimate_minor bigint,
  created_at timestamptz not null default now(),
  unique (fund_vehicle_id, valuation_date, version),
  constraint music_institutional_nav_official_requires_admin check (
    (is_official = false) or (administrator_reference is not null and status = 'administrator_final')
  )
);

create table if not exists public.music_institutional_waterfall_runs (
  id uuid primary key default gen_random_uuid(),
  fund_vehicle_id uuid not null references public.music_institutional_fund_vehicles(id) on delete cascade,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null,
  allocation jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  official_provider_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_distribution_records (
  id uuid primary key default gen_random_uuid(),
  fund_vehicle_id uuid not null references public.music_institutional_fund_vehicles(id) on delete cascade,
  distribution_date date not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null,
  status text not null check (status in (
    'draft', 'partner_confirmed', 'posted', 'reconciled', 'break'
  )),
  official_provider_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_servicing_events (
  id uuid primary key default gen_random_uuid(),
  fund_vehicle_id uuid not null references public.music_institutional_fund_vehicles(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  official_provider_reference text,
  created_at timestamptz not null default now()
);

alter table public.music_institutional_fund_vehicles enable row level security;
alter table public.music_institutional_capital_commitments enable row level security;
alter table public.music_institutional_capital_calls enable row level security;
alter table public.music_institutional_fund_subscriptions enable row level security;
alter table public.music_institutional_nav_periods enable row level security;
alter table public.music_institutional_waterfall_runs enable row level security;
alter table public.music_institutional_distribution_records enable row level security;
alter table public.music_institutional_servicing_events enable row level security;

revoke all on
  public.music_institutional_fund_vehicles,
  public.music_institutional_capital_commitments,
  public.music_institutional_capital_calls,
  public.music_institutional_fund_subscriptions,
  public.music_institutional_nav_periods,
  public.music_institutional_waterfall_runs,
  public.music_institutional_distribution_records,
  public.music_institutional_servicing_events
from anon, authenticated;

grant select, insert, update on public.music_institutional_fund_vehicles to authenticated;
grant select, insert on public.music_institutional_capital_commitments to authenticated;
grant select on public.music_institutional_capital_calls to authenticated;
grant select, insert on public.music_institutional_fund_subscriptions to authenticated;
grant select on public.music_institutional_nav_periods to authenticated;
grant select on public.music_institutional_waterfall_runs to authenticated;
grant select on public.music_institutional_distribution_records to authenticated;
grant select on public.music_institutional_servicing_events to authenticated;

grant all on
  public.music_institutional_fund_vehicles,
  public.music_institutional_capital_commitments,
  public.music_institutional_capital_calls,
  public.music_institutional_fund_subscriptions,
  public.music_institutional_nav_periods,
  public.music_institutional_waterfall_runs,
  public.music_institutional_distribution_records,
  public.music_institutional_servicing_events
to service_role;

drop policy if exists mi_funds_access on public.music_institutional_fund_vehicles;
create policy mi_funds_access on public.music_institutional_fund_vehicles
for all to authenticated using (
  exists (
    select 1 from public.music_institutional_memberships m
    where m.organization_id = sponsor_organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
  )
) with check (
  exists (
    select 1 from public.music_institutional_memberships m
    where m.organization_id = sponsor_organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
  )
);

drop policy if exists mi_commitments_access on public.music_institutional_capital_commitments;
create policy mi_commitments_access on public.music_institutional_capital_commitments
for all to authenticated using (exists (
  select 1 from public.music_institutional_memberships m
  where m.organization_id = investor_organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
) or exists (
  select 1 from public.music_institutional_fund_vehicles f
  join public.music_institutional_memberships m on m.organization_id = f.sponsor_organization_id
  where f.id = fund_vehicle_id and m.user_id = (select auth.uid()) and m.status = 'active'
)) with check (true);

drop policy if exists mi_calls_access on public.music_institutional_capital_calls;
create policy mi_calls_access on public.music_institutional_capital_calls
for select to authenticated using (exists (
  select 1 from public.music_institutional_fund_vehicles f
  join public.music_institutional_memberships m on m.organization_id = f.sponsor_organization_id
  where f.id = fund_vehicle_id and m.user_id = (select auth.uid()) and m.status = 'active'
) or exists (
  select 1 from public.music_institutional_capital_commitments c
  join public.music_institutional_memberships m on m.organization_id = c.investor_organization_id
  where c.fund_vehicle_id = fund_vehicle_id and m.user_id = (select auth.uid()) and m.status = 'active'
));

drop policy if exists mi_fund_subs_access on public.music_institutional_fund_subscriptions;
create policy mi_fund_subs_access on public.music_institutional_fund_subscriptions
for all to authenticated using (exists (
  select 1 from public.music_institutional_memberships m
  where m.organization_id = investor_organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
)) with check (true);

drop policy if exists mi_nav_access on public.music_institutional_nav_periods;
create policy mi_nav_access on public.music_institutional_nav_periods
for select to authenticated using (exists (
  select 1 from public.music_institutional_fund_vehicles f
  join public.music_institutional_memberships m on (
    m.organization_id = f.sponsor_organization_id
    or exists (
      select 1 from public.music_institutional_capital_commitments c
      where c.fund_vehicle_id = f.id and c.investor_organization_id = m.organization_id
    )
  )
  where f.id = fund_vehicle_id and m.user_id = (select auth.uid()) and m.status = 'active'
));

drop policy if exists mi_waterfall_access on public.music_institutional_waterfall_runs;
create policy mi_waterfall_access on public.music_institutional_waterfall_runs
for select to authenticated using (exists (
  select 1 from public.music_institutional_fund_vehicles f
  join public.music_institutional_memberships m on m.organization_id = f.sponsor_organization_id
  where f.id = fund_vehicle_id and m.user_id = (select auth.uid()) and m.status = 'active'
));

drop policy if exists mi_dist_access on public.music_institutional_distribution_records;
create policy mi_dist_access on public.music_institutional_distribution_records
for select to authenticated using (exists (
  select 1 from public.music_institutional_fund_vehicles f
  join public.music_institutional_memberships m on m.organization_id = f.sponsor_organization_id
  where f.id = fund_vehicle_id and m.user_id = (select auth.uid()) and m.status = 'active'
));

drop policy if exists mi_servicing_access on public.music_institutional_servicing_events;
create policy mi_servicing_access on public.music_institutional_servicing_events
for select to authenticated using (exists (
  select 1 from public.music_institutional_fund_vehicles f
  join public.music_institutional_memberships m on m.organization_id = f.sponsor_organization_id
  where f.id = fund_vehicle_id and m.user_id = (select auth.uid()) and m.status = 'active'
));

drop policy if exists mi_funds_service on public.music_institutional_fund_vehicles;
create policy mi_funds_service on public.music_institutional_fund_vehicles for all to service_role using (true) with check (true);
drop policy if exists mi_commitments_service on public.music_institutional_capital_commitments;
create policy mi_commitments_service on public.music_institutional_capital_commitments for all to service_role using (true) with check (true);
drop policy if exists mi_calls_service on public.music_institutional_capital_calls;
create policy mi_calls_service on public.music_institutional_capital_calls for all to service_role using (true) with check (true);
drop policy if exists mi_fund_subs_service on public.music_institutional_fund_subscriptions;
create policy mi_fund_subs_service on public.music_institutional_fund_subscriptions for all to service_role using (true) with check (true);
drop policy if exists mi_nav_service on public.music_institutional_nav_periods;
create policy mi_nav_service on public.music_institutional_nav_periods for all to service_role using (true) with check (true);
drop policy if exists mi_waterfall_service on public.music_institutional_waterfall_runs;
create policy mi_waterfall_service on public.music_institutional_waterfall_runs for all to service_role using (true) with check (true);
drop policy if exists mi_dist_service on public.music_institutional_distribution_records;
create policy mi_dist_service on public.music_institutional_distribution_records for all to service_role using (true) with check (true);
drop policy if exists mi_servicing_service on public.music_institutional_servicing_events;
create policy mi_servicing_service on public.music_institutional_servicing_events for all to service_role using (true) with check (true);

comment on table public.music_institutional_nav_periods is 'Official NAV only when administrator_final + is_official; parallel estimates never silently replace.';

commit;
