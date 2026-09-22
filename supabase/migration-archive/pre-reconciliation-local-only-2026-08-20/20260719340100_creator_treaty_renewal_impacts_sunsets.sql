-- Phase 18: impacts, risks, sunsets, successions, decommissions.

begin;

create table if not exists public.creator_treaty_renewal_impact_assessments (
  id uuid primary key default gen_random_uuid(),
  renewal_cycle_id uuid references public.creator_treaty_renewal_cycles(id) on delete cascade,
  assessment_key text not null,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'reviewed', 'accepted', 'rejected'
  )),
  horizons jsonb not null default '{}'::jsonb,
  alternatives jsonb not null default '[]'::jsonb,
  creates_legal_representation boolean not null default false,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  unique(renewal_cycle_id, assessment_key)
);

create table if not exists public.creator_treaty_renewal_horizon_risks (
  id uuid primary key default gen_random_uuid(),
  renewal_cycle_id uuid references public.creator_treaty_renewal_cycles(id) on delete cascade,
  risk_code text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'mitigating', 'accepted', 'closed')),
  description text,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_renewal_sunset_decisions (
  id uuid primary key default gen_random_uuid(),
  renewal_cycle_id uuid references public.creator_treaty_renewal_cycles(id) on delete cascade,
  mode text not null default 'historical_read_only' check (mode in (
    'active', 'historical_read_only', 'essential_continuity', 'sunset_denial'
  )),
  status text not null default 'draft' check (status in (
    'draft', 'proposed', 'approved', 'effective', 'revoked'
  )),
  public_notice_complete boolean not null default false,
  remedy_preserved boolean not null default false,
  effective_at timestamptz,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_renewal_participant_successions (
  id uuid primary key default gen_random_uuid(),
  renewal_cycle_id uuid references public.creator_treaty_renewal_cycles(id) on delete cascade,
  predecessor_ref text not null,
  successor_ref text not null,
  status text not null default 'draft' check (status in (
    'draft', 'proposed', 'approved', 'effective', 'rejected', 'revoked'
  )),
  expands_authority boolean not null default false,
  local_exit_preserved boolean not null default true,
  instrument_hash text,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_renewal_service_decommissions (
  id uuid primary key default gen_random_uuid(),
  renewal_cycle_id uuid references public.creator_treaty_renewal_cycles(id) on delete cascade,
  service_key text not null,
  status text not null default 'planned' check (status in (
    'planned', 'in_progress', 'completed', 'halted', 'revived'
  )),
  continuity_mode text not null default 'read_only_and_wind_down',
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

alter table public.creator_treaty_renewal_impact_assessments enable row level security;
alter table public.creator_treaty_renewal_horizon_risks enable row level security;
alter table public.creator_treaty_renewal_sunset_decisions enable row level security;
alter table public.creator_treaty_renewal_participant_successions enable row level security;
alter table public.creator_treaty_renewal_service_decommissions enable row level security;

revoke all on
  public.creator_treaty_renewal_impact_assessments,
  public.creator_treaty_renewal_horizon_risks,
  public.creator_treaty_renewal_sunset_decisions,
  public.creator_treaty_renewal_participant_successions,
  public.creator_treaty_renewal_service_decommissions
from anon, authenticated;

grant select on public.creator_treaty_renewal_impact_assessments to authenticated;
grant select on public.creator_treaty_renewal_horizon_risks to authenticated;
grant select on public.creator_treaty_renewal_sunset_decisions to authenticated;
grant select on public.creator_treaty_renewal_participant_successions to authenticated;
grant select on public.creator_treaty_renewal_service_decommissions to authenticated;

grant all on
  public.creator_treaty_renewal_impact_assessments,
  public.creator_treaty_renewal_horizon_risks,
  public.creator_treaty_renewal_sunset_decisions,
  public.creator_treaty_renewal_participant_successions,
  public.creator_treaty_renewal_service_decommissions
to service_role;

drop policy if exists p18_impacts_read on public.creator_treaty_renewal_impact_assessments;
create policy p18_impacts_read on public.creator_treaty_renewal_impact_assessments for select to authenticated using (true);
drop policy if exists p18_risks_read on public.creator_treaty_renewal_horizon_risks;
create policy p18_risks_read on public.creator_treaty_renewal_horizon_risks for select to authenticated using (true);
drop policy if exists p18_sunsets_read on public.creator_treaty_renewal_sunset_decisions;
create policy p18_sunsets_read on public.creator_treaty_renewal_sunset_decisions for select to authenticated using (true);
drop policy if exists p18_successions_read on public.creator_treaty_renewal_participant_successions;
create policy p18_successions_read on public.creator_treaty_renewal_participant_successions for select to authenticated using (true);
drop policy if exists p18_decommissions_read on public.creator_treaty_renewal_service_decommissions;
create policy p18_decommissions_read on public.creator_treaty_renewal_service_decommissions for select to authenticated using (true);

drop policy if exists p18_impacts_service on public.creator_treaty_renewal_impact_assessments;
create policy p18_impacts_service on public.creator_treaty_renewal_impact_assessments for all to service_role using (true) with check (true);
drop policy if exists p18_risks_service on public.creator_treaty_renewal_horizon_risks;
create policy p18_risks_service on public.creator_treaty_renewal_horizon_risks for all to service_role using (true) with check (true);
drop policy if exists p18_sunsets_service on public.creator_treaty_renewal_sunset_decisions;
create policy p18_sunsets_service on public.creator_treaty_renewal_sunset_decisions for all to service_role using (true) with check (true);
drop policy if exists p18_successions_service on public.creator_treaty_renewal_participant_successions;
create policy p18_successions_service on public.creator_treaty_renewal_participant_successions for all to service_role using (true) with check (true);
drop policy if exists p18_decommissions_service on public.creator_treaty_renewal_service_decommissions;
create policy p18_decommissions_service on public.creator_treaty_renewal_service_decommissions for all to service_role using (true) with check (true);

commit;
