-- Phase 2 P2-E/P2-F: evidence, review decisions, passports, credentials (additive).
-- Public verification uses narrow route projections; drafts remain private.

begin;

create table public.music_rights_evidence (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  evidence_category text not null check (evidence_category in (
    'master_audio', 'stems', 'project_export', 'demo', 'session_record',
    'invoice', 'communication', 'agreement_copy', 'registration',
    'identity', 'ai_disclosure', 'other'
  )),
  title text,
  original_filename text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  content_sha256 text,
  storage_bucket text not null default 'music-rights-evidence',
  storage_path text not null,
  scan_status text not null default 'pending' check (scan_status in (
    'pending', 'clean', 'quarantined', 'failed', 'skipped'
  )),
  processing_status text not null default 'uploaded' check (processing_status in (
    'uploaded', 'processing', 'ready', 'failed'
  )),
  retention_policy text not null default 'owner_delete_subject_to_hold',
  legal_hold boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_rights_evidence_project_idx
  on public.music_rights_evidence (project_id, created_at desc);

create table public.music_rights_external_registrations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  registry text not null,
  registration_type text not null default 'other',
  external_reference text,
  status text not null default 'submitted' check (status in (
    'draft', 'submitted', 'verified', 'rejected', 'withdrawn'
  )),
  evidence_id uuid references public.music_rights_evidence(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.music_rights_verification_checks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  check_type text not null,
  status text not null default 'pending' check (status in (
    'pending', 'passed', 'failed', 'needs_review', 'skipped'
  )),
  score numeric(5,4),
  signals jsonb not null default '[]'::jsonb,
  summary text,
  actor_type text not null default 'system' check (actor_type in ('system', 'reviewer', 'artist')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index music_rights_verification_checks_project_idx
  on public.music_rights_verification_checks (project_id, created_at desc);

create table public.music_rights_review_decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in (
    'start_review', 'needs_information', 'approve', 'reject',
    'suspend', 'reactivate', 'revoke', 'supersede'
  )),
  human_origin_status text check (human_origin_status in (
    'not_requested', 'pending', 'approved', 'rejected', 'suspended', 'revoked'
  )),
  reason_codes text[] not null default '{}',
  findings jsonb not null default '{}'::jsonb,
  artist_message text,
  internal_notes text,
  standard_version text not null default 'human-origin-v2.0',
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create index music_rights_review_decisions_project_idx
  on public.music_rights_review_decisions (project_id, created_at desc);

create table public.music_rights_passports (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  project_id uuid not null unique references public.music_rights_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  artist_music_id uuid not null references public.artist_music(id) on delete cascade,
  status text not null default 'draft' check (status in (
    'draft', 'pending_review', 'issued', 'suspended', 'revoked', 'superseded'
  )),
  current_version integer not null default 0 check (current_version >= 0),
  standard_version text not null default 'rights-passport-v1.0',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_rights_passports_owner_idx
  on public.music_rights_passports (owner_user_id, updated_at desc);
create index music_rights_passports_track_idx
  on public.music_rights_passports (artist_music_id);

create table public.music_rights_passport_versions (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.music_rights_passports(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'issued' check (status in (
    'issued', 'suspended', 'revoked', 'superseded'
  )),
  public_manifest jsonb not null,
  private_manifest jsonb not null default '{}'::jsonb,
  public_manifest_hash text not null,
  previous_version_hash text,
  schema_version text not null default '1.0.0',
  canonicalization_version text not null default 'stable-json-v1',
  hash_algorithm text not null default 'sha256',
  issued_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (passport_id, version)
);

create index music_rights_passport_versions_passport_idx
  on public.music_rights_passport_versions (passport_id, version desc);

create table public.music_rights_credentials (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  passport_id uuid not null references public.music_rights_passports(id) on delete cascade,
  passport_version_id uuid not null references public.music_rights_passport_versions(id) on delete cascade,
  credential_type text not null default 'TourifyRightsPassportCredential',
  issuer_did text not null default 'did:web:tourify.app:music-rights',
  envelope jsonb not null,
  proof jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in (
    'active', 'suspended', 'revoked', 'superseded'
  )),
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index music_rights_credentials_passport_idx
  on public.music_rights_credentials (passport_id, issued_at desc);

create table public.music_rights_credential_status (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.music_rights_credentials(id) on delete cascade,
  status text not null check (status in (
    'active', 'suspended', 'revoked', 'superseded'
  )),
  reason_codes text[] not null default '{}',
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null default 'system',
  notes text,
  created_at timestamptz not null default now()
);

create index music_rights_credential_status_credential_idx
  on public.music_rights_credential_status (credential_id, created_at desc);

-- Narrow public verification view (security invoker; RLS still applies via underlying tables)
create or replace view public.music_rights_public_passport_verification
with (security_invoker = true)
as
select
  p.public_id,
  p.status,
  p.standard_version,
  p.current_version,
  p.artist_music_id,
  pv.public_manifest,
  pv.public_manifest_hash,
  pv.issued_at,
  pv.version as passport_version,
  c.public_id as credential_public_id,
  c.status as credential_status
from public.music_rights_passports p
join public.music_rights_passport_versions pv
  on pv.passport_id = p.id and pv.version = p.current_version
left join lateral (
  select cred.public_id, cred.status
  from public.music_rights_credentials cred
  where cred.passport_id = p.id
    and cred.passport_version_id = pv.id
  order by cred.issued_at desc
  limit 1
) c on true
where p.status in ('issued', 'suspended', 'revoked', 'superseded')
  and p.current_version > 0;

alter table public.music_rights_evidence enable row level security;
alter table public.music_rights_external_registrations enable row level security;
alter table public.music_rights_verification_checks enable row level security;
alter table public.music_rights_review_decisions enable row level security;
alter table public.music_rights_passports enable row level security;
alter table public.music_rights_passport_versions enable row level security;
alter table public.music_rights_credentials enable row level security;
alter table public.music_rights_credential_status enable row level security;

grant select, insert, update on
  public.music_rights_evidence,
  public.music_rights_external_registrations,
  public.music_rights_passports
to authenticated;

grant select, insert on
  public.music_rights_verification_checks,
  public.music_rights_passport_versions,
  public.music_rights_credentials,
  public.music_rights_credential_status
to authenticated;

-- Review decisions are service/admin-route mediated; authenticated select for project owners only
grant select on public.music_rights_review_decisions to authenticated;
grant select on public.music_rights_public_passport_verification to authenticated, anon;

grant all on
  public.music_rights_evidence,
  public.music_rights_external_registrations,
  public.music_rights_verification_checks,
  public.music_rights_review_decisions,
  public.music_rights_passports,
  public.music_rights_passport_versions,
  public.music_rights_credentials,
  public.music_rights_credential_status
to service_role;

create policy music_rights_evidence_owner on public.music_rights_evidence
for all to authenticated
using ((select auth.uid()) = owner_user_id)
with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.music_rights_projects p
    where p.id = project_id and p.owner_user_id = (select auth.uid())
  )
);

create policy music_rights_external_registrations_owner on public.music_rights_external_registrations
for all to authenticated
using ((select auth.uid()) = owner_user_id)
with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.music_rights_projects p
    where p.id = project_id and p.owner_user_id = (select auth.uid())
  )
);

create policy music_rights_verification_checks_owner_select on public.music_rights_verification_checks
for select to authenticated using (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and p.owner_user_id = (select auth.uid())
));
create policy music_rights_verification_checks_owner_insert on public.music_rights_verification_checks
for insert to authenticated with check (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and p.owner_user_id = (select auth.uid())
));

create policy music_rights_review_decisions_owner_select on public.music_rights_review_decisions
for select to authenticated using (exists (
  select 1 from public.music_rights_projects p
  where p.id = project_id and p.owner_user_id = (select auth.uid())
));

create policy music_rights_passports_owner on public.music_rights_passports
for all to authenticated
using ((select auth.uid()) = owner_user_id)
with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.music_rights_projects p
    where p.id = project_id and p.owner_user_id = (select auth.uid())
  )
);

create policy music_rights_passport_versions_owner_select on public.music_rights_passport_versions
for select to authenticated using (exists (
  select 1 from public.music_rights_passports p
  where p.id = passport_id and p.owner_user_id = (select auth.uid())
));
create policy music_rights_passport_versions_owner_insert on public.music_rights_passport_versions
for insert to authenticated with check (exists (
  select 1 from public.music_rights_passports p
  where p.id = passport_id and p.owner_user_id = (select auth.uid())
));

create policy music_rights_credentials_owner_select on public.music_rights_credentials
for select to authenticated using (exists (
  select 1 from public.music_rights_passports p
  where p.id = passport_id and p.owner_user_id = (select auth.uid())
));
create policy music_rights_credentials_owner_insert on public.music_rights_credentials
for insert to authenticated with check (exists (
  select 1 from public.music_rights_passports p
  where p.id = passport_id and p.owner_user_id = (select auth.uid())
));

create policy music_rights_credential_status_owner_select on public.music_rights_credential_status
for select to authenticated using (exists (
  select 1 from public.music_rights_credentials c
  join public.music_rights_passports p on p.id = c.passport_id
  where c.id = credential_id and p.owner_user_id = (select auth.uid())
));
create policy music_rights_credential_status_owner_insert on public.music_rights_credential_status
for insert to authenticated with check (exists (
  select 1 from public.music_rights_credentials c
  join public.music_rights_passports p on p.id = c.passport_id
  where c.id = credential_id and p.owner_user_id = (select auth.uid())
));

create policy music_rights_evidence_service on public.music_rights_evidence
for all to service_role using (true) with check (true);
create policy music_rights_external_registrations_service on public.music_rights_external_registrations
for all to service_role using (true) with check (true);
create policy music_rights_verification_checks_service on public.music_rights_verification_checks
for all to service_role using (true) with check (true);
create policy music_rights_review_decisions_service on public.music_rights_review_decisions
for all to service_role using (true) with check (true);
create policy music_rights_passports_service on public.music_rights_passports
for all to service_role using (true) with check (true);
create policy music_rights_passport_versions_service on public.music_rights_passport_versions
for all to service_role using (true) with check (true);
create policy music_rights_credentials_service on public.music_rights_credentials
for all to service_role using (true) with check (true);
create policy music_rights_credential_status_service on public.music_rights_credential_status
for all to service_role using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'music-rights-evidence',
    'music-rights-evidence',
    false,
    104857600,
    array[
      'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/aac',
      'application/pdf', 'application/zip', 'application/json', 'application/octet-stream',
      'text/plain', 'image/jpeg', 'image/png'
    ]
  ),
  (
    'music-rights-exports',
    'music-rights-exports',
    false,
    104857600,
    array['application/zip', 'application/json', 'application/pdf', 'application/octet-stream']
  )
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "music_rights_evidence_owner_select" on storage.objects;
drop policy if exists "music_rights_evidence_owner_insert" on storage.objects;
drop policy if exists "music_rights_evidence_owner_update" on storage.objects;
drop policy if exists "music_rights_evidence_owner_delete" on storage.objects;
drop policy if exists "music_rights_exports_owner_select" on storage.objects;
drop policy if exists "music_rights_exports_owner_insert" on storage.objects;
drop policy if exists "music_rights_exports_owner_update" on storage.objects;
drop policy if exists "music_rights_exports_owner_delete" on storage.objects;

create policy "music_rights_evidence_owner_select" on storage.objects
for select to authenticated
using (bucket_id = 'music-rights-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "music_rights_evidence_owner_insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'music-rights-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "music_rights_evidence_owner_update" on storage.objects
for update to authenticated
using (bucket_id = 'music-rights-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'music-rights-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "music_rights_evidence_owner_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'music-rights-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (
    select 1 from public.music_rights_evidence e
    where e.storage_bucket = 'music-rights-evidence'
      and e.storage_path = name
      and e.legal_hold = true
  )
);

create policy "music_rights_exports_owner_select" on storage.objects
for select to authenticated
using (bucket_id = 'music-rights-exports' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "music_rights_exports_owner_insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'music-rights-exports' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "music_rights_exports_owner_update" on storage.objects
for update to authenticated
using (bucket_id = 'music-rights-exports' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'music-rights-exports' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "music_rights_exports_owner_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'music-rights-exports' and (storage.foldername(name))[1] = (select auth.uid())::text);

insert into public.rbac_permissions (name, display_name, category, description)
values (
  'music.rights.review',
  'Review music rights evidence',
  'music',
  'Review private rights evidence and decide Human-Origin / passport readiness.'
)
on conflict (name) do update set
  display_name = excluded.display_name,
  category = excluded.category,
  description = excluded.description;

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
alter table public.feature_flags enable row level security;

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('music_human_origin_v2_enabled', 'Human-Origin certification v2', 'Enable evidence-based Human-Origin review for rights passports.', false, 0),
  ('music_rights_passport_enabled', 'Music rights passport', 'Enable rights passport issuance and credential envelopes.', false, 0),
  ('music_public_passport_verification_enabled', 'Public passport verification', 'Enable narrow public rights passport verification pages.', false, 0)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

comment on table public.music_rights_evidence is 'Private evidence for Human-Origin and rights review; never public.';
comment on table public.music_rights_review_decisions is 'Server-mediated reviewer decisions; internal notes are not public.';
comment on table public.music_rights_passports is 'Versioned Rights Passport package linked 1:1 to a rights project / artist_music.';
comment on table public.music_rights_credentials is 'W3C VC 2.0-compatible credential envelopes; status changes append via credential_status.';
comment on view public.music_rights_public_passport_verification is 'Narrow public projection for verification routes; drafts excluded.';

commit;
