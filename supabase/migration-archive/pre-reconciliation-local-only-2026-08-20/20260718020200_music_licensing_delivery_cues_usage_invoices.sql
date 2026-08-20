-- Phase 6 S7–S8: delivery gates, cue sheets, usage, invoices, outbox.

begin;

create table if not exists public.music_license_deliveries (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.music_license_agreements(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete set null,
  storage_bucket text not null,
  storage_path text not null,
  watermark_id text,
  purpose text not null check (purpose in ('preview', 'final', 'stem', 'artwork', 'other')),
  status text not null default 'held' check (status in (
    'held', 'released', 'expired', 'revoked'
  )),
  expires_at timestamptz,
  released_at timestamptz,
  hold_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_cue_sheets (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid references public.music_license_agreements(id) on delete set null,
  project_id uuid not null references public.music_licensing_projects(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'accepted', 'rejected', 'amended'
  )),
  production_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

create table if not exists public.music_cue_sheet_cues (
  id uuid primary key default gen_random_uuid(),
  cue_sheet_id uuid not null references public.music_cue_sheets(id) on delete cascade,
  position integer not null,
  work_id uuid,
  recording_id uuid,
  artist_music_id uuid references public.artist_music(id) on delete set null,
  duration_seconds integer not null check (duration_seconds >= 0),
  use_type text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.music_license_usage_reports (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.music_license_agreements(id) on delete cascade,
  period_start date,
  period_end date,
  source text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in (
    'received', 'validated', 'rejected', 'handed_off_phase3'
  )),
  phase3_handoff_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_license_invoices (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.music_license_agreements(id) on delete cascade,
  provider_invoice_id text,
  currency text not null default 'USD',
  amount_minor bigint not null check (amount_minor >= 0),
  status text not null default 'draft' check (status in (
    'draft', 'issued', 'paid', 'partially_paid', 'void', 'disputed', 'reconciled'
  )),
  due_at timestamptz,
  paid_at timestamptz,
  payment_provider_event_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.music_licensing_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in (
    'pending', 'processing', 'delivered', 'failed', 'dead'
  )),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists music_licensing_outbox_pending_idx
  on public.music_licensing_outbox (status, available_at)
  where status in ('pending', 'failed');

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('music-licensing-briefs', 'music-licensing-briefs', false, 52428800),
  ('music-licensing-contracts', 'music-licensing-contracts', false, 104857600),
  ('music-licensing-stems', 'music-licensing-stems', false, 524288000),
  ('music-licensing-evidence', 'music-licensing-evidence', false, 104857600)
on conflict (id) do nothing;

alter table public.music_license_deliveries enable row level security;
alter table public.music_cue_sheets enable row level security;
alter table public.music_cue_sheet_cues enable row level security;
alter table public.music_license_usage_reports enable row level security;
alter table public.music_license_invoices enable row level security;
alter table public.music_licensing_outbox enable row level security;

revoke all on
  public.music_license_deliveries,
  public.music_cue_sheets,
  public.music_cue_sheet_cues,
  public.music_license_usage_reports,
  public.music_license_invoices,
  public.music_licensing_outbox
from anon, authenticated;

grant select on public.music_license_deliveries to authenticated;
grant select, insert, update on public.music_cue_sheets to authenticated;
grant select, insert on public.music_cue_sheet_cues to authenticated;
grant select, insert on public.music_license_usage_reports to authenticated;
grant select on public.music_license_invoices to authenticated;

grant all on
  public.music_license_deliveries,
  public.music_cue_sheets,
  public.music_cue_sheet_cues,
  public.music_license_usage_reports,
  public.music_license_invoices,
  public.music_licensing_outbox
to service_role;

drop policy if exists ml_deliveries_access on public.music_license_deliveries;
create policy ml_deliveries_access on public.music_license_deliveries
for select to authenticated using (
  recipient_user_id = (select auth.uid())
  or exists (
    select 1 from public.music_license_agreements a
    join public.music_license_requests r on r.id = a.request_id
    where a.id = agreement_id and r.created_by = (select auth.uid())
  )
);

drop policy if exists ml_cues_access on public.music_cue_sheets;
create policy ml_cues_access on public.music_cue_sheets
for all to authenticated using (exists (
  select 1 from public.music_licensing_projects p
  where p.id = project_id and (
    p.created_by = (select auth.uid())
    or exists (
      select 1 from public.music_licensing_project_members m
      where m.project_id = p.id and m.user_id = (select auth.uid()) and m.status = 'active'
    )
  )
)) with check (true);

drop policy if exists ml_cue_rows_access on public.music_cue_sheet_cues;
create policy ml_cue_rows_access on public.music_cue_sheet_cues
for all to authenticated using (exists (
  select 1 from public.music_cue_sheets s
  join public.music_licensing_projects p on p.id = s.project_id
  where s.id = cue_sheet_id and p.created_by = (select auth.uid())
)) with check (true);

drop policy if exists ml_usage_access on public.music_license_usage_reports;
create policy ml_usage_access on public.music_license_usage_reports
for select to authenticated using (exists (
  select 1 from public.music_license_agreements a
  join public.music_license_requests r on r.id = a.request_id
  where a.id = agreement_id and r.created_by = (select auth.uid())
));

drop policy if exists ml_invoices_access on public.music_license_invoices;
create policy ml_invoices_access on public.music_license_invoices
for select to authenticated using (exists (
  select 1 from public.music_license_agreements a
  join public.music_license_requests r on r.id = a.request_id
  where a.id = agreement_id and r.created_by = (select auth.uid())
));

drop policy if exists ml_deliveries_service on public.music_license_deliveries;
create policy ml_deliveries_service on public.music_license_deliveries for all to service_role using (true) with check (true);
drop policy if exists ml_cues_service on public.music_cue_sheets;
create policy ml_cues_service on public.music_cue_sheets for all to service_role using (true) with check (true);
drop policy if exists ml_cue_rows_service on public.music_cue_sheet_cues;
create policy ml_cue_rows_service on public.music_cue_sheet_cues for all to service_role using (true) with check (true);
drop policy if exists ml_usage_service on public.music_license_usage_reports;
create policy ml_usage_service on public.music_license_usage_reports for all to service_role using (true) with check (true);
drop policy if exists ml_invoices_service on public.music_license_invoices;
create policy ml_invoices_service on public.music_license_invoices for all to service_role using (true) with check (true);
drop policy if exists ml_outbox_service on public.music_licensing_outbox;
create policy ml_outbox_service on public.music_licensing_outbox for all to service_role using (true) with check (true);

comment on table public.music_license_deliveries is 'Delivery held until agreement is effective; preview is not a licence.';
comment on table public.music_license_usage_reports is 'Usage handoff to Phase 3 royalty ledger; never rewrites posted journals.';

commit;
