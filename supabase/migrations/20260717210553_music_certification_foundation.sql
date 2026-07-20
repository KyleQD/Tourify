begin;

create table public.music_certification_cases (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  track_id uuid not null references public.artist_music(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  case_version integer not null default 1 check (case_version > 0),
  based_on_declaration_id uuid not null references public.music_upload_declarations(id) on delete restrict,
  certification_type text not null default 'human_created' check (certification_type in ('origin_record', 'human_created', 'rights_passport')),
  standard_version text not null,
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'in_review', 'needs_information', 'approved',
    'rejected', 'withdrawn', 'suspended', 'revoked'
  )),
  requested_level smallint not null default 1 check (requested_level between 0 and 5),
  disclosures jsonb not null default '{}'::jsonb,
  contributor_confirmation boolean not null default false,
  idempotency_key text not null,
  submitted_at timestamptz,
  review_started_at timestamptz,
  decided_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (track_id, case_version),
  unique (user_id, idempotency_key)
);

create index music_certification_cases_owner_status_idx
  on public.music_certification_cases (user_id, status, updated_at desc);
create index music_certification_cases_queue_idx
  on public.music_certification_cases (status, submitted_at)
  where status in ('submitted', 'in_review', 'needs_information');

create table public.music_certification_evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.music_certification_cases(id) on delete cascade,
  track_id uuid not null references public.artist_music(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence_type text not null,
  storage_bucket text not null default 'music-certification-evidence',
  storage_path text not null,
  original_filename text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  external_reference text,
  sha256 text check (sha256 is null or length(sha256) = 64),
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'registered' check (status in ('prepared', 'registered', 'accepted', 'rejected', 'withdrawn')),
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (case_id, storage_bucket, storage_path)
);

create table public.music_certification_reviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.music_certification_cases(id) on delete cascade,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  decision text not null check (decision in ('start_review', 'needs_information', 'approve', 'reject', 'suspend', 'reactivate', 'revoke', 'supersede')),
  reason_codes text[] not null default '{}',
  findings jsonb not null default '{}'::jsonb,
  artist_message text,
  internal_notes text,
  standard_version text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table public.music_certification_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.music_certification_cases(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'system' check (actor_type in ('artist', 'reviewer', 'system')),
  event_type text not null,
  from_status text,
  to_status text,
  event_data jsonb not null default '{}'::jsonb,
  artist_visible boolean not null default true,
  request_id text,
  created_at timestamptz not null default now()
);

create unique index music_certification_events_request_idx
  on public.music_certification_events (case_id, event_type, request_id) where request_id is not null;

create table public.music_certificates (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  case_id uuid not null references public.music_certification_cases(id) on delete restrict,
  track_id uuid not null references public.artist_music(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  origin_record_id uuid references public.music_origin_records(id) on delete restrict,
  certificate_version integer not null check (certificate_version > 0),
  standard_version text not null,
  certification_level smallint not null check (certification_level between 0 and 5),
  manifest_json jsonb not null,
  manifest_hash text not null check (length(manifest_hash) = 64),
  status text not null default 'active' check (status in ('active', 'suspended', 'revoked', 'superseded')),
  issued_at timestamptz not null default now(),
  suspended_at timestamptz,
  reactivated_at timestamptz,
  revoked_at timestamptz,
  superseded_at timestamptz,
  superseded_by uuid references public.music_certificates(id),
  created_at timestamptz not null default now(),
  unique (track_id, certificate_version),
  unique (track_id, manifest_hash)
);

create table public.content_report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.content_reports(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.content_reports
  drop constraint if exists content_reports_music_trust_reason_check,
  add constraint content_reports_music_trust_reason_check check (reason in (
    'copyright_infringement', 'not_original_content', 'inappropriate', 'other',
    'ownership', 'impersonation', 'likeness', 'ai_disclosure', 'certification_dispute'
  )) not valid;

alter table public.music_certification_cases enable row level security;
alter table public.music_certification_evidence enable row level security;
alter table public.music_certification_reviews enable row level security;
alter table public.music_certification_events enable row level security;
alter table public.music_certificates enable row level security;
alter table public.content_report_events enable row level security;

revoke all on public.music_certification_cases, public.music_certification_evidence,
  public.music_certification_reviews, public.music_certification_events,
  public.music_certificates, public.content_report_events from anon, authenticated;
grant select on public.music_certification_cases, public.music_certification_evidence to authenticated;
grant select on public.music_certification_events, public.music_certificates, public.content_report_events to authenticated;
grant all on public.music_certification_cases, public.music_certification_evidence,
  public.music_certification_reviews, public.music_certification_events,
  public.music_certificates, public.content_report_events to service_role;

create policy certification_cases_owner_select on public.music_certification_cases
for select to authenticated using ((select auth.uid()) = user_id);
create policy certification_cases_owner_insert on public.music_certification_cases
for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.artist_music track
    where track.id = track_id and track.user_id = (select auth.uid())
      and track.active_declaration_id = based_on_declaration_id
  )
);
create policy certification_cases_owner_update on public.music_certification_cases
for update to authenticated
using ((select auth.uid()) = user_id and status in ('draft', 'needs_information'))
with check ((select auth.uid()) = user_id and status in ('draft', 'submitted', 'withdrawn'));
create policy certification_evidence_owner_select on public.music_certification_evidence
for select to authenticated using ((select auth.uid()) = user_id);
create policy certification_evidence_owner_insert on public.music_certification_evidence
for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.music_certification_cases certification_case
    where certification_case.id = case_id
      and certification_case.user_id = (select auth.uid())
      and certification_case.track_id = track_id
      and certification_case.status in ('draft', 'needs_information')
  )
);
create policy certification_events_owner_select on public.music_certification_events
for select to authenticated using (
  artist_visible and exists (
    select 1 from public.music_certification_cases certification_case
    where certification_case.id = case_id
      and certification_case.user_id = (select auth.uid())
  )
);
create policy certificates_owner_select on public.music_certificates
for select to authenticated using ((select auth.uid()) = user_id);
create policy report_events_reporter_select on public.content_report_events
for select to authenticated using (exists (
  select 1 from public.content_reports report
  where report.id = report_id and report.reporter_user_id = (select auth.uid())
));

create policy certification_cases_service_all on public.music_certification_cases
for all to service_role using (true) with check (true);
create policy certification_evidence_service_all on public.music_certification_evidence
for all to service_role using (true) with check (true);
create policy certification_reviews_service_all on public.music_certification_reviews
for all to service_role using (true) with check (true);
create policy certification_events_service_all on public.music_certification_events
for all to service_role using (true) with check (true);
create policy certificates_service_all on public.music_certificates
for all to service_role using (true) with check (true);
create policy report_events_service_all on public.content_report_events
for all to service_role using (true) with check (true);

insert into public.rbac_permissions (name, display_name, category, description)
values ('music.certification.review', 'Review music certifications', 'music', 'Review private evidence and decide music certification cases.')
on conflict (name) do update set
  display_name = excluded.display_name,
  category = excluded.category,
  description = excluded.description;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'music-certification-evidence',
  'music-certification-evidence',
  false,
  52428800,
  array['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'application/pdf', 'application/zip', 'application/json', 'application/octet-stream', 'text/plain', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.music_certification_reviews is 'Server-mediated private reviewer decisions; never exposed directly to clients.';
comment on table public.music_certification_events is 'Append-only audit history. Artist access is limited to artist_visible events.';
comment on table public.music_certificates is 'Immutable issued manifests. Status changes are appended through reviews/events by trusted routes.';
comment on table public.content_report_events is 'Immutable report lifecycle audit history.';

commit;
