-- Phase 4 P4-09/P4-10/P4-11: surveillance, portfolio, distributions, ops, outbox, storage.

begin;

do $$
begin
  if to_regclass('public.music_marketplace_offerings') is null then
    raise exception 'Missing public.music_marketplace_offerings. Apply 20260718001450_music_marketplace_offerings_investors.sql first.';
  end if;
  if to_regclass('public.music_marketplace_security_classes') is null then
    raise exception 'Missing public.music_marketplace_security_classes. Apply 20260718001540_music_marketplace_positions_orders.sql first.';
  end if;
end $$;

create table if not exists public.music_marketplace_partner_event_receipts (
  id uuid primary key default gen_random_uuid(),
  partner_id text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  payload_hash text not null check (length(payload_hash) = 64),
  signature_verified boolean not null default false,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'received' check (processing_status in (
    'received', 'processed', 'ignored', 'failed'
  )),
  unique (partner_id, provider_event_id)
);

create table if not exists public.music_marketplace_outbox_events (
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

create table if not exists public.music_marketplace_surveillance_alerts (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  alert_type text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  subject_refs jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in (
    'open', 'escalated_to_partner', 'resolved', 'false_positive'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_communications_archives (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid references public.music_marketplace_offerings(id) on delete set null,
  channel text not null,
  content_hash text not null check (length(content_hash) = 64),
  approval_status text not null default 'pending' check (approval_status in (
    'pending', 'approved', 'rejected', 'archived'
  )),
  storage_bucket text not null default 'music-marketplace-comms',
  storage_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_distributions (
  id uuid primary key default gen_random_uuid(),
  security_class_id uuid not null references public.music_marketplace_security_classes(id) on delete restrict,
  period_label text not null,
  currency text not null default 'USD',
  total_minor bigint not null check (total_minor >= 0),
  status text not null default 'draft' check (status in (
    'draft', 'partner_confirmed', 'posted', 'reconciled', 'break'
  )),
  royalty_period_ref text,
  partner_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_distribution_lots (
  id uuid primary key default gen_random_uuid(),
  distribution_id uuid not null references public.music_marketplace_distributions(id) on delete cascade,
  investor_user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid references public.music_marketplace_positions(id) on delete set null,
  amount_minor bigint not null check (amount_minor >= 0),
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_tax_document_links (
  id uuid primary key default gen_random_uuid(),
  investor_user_id uuid not null references auth.users(id) on delete cascade,
  tax_year integer not null,
  document_type text not null,
  partner_id text not null,
  partner_document_ref text not null,
  access_url_expires_at timestamptz,
  payload_hash text not null check (length(payload_hash) = 64),
  created_at timestamptz not null default now(),
  unique (partner_id, partner_document_ref)
);

create table if not exists public.music_marketplace_issuer_reports (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.music_marketplace_offerings(id) on delete cascade,
  report_type text not null,
  due_at timestamptz not null,
  status text not null default 'scheduled' check (status in (
    'scheduled', 'draft', 'filed', 'overdue', 'waived'
  )),
  disclosure_version_id uuid references public.music_marketplace_offering_versions(id) on delete set null,
  partner_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_complaints (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  reporter_user_id uuid references auth.users(id) on delete set null,
  subject_type text not null,
  subject_id uuid,
  status text not null default 'open' check (status in (
    'open', 'investigating', 'escalated', 'resolved', 'closed'
  )),
  summary text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_marketplace_admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action_type text not null,
  subject_type text not null,
  subject_id uuid,
  dual_control_required boolean not null default false,
  dual_control_approved_by uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Private storage buckets for disclosures, statements, evidence, comms
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('music-marketplace-disclosures', 'music-marketplace-disclosures', false, 52428800, array[
    'application/pdf', 'application/json', 'text/plain', 'image/png', 'image/jpeg'
  ]),
  ('music-marketplace-statements', 'music-marketplace-statements', false, 52428800, array[
    'application/pdf', 'application/json', 'text/csv'
  ]),
  ('music-marketplace-evidence', 'music-marketplace-evidence', false, 52428800, array[
    'application/pdf', 'application/json', 'image/png', 'image/jpeg'
  ]),
  ('music-marketplace-comms', 'music-marketplace-comms', false, 20971520, array[
    'application/pdf', 'text/html', 'text/plain', 'application/json'
  ])
on conflict (id) do nothing;

drop policy if exists music_marketplace_disclosures_owner on storage.objects;
drop policy if exists music_marketplace_disclosures_owner on storage.objects;
create policy music_marketplace_disclosures_owner on storage.objects
for all to authenticated
using (bucket_id = 'music-marketplace-disclosures' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'music-marketplace-disclosures' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists music_marketplace_statements_owner on storage.objects;
drop policy if exists music_marketplace_statements_owner on storage.objects;
create policy music_marketplace_statements_owner on storage.objects
for select to authenticated
using (bucket_id = 'music-marketplace-statements' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists music_marketplace_evidence_service on storage.objects;
drop policy if exists music_marketplace_evidence_service on storage.objects;
create policy music_marketplace_evidence_service on storage.objects
for all to service_role using (bucket_id in (
  'music-marketplace-disclosures', 'music-marketplace-statements',
  'music-marketplace-evidence', 'music-marketplace-comms'
)) with check (bucket_id in (
  'music-marketplace-disclosures', 'music-marketplace-statements',
  'music-marketplace-evidence', 'music-marketplace-comms'
));

alter table public.music_marketplace_partner_event_receipts enable row level security;
alter table public.music_marketplace_outbox_events enable row level security;
alter table public.music_marketplace_surveillance_alerts enable row level security;
alter table public.music_marketplace_communications_archives enable row level security;
alter table public.music_marketplace_distributions enable row level security;
alter table public.music_marketplace_distribution_lots enable row level security;
alter table public.music_marketplace_tax_document_links enable row level security;
alter table public.music_marketplace_issuer_reports enable row level security;
alter table public.music_marketplace_complaints enable row level security;
alter table public.music_marketplace_admin_actions enable row level security;

revoke all on
  public.music_marketplace_partner_event_receipts,
  public.music_marketplace_outbox_events,
  public.music_marketplace_surveillance_alerts,
  public.music_marketplace_communications_archives,
  public.music_marketplace_distributions,
  public.music_marketplace_distribution_lots,
  public.music_marketplace_tax_document_links,
  public.music_marketplace_issuer_reports,
  public.music_marketplace_complaints,
  public.music_marketplace_admin_actions
from anon, authenticated;

grant select on public.music_marketplace_surveillance_alerts to authenticated;
grant select, insert on public.music_marketplace_communications_archives to authenticated;
grant select on public.music_marketplace_distributions to authenticated;
grant select on public.music_marketplace_distribution_lots to authenticated;
grant select on public.music_marketplace_tax_document_links to authenticated;
grant select on public.music_marketplace_issuer_reports to authenticated;
grant select, insert on public.music_marketplace_complaints to authenticated;

grant all on
  public.music_marketplace_partner_event_receipts,
  public.music_marketplace_outbox_events,
  public.music_marketplace_surveillance_alerts,
  public.music_marketplace_communications_archives,
  public.music_marketplace_distributions,
  public.music_marketplace_distribution_lots,
  public.music_marketplace_tax_document_links,
  public.music_marketplace_issuer_reports,
  public.music_marketplace_complaints,
  public.music_marketplace_admin_actions
to service_role;

drop policy if exists mm_receipts_service on public.music_marketplace_partner_event_receipts;
create policy mm_receipts_service on public.music_marketplace_partner_event_receipts for all to service_role using (true) with check (true);
drop policy if exists mm_outbox_service on public.music_marketplace_outbox_events;
create policy mm_outbox_service on public.music_marketplace_outbox_events for all to service_role using (true) with check (true);

drop policy if exists mm_alerts_select on public.music_marketplace_surveillance_alerts;
create policy mm_alerts_select on public.music_marketplace_surveillance_alerts
for select to authenticated using (true);
drop policy if exists mm_alerts_service on public.music_marketplace_surveillance_alerts;
create policy mm_alerts_service on public.music_marketplace_surveillance_alerts for all to service_role using (true) with check (true);

drop policy if exists mm_comms_select on public.music_marketplace_communications_archives;
create policy mm_comms_select on public.music_marketplace_communications_archives
for select to authenticated using (
  created_by = (select auth.uid()) or exists (
    select 1 from public.music_marketplace_offerings o
    join public.music_marketplace_issuers i on i.id = o.issuer_id
    where o.id = offering_id and i.owner_user_id = (select auth.uid())
  )
);
drop policy if exists mm_comms_insert on public.music_marketplace_communications_archives;
create policy mm_comms_insert on public.music_marketplace_communications_archives
for insert to authenticated with check (created_by = (select auth.uid()));
drop policy if exists mm_comms_service on public.music_marketplace_communications_archives;
create policy mm_comms_service on public.music_marketplace_communications_archives for all to service_role using (true) with check (true);

drop policy if exists mm_distributions_select on public.music_marketplace_distributions;
create policy mm_distributions_select on public.music_marketplace_distributions
for select to authenticated using (exists (
  select 1 from public.music_marketplace_distribution_lots l
  where l.distribution_id = id and l.investor_user_id = (select auth.uid())
) or exists (
  select 1 from public.music_marketplace_security_classes sc
  join public.music_marketplace_offerings o on o.id = sc.offering_id
  join public.music_marketplace_issuers i on i.id = o.issuer_id
  where sc.id = security_class_id and i.owner_user_id = (select auth.uid())
));
drop policy if exists mm_distributions_service on public.music_marketplace_distributions;
create policy mm_distributions_service on public.music_marketplace_distributions for all to service_role using (true) with check (true);

drop policy if exists mm_dist_lots_self on public.music_marketplace_distribution_lots;
create policy mm_dist_lots_self on public.music_marketplace_distribution_lots
for select to authenticated using ((select auth.uid()) = investor_user_id);
drop policy if exists mm_dist_lots_service on public.music_marketplace_distribution_lots;
create policy mm_dist_lots_service on public.music_marketplace_distribution_lots for all to service_role using (true) with check (true);

drop policy if exists mm_tax_docs_self on public.music_marketplace_tax_document_links;
create policy mm_tax_docs_self on public.music_marketplace_tax_document_links
for select to authenticated using ((select auth.uid()) = investor_user_id);
drop policy if exists mm_tax_docs_service on public.music_marketplace_tax_document_links;
create policy mm_tax_docs_service on public.music_marketplace_tax_document_links for all to service_role using (true) with check (true);

drop policy if exists mm_issuer_reports_owner on public.music_marketplace_issuer_reports;
create policy mm_issuer_reports_owner on public.music_marketplace_issuer_reports
for select to authenticated using (exists (
  select 1 from public.music_marketplace_offerings o
  join public.music_marketplace_issuers i on i.id = o.issuer_id
  where o.id = offering_id and i.owner_user_id = (select auth.uid())
));
drop policy if exists mm_issuer_reports_service on public.music_marketplace_issuer_reports;
create policy mm_issuer_reports_service on public.music_marketplace_issuer_reports for all to service_role using (true) with check (true);

drop policy if exists mm_complaints_self on public.music_marketplace_complaints;
create policy mm_complaints_self on public.music_marketplace_complaints
for all to authenticated using (reporter_user_id = (select auth.uid()) or reporter_user_id is null)
with check (reporter_user_id = (select auth.uid()) or reporter_user_id is null);
drop policy if exists mm_complaints_service on public.music_marketplace_complaints;
create policy mm_complaints_service on public.music_marketplace_complaints for all to service_role using (true) with check (true);

drop policy if exists mm_admin_actions_service on public.music_marketplace_admin_actions;
create policy mm_admin_actions_service on public.music_marketplace_admin_actions for all to service_role using (true) with check (true);

comment on table public.music_marketplace_partner_event_receipts is 'Immutable raw partner webhook receipts with signature verification.';
comment on table public.music_marketplace_outbox_events is 'Outbox for partner poll/retry, TA reconcile, settlement breaks, surveillance.';

commit;
