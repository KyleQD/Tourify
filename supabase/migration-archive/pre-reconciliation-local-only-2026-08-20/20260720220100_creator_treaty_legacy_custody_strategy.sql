-- Phase 19: century-scale strategies, successor archives, cultural continuity.

begin;

create table if not exists public.creator_treaty_legacy_strategies (
  id uuid primary key default gen_random_uuid(),
  legacy_cycle_id uuid references public.creator_treaty_legacy_cycles(id) on delete cascade,
  strategy_key text not null,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'reviewed', 'accepted', 'rejected'
  )),
  horizon_years integer not null default 100,
  claims_perpetuity boolean not null default false,
  open_specs_ref text,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  unique(legacy_cycle_id, strategy_key)
);

create table if not exists public.creator_treaty_legacy_successor_archives (
  id uuid primary key default gen_random_uuid(),
  legacy_cycle_id uuid references public.creator_treaty_legacy_cycles(id) on delete cascade,
  archive_key text not null unique,
  custodian_ref text not null,
  independence_class text not null default 'candidate',
  status text not null default 'draft' check (status in (
    'draft', 'nominated', 'verified', 'active', 'retired', 'rejected'
  )),
  local_exit_preserved boolean not null default true,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_legacy_cultural_continuity (
  id uuid primary key default gen_random_uuid(),
  legacy_cycle_id uuid references public.creator_treaty_legacy_cycles(id) on delete cascade,
  continuity_key text not null,
  languages jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in (
    'draft', 'proposed', 'approved', 'effective', 'revoked'
  )),
  overrides_creator_rights boolean not null default false,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  unique(legacy_cycle_id, continuity_key)
);

alter table public.creator_treaty_legacy_strategies enable row level security;
alter table public.creator_treaty_legacy_successor_archives enable row level security;
alter table public.creator_treaty_legacy_cultural_continuity enable row level security;

revoke all on
  public.creator_treaty_legacy_strategies,
  public.creator_treaty_legacy_successor_archives,
  public.creator_treaty_legacy_cultural_continuity
from anon, authenticated;

grant select on public.creator_treaty_legacy_strategies to authenticated;
grant select on public.creator_treaty_legacy_successor_archives to authenticated;
grant select on public.creator_treaty_legacy_cultural_continuity to authenticated;

grant all on
  public.creator_treaty_legacy_strategies,
  public.creator_treaty_legacy_successor_archives,
  public.creator_treaty_legacy_cultural_continuity
to service_role;

drop policy if exists p19_strategies_read on public.creator_treaty_legacy_strategies;
create policy p19_strategies_read on public.creator_treaty_legacy_strategies for select to authenticated using (true);
drop policy if exists p19_archives_read on public.creator_treaty_legacy_successor_archives;
create policy p19_archives_read on public.creator_treaty_legacy_successor_archives for select to authenticated using (true);
drop policy if exists p19_cultural_read on public.creator_treaty_legacy_cultural_continuity;
create policy p19_cultural_read on public.creator_treaty_legacy_cultural_continuity for select to authenticated using (true);

drop policy if exists p19_strategies_service on public.creator_treaty_legacy_strategies;
create policy p19_strategies_service on public.creator_treaty_legacy_strategies for all to service_role using (true) with check (true);
drop policy if exists p19_archives_service on public.creator_treaty_legacy_successor_archives;
create policy p19_archives_service on public.creator_treaty_legacy_successor_archives for all to service_role using (true) with check (true);
drop policy if exists p19_cultural_service on public.creator_treaty_legacy_cultural_continuity;
create policy p19_cultural_service on public.creator_treaty_legacy_cultural_continuity for all to service_role using (true) with check (true);

commit;
