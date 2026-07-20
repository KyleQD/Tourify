-- Phase 17: evidence manifests, implementation reports, protocol lifecycle, compliance.

begin;

create table if not exists public.creator_treaty_ops_review_evidence_manifests (
  id uuid primary key default gen_random_uuid(),
  review_cycle_id uuid references public.creator_treaty_ops_periodic_review_cycles(id) on delete cascade,
  manifest_key text not null,
  content_hash text not null,
  methodology text,
  coverage jsonb not null default '{}'::jsonb,
  stale boolean not null default false,
  minimized boolean not null default true,
  conflicts jsonb not null default '[]'::jsonb,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  unique(review_cycle_id, manifest_key)
);

create table if not exists public.creator_treaty_ops_implementation_reports (
  id uuid primary key default gen_random_uuid(),
  review_cycle_id uuid references public.creator_treaty_ops_periodic_review_cycles(id) on delete set null,
  participant_ref text not null,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'under_review', 'accepted', 'rejected', 'withdrawn'
  )),
  payload jsonb not null default '{}'::jsonb,
  content_hash text not null,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_ops_protocol_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  operation_cycle_id uuid references public.creator_treaty_ops_operation_cycles(id) on delete cascade,
  protocol_key text not null,
  from_state text,
  to_state text not null check (to_state in (
    'draft', 'proposed', 'approved', 'effective', 'suspended', 'terminated', 'superseded', 'rejected'
  )),
  event_type text not null,
  content_hash text not null,
  policy_version text not null default '1.0.0',
  idempotency_key text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_treaty_ops_compliance_review_cases (
  id uuid primary key default gen_random_uuid(),
  operation_cycle_id uuid references public.creator_treaty_ops_operation_cycles(id) on delete cascade,
  case_type text not null,
  status text not null default 'open' check (status in (
    'open', 'under_review', 'corrective_action', 'verified_closed', 'escalated'
  )),
  findings jsonb not null default '{}'::jsonb,
  public_summary text,
  policy_version text not null default '1.0.0',
  created_at timestamptz not null default now()
);

alter table public.creator_treaty_ops_review_evidence_manifests enable row level security;
alter table public.creator_treaty_ops_implementation_reports enable row level security;
alter table public.creator_treaty_ops_protocol_lifecycle_events enable row level security;
alter table public.creator_treaty_ops_compliance_review_cases enable row level security;

revoke all on
  public.creator_treaty_ops_review_evidence_manifests,
  public.creator_treaty_ops_implementation_reports,
  public.creator_treaty_ops_protocol_lifecycle_events,
  public.creator_treaty_ops_compliance_review_cases
from anon, authenticated;

grant select on public.creator_treaty_ops_review_evidence_manifests to authenticated;
grant select on public.creator_treaty_ops_implementation_reports to authenticated;
grant select on public.creator_treaty_ops_protocol_lifecycle_events to authenticated;
grant select on public.creator_treaty_ops_compliance_review_cases to authenticated;

grant all on
  public.creator_treaty_ops_review_evidence_manifests,
  public.creator_treaty_ops_implementation_reports,
  public.creator_treaty_ops_protocol_lifecycle_events,
  public.creator_treaty_ops_compliance_review_cases
to service_role;

drop policy if exists p17_manifests_read on public.creator_treaty_ops_review_evidence_manifests;
create policy p17_manifests_read on public.creator_treaty_ops_review_evidence_manifests for select to authenticated using (true);
drop policy if exists p17_impl_reports_read on public.creator_treaty_ops_implementation_reports;
create policy p17_impl_reports_read on public.creator_treaty_ops_implementation_reports for select to authenticated using (true);
drop policy if exists p17_protocol_events_read on public.creator_treaty_ops_protocol_lifecycle_events;
create policy p17_protocol_events_read on public.creator_treaty_ops_protocol_lifecycle_events for select to authenticated using (true);
drop policy if exists p17_compliance_read on public.creator_treaty_ops_compliance_review_cases;
create policy p17_compliance_read on public.creator_treaty_ops_compliance_review_cases for select to authenticated using (true);

drop policy if exists p17_manifests_service on public.creator_treaty_ops_review_evidence_manifests;
create policy p17_manifests_service on public.creator_treaty_ops_review_evidence_manifests for all to service_role using (true) with check (true);
drop policy if exists p17_impl_reports_service on public.creator_treaty_ops_implementation_reports;
create policy p17_impl_reports_service on public.creator_treaty_ops_implementation_reports for all to service_role using (true) with check (true);
drop policy if exists p17_protocol_events_service on public.creator_treaty_ops_protocol_lifecycle_events;
create policy p17_protocol_events_service on public.creator_treaty_ops_protocol_lifecycle_events for all to service_role using (true) with check (true);
drop policy if exists p17_compliance_service on public.creator_treaty_ops_compliance_review_cases;
create policy p17_compliance_service on public.creator_treaty_ops_compliance_review_cases for all to service_role using (true) with check (true);

commit;
