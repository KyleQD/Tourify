-- Phase 5 S8–S12: risk, benchmarks, secondaries receipts, partner events, outbox, admin, storage.

begin;

do $$
begin
  if to_regclass('public.music_institutional_transaction_cases') is null then
    raise exception 'Apply prior music_institutional migrations first.';
  end if;
end $$;

create table if not exists public.music_institutional_risk_snapshots (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  model_version text not null,
  snapshot jsonb not null,
  input_manifest_hash text not null check (length(input_manifest_hash) = 64),
  disclaimer text not null default 'Risk metrics are analytical estimates, not investment advice or guarantees.',
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_benchmark_versions (
  id uuid primary key default gen_random_uuid(),
  benchmark_key text not null,
  methodology_version text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  methodology jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (benchmark_key, methodology_version)
);

create table if not exists public.music_institutional_report_exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.music_institutional_organizations(id) on delete cascade,
  report_type text not null,
  status text not null default 'queued',
  storage_bucket text not null default 'music-institutional-statements',
  storage_path text,
  payload_hash text check (payload_hash is null or length(payload_hash) = 64),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_secondary_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.music_institutional_organizations(id) on delete cascade,
  fund_vehicle_id uuid references public.music_institutional_fund_vehicles(id) on delete set null,
  transaction_case_id uuid references public.music_institutional_transaction_cases(id) on delete set null,
  partner_id text not null,
  partner_order_id text,
  side text not null check (side in ('buy', 'sell')),
  status text not null default 'submitted_to_partner',
  quantity_minor numeric(78, 0),
  amount_minor bigint,
  currency text,
  payload_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_tenders (
  id uuid primary key default gen_random_uuid(),
  fund_vehicle_id uuid references public.music_institutional_fund_vehicles(id) on delete set null,
  status text not null default 'announced',
  partner_id text,
  partner_ref text,
  terms jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_custody_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.music_institutional_organizations(id) on delete cascade,
  provider_id text not null,
  provider_account_ref text not null,
  status text not null default 'linked',
  payload_hash text not null check (length(payload_hash) = 64),
  observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (provider_id, provider_account_ref)
);

create table if not exists public.music_institutional_token_mirrors (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
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

create table if not exists public.music_institutional_partner_events (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  external_event_id text not null,
  event_type text not null,
  raw_payload jsonb not null,
  payload_hash text not null check (length(payload_hash) = 64),
  signature_verified boolean not null default false,
  processing_status text not null default 'received' check (processing_status in (
    'received', 'processed', 'ignored', 'failed'
  )),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider_id, external_event_id)
);

create table if not exists public.music_institutional_reconciliation_exceptions (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  domain text not null,
  subject_id uuid,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in (
    'open', 'escalated', 'resolved', 'false_positive'
  )),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_outbox_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  aggregate_type text not null,
  aggregate_id uuid not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'completed', 'failed', 'dead_letter'
  )),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action_type text not null,
  subject_type text not null,
  subject_id uuid,
  dual_control_required boolean not null default true,
  dual_control_approved_by uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_institutional_complaints (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  reporter_user_id uuid references auth.users(id) on delete set null,
  subject_type text not null,
  subject_id uuid,
  status text not null default 'open',
  summary text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('music-institutional-datarooms', 'music-institutional-datarooms', false, 52428800, array[
    'application/pdf', 'application/json', 'text/plain', 'image/png', 'image/jpeg'
  ]),
  ('music-institutional-statements', 'music-institutional-statements', false, 52428800, array[
    'application/pdf', 'application/json', 'text/csv'
  ]),
  ('music-institutional-evidence', 'music-institutional-evidence', false, 52428800, array[
    'application/pdf', 'application/json', 'image/png', 'image/jpeg'
  ])
on conflict (id) do nothing;

drop policy if exists music_institutional_datarooms_owner on storage.objects;
create policy music_institutional_datarooms_owner on storage.objects
for all to authenticated
using (bucket_id = 'music-institutional-datarooms' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'music-institutional-datarooms' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists music_institutional_statements_owner on storage.objects;
create policy music_institutional_statements_owner on storage.objects
for select to authenticated
using (bucket_id = 'music-institutional-statements' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists music_institutional_storage_service on storage.objects;
create policy music_institutional_storage_service on storage.objects
for all to service_role using (bucket_id in (
  'music-institutional-datarooms', 'music-institutional-statements', 'music-institutional-evidence'
)) with check (bucket_id in (
  'music-institutional-datarooms', 'music-institutional-statements', 'music-institutional-evidence'
));

alter table public.music_institutional_risk_snapshots enable row level security;
alter table public.music_institutional_benchmark_versions enable row level security;
alter table public.music_institutional_report_exports enable row level security;
alter table public.music_institutional_secondary_orders enable row level security;
alter table public.music_institutional_tenders enable row level security;
alter table public.music_institutional_custody_links enable row level security;
alter table public.music_institutional_token_mirrors enable row level security;
alter table public.music_institutional_partner_events enable row level security;
alter table public.music_institutional_reconciliation_exceptions enable row level security;
alter table public.music_institutional_outbox_events enable row level security;
alter table public.music_institutional_admin_actions enable row level security;
alter table public.music_institutional_complaints enable row level security;

revoke all on
  public.music_institutional_risk_snapshots,
  public.music_institutional_benchmark_versions,
  public.music_institutional_report_exports,
  public.music_institutional_secondary_orders,
  public.music_institutional_tenders,
  public.music_institutional_custody_links,
  public.music_institutional_token_mirrors,
  public.music_institutional_partner_events,
  public.music_institutional_reconciliation_exceptions,
  public.music_institutional_outbox_events,
  public.music_institutional_admin_actions,
  public.music_institutional_complaints
from anon, authenticated;

grant select, insert on public.music_institutional_risk_snapshots to authenticated;
grant select on public.music_institutional_benchmark_versions to authenticated;
grant select, insert on public.music_institutional_report_exports to authenticated;
grant select, insert on public.music_institutional_secondary_orders to authenticated;
grant select on public.music_institutional_tenders to authenticated;
grant select on public.music_institutional_custody_links to authenticated;
grant select on public.music_institutional_token_mirrors to authenticated;
grant select, insert on public.music_institutional_complaints to authenticated;

grant all on
  public.music_institutional_risk_snapshots,
  public.music_institutional_benchmark_versions,
  public.music_institutional_report_exports,
  public.music_institutional_secondary_orders,
  public.music_institutional_tenders,
  public.music_institutional_custody_links,
  public.music_institutional_token_mirrors,
  public.music_institutional_partner_events,
  public.music_institutional_reconciliation_exceptions,
  public.music_institutional_outbox_events,
  public.music_institutional_admin_actions,
  public.music_institutional_complaints
to service_role;

drop policy if exists mi_risk_insert on public.music_institutional_risk_snapshots;
create policy mi_risk_insert on public.music_institutional_risk_snapshots
for insert to authenticated with check (true);
drop policy if exists mi_risk_select on public.music_institutional_risk_snapshots;
create policy mi_risk_select on public.music_institutional_risk_snapshots
for select to authenticated using (true);

drop policy if exists mi_benchmarks_select on public.music_institutional_benchmark_versions;
create policy mi_benchmarks_select on public.music_institutional_benchmark_versions
for select to authenticated using (status = 'published' or true);

drop policy if exists mi_reports_access on public.music_institutional_report_exports;
create policy mi_reports_access on public.music_institutional_report_exports
for all to authenticated using (exists (
  select 1 from public.music_institutional_memberships m
  where m.organization_id = organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
) or created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

drop policy if exists mi_secondary_access on public.music_institutional_secondary_orders;
create policy mi_secondary_access on public.music_institutional_secondary_orders
for all to authenticated using (exists (
  select 1 from public.music_institutional_memberships m
  where m.organization_id = organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
)) with check (true);

drop policy if exists mi_tenders_select on public.music_institutional_tenders;
create policy mi_tenders_select on public.music_institutional_tenders
for select to authenticated using (true);

drop policy if exists mi_custody_select on public.music_institutional_custody_links;
create policy mi_custody_select on public.music_institutional_custody_links
for select to authenticated using (exists (
  select 1 from public.music_institutional_memberships m
  where m.organization_id = organization_id and m.user_id = (select auth.uid()) and m.status = 'active'
));

drop policy if exists mi_token_select on public.music_institutional_token_mirrors;
create policy mi_token_select on public.music_institutional_token_mirrors
for select to authenticated using (true);

drop policy if exists mi_complaints_self on public.music_institutional_complaints;
create policy mi_complaints_self on public.music_institutional_complaints
for all to authenticated using (reporter_user_id = (select auth.uid()) or reporter_user_id is null)
with check (reporter_user_id = (select auth.uid()) or reporter_user_id is null);

drop policy if exists mi_partner_events_service on public.music_institutional_partner_events;
create policy mi_partner_events_service on public.music_institutional_partner_events for all to service_role using (true) with check (true);
drop policy if exists mi_recon_service on public.music_institutional_reconciliation_exceptions;
create policy mi_recon_service on public.music_institutional_reconciliation_exceptions for all to service_role using (true) with check (true);
drop policy if exists mi_outbox_service on public.music_institutional_outbox_events;
create policy mi_outbox_service on public.music_institutional_outbox_events for all to service_role using (true) with check (true);
drop policy if exists mi_admin_actions_service on public.music_institutional_admin_actions;
create policy mi_admin_actions_service on public.music_institutional_admin_actions for all to service_role using (true) with check (true);
drop policy if exists mi_risk_service on public.music_institutional_risk_snapshots;
create policy mi_risk_service on public.music_institutional_risk_snapshots for all to service_role using (true) with check (true);
drop policy if exists mi_benchmarks_service on public.music_institutional_benchmark_versions;
create policy mi_benchmarks_service on public.music_institutional_benchmark_versions for all to service_role using (true) with check (true);
drop policy if exists mi_reports_service on public.music_institutional_report_exports;
create policy mi_reports_service on public.music_institutional_report_exports for all to service_role using (true) with check (true);
drop policy if exists mi_secondary_service on public.music_institutional_secondary_orders;
create policy mi_secondary_service on public.music_institutional_secondary_orders for all to service_role using (true) with check (true);
drop policy if exists mi_tenders_service on public.music_institutional_tenders;
create policy mi_tenders_service on public.music_institutional_tenders for all to service_role using (true) with check (true);
drop policy if exists mi_custody_service on public.music_institutional_custody_links;
create policy mi_custody_service on public.music_institutional_custody_links for all to service_role using (true) with check (true);
drop policy if exists mi_token_service on public.music_institutional_token_mirrors;
create policy mi_token_service on public.music_institutional_token_mirrors for all to service_role using (true) with check (true);
drop policy if exists mi_complaints_service on public.music_institutional_complaints;
create policy mi_complaints_service on public.music_institutional_complaints for all to service_role using (true) with check (true);

comment on table public.music_institutional_secondary_orders is 'Partner secondaries receipts only; Tourify never matches institutional securities orders.';
comment on table public.music_institutional_token_mirrors is 'Optional token mirrors; is_legal_source_of_truth always false.';

commit;
