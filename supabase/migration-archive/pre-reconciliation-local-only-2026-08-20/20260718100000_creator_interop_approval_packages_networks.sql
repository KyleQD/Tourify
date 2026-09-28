-- Phase 14 S0–S2: approval packages, networks, flags.

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

-- Durable record named in Phase 13 → Phase 14 handoff
create table if not exists public.future_phase14_approval_packages (
  id uuid primary key default gen_random_uuid(),
  package_key text not null unique,
  status text not null default 'draft' check (status in (
    'draft', 'review', 'executed', 'rejected', 'expired'
  )),
  title text not null,
  jurisdiction text,
  dual_control boolean not null default false,
  public_notice_complete boolean not null default false,
  independent_review_complete boolean not null default false,
  state_or_io_participation_requested boolean not null default false,
  state_or_io_package_attached boolean not null default false,
  policy_version text not null default '1.0.0',
  evidence_manifest jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creator_interop_networks (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  status text not null default 'draft' check (status in (
    'draft', 'sandbox', 'limited_production', 'production', 'suspended', 'retired'
  )),
  jurisdiction text,
  policy_version text not null default '1.0.0',
  production_authority boolean not null default false,
  claims_treaty_status boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('creator_interop_convention_readiness_enabled', 'Interop convention readiness', 'Readiness hub + admin ops.', false, 0),
  ('creator_interop_convention_drafting_enabled', 'Interop convention drafting', 'Network drafting.', false, 0),
  ('creator_interop_network_registry_enabled', 'Interop network registry', 'Network registry.', false, 0),
  ('creator_interop_mutual_recognition_enabled', 'Interop mutual recognition', 'Compact recognition stubs.', false, 0),
  ('creator_interop_approval_package_enabled', 'Interop approval packages', 'Approval package records.', false, 0),
  ('creator_interop_public_status_enabled', 'Interop public status', 'Public status stubs.', false, 0),
  ('creator_interop_limited_production_enabled', 'Interop limited production', 'Separately gated.', false, 0),
  ('creator_interop_treaty_status_enabled', 'Treaty status', 'HARD-DISABLED.', false, 0),
  ('creator_interop_universal_representation_enabled', 'Universal representation', 'HARD-DISABLED.', false, 0),
  ('creator_interop_state_io_participation_enabled', 'State/IO participation', 'HARD-DISABLED.', false, 0),
  ('creator_interop_collective_action_enabled', 'Collective action', 'HARD-DISABLED.', false, 0),
  ('creator_interop_irreversible_asset_transfer_enabled', 'Irreversible asset transfer', 'HARD-DISABLED.', false, 0),
  ('creator_interop_emergency_override_enabled', 'Emergency override', 'HARD-DISABLED.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

alter table public.future_phase14_approval_packages enable row level security;
alter table public.creator_interop_networks enable row level security;

revoke all on public.future_phase14_approval_packages, public.creator_interop_networks from anon, authenticated;
grant select on public.future_phase14_approval_packages to authenticated;
grant select on public.creator_interop_networks to authenticated;
grant all on public.future_phase14_approval_packages, public.creator_interop_networks to service_role;

drop policy if exists p14_packages_read on public.future_phase14_approval_packages;
create policy p14_packages_read on public.future_phase14_approval_packages for select to authenticated using (true);
drop policy if exists p14_networks_read on public.creator_interop_networks;
create policy p14_networks_read on public.creator_interop_networks for select to authenticated using (true);
drop policy if exists p14_packages_service on public.future_phase14_approval_packages;
create policy p14_packages_service on public.future_phase14_approval_packages for all to service_role using (true) with check (true);
drop policy if exists p14_networks_service on public.creator_interop_networks;
create policy p14_networks_service on public.creator_interop_networks for all to service_role using (true) with check (true);

comment on table public.future_phase14_approval_packages is 'Phase 14 durable approval packages; Phase 13 flags never authorize convention launch.';

commit;
