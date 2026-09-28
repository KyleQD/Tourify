-- Phase 14: mutual recognition, interop profiles, decisions.

begin;

create table if not exists public.creator_interop_recognitions (
  id uuid primary key default gen_random_uuid(),
  network_id uuid references public.creator_interop_networks(id) on delete set null,
  source_constitution_id uuid,
  target_constitution_id uuid,
  source_type text not null default 'phase13_constitution',
  source_id text not null,
  source_version text not null default '1',
  status text not null default 'proposed' check (status in (
    'proposed', 'active', 'suspended', 'revoked', 'disputed'
  )),
  purpose text not null default 'sandbox_recognition',
  disputed boolean not null default false,
  revoked boolean not null default false,
  claims_treaty_status boolean not null default false,
  claims_universal_representation boolean not null default false,
  policy_version text not null default '1.0.0',
  fresh_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_interop_profiles (
  id uuid primary key default gen_random_uuid(),
  network_id uuid references public.creator_interop_networks(id) on delete cascade,
  profile_key text not null,
  version text not null,
  status text not null default 'draft' check (status in (
    'draft', 'sandbox', 'approved', 'deprecated'
  )),
  specification_uri text,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  unique(network_id, profile_key, version)
);

create table if not exists public.creator_interop_decisions (
  id uuid primary key default gen_random_uuid(),
  network_id uuid references public.creator_interop_networks(id) on delete set null,
  approval_package_id uuid references public.future_phase14_approval_packages(id) on delete set null,
  decision_type text not null,
  status text not null default 'draft' check (status in (
    'draft', 'open', 'approved', 'rejected', 'blocked', 'withdrawn'
  )),
  result jsonb not null default '{}'::jsonb,
  policy_version text not null default '1.0.0',
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.creator_interop_recognitions enable row level security;
alter table public.creator_interop_profiles enable row level security;
alter table public.creator_interop_decisions enable row level security;

revoke all on
  public.creator_interop_recognitions,
  public.creator_interop_profiles,
  public.creator_interop_decisions
from anon, authenticated;

grant select on public.creator_interop_recognitions to authenticated;
grant select on public.creator_interop_profiles to authenticated;
grant select on public.creator_interop_decisions to authenticated;

grant all on
  public.creator_interop_recognitions,
  public.creator_interop_profiles,
  public.creator_interop_decisions
to service_role;

drop policy if exists p14_recognitions_read on public.creator_interop_recognitions;
create policy p14_recognitions_read on public.creator_interop_recognitions for select to authenticated using (true);
drop policy if exists p14_profiles_read on public.creator_interop_profiles;
create policy p14_profiles_read on public.creator_interop_profiles for select to authenticated using (true);
drop policy if exists p14_decisions_read on public.creator_interop_decisions;
create policy p14_decisions_read on public.creator_interop_decisions for select to authenticated using (true);

drop policy if exists p14_recognitions_service on public.creator_interop_recognitions;
create policy p14_recognitions_service on public.creator_interop_recognitions for all to service_role using (true) with check (true);
drop policy if exists p14_profiles_service on public.creator_interop_profiles;
create policy p14_profiles_service on public.creator_interop_profiles for all to service_role using (true) with check (true);
drop policy if exists p14_decisions_service on public.creator_interop_decisions;
create policy p14_decisions_service on public.creator_interop_decisions for all to service_role using (true) with check (true);

comment on table public.creator_interop_recognitions is 'Mutual recognition stubs; Phase 13 constitutions referenced as inputs only; never rewrite.';

commit;
