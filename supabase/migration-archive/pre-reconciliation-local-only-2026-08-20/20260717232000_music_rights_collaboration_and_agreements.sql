-- Phase 2 P2-C/P2-D: catalog refs, invitations, agreements, signatures (additive).
-- artist_music remains the canonical playable catalog row.

begin;

create extension if not exists pgcrypto;

-- Catalog import jobs + external refs
create table public.music_rights_catalog_imports (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.music_rights_projects(id) on delete set null,
  artist_music_id uuid references public.artist_music(id) on delete set null,
  source_type text not null check (source_type in (
    'spotify_url', 'apple_music_url', 'youtube_url', 'soundcloud_url', 'bandcamp_url',
    'isrc_list', 'upc', 'distributor_csv', 'label_export', 'manual', 'other'
  )),
  source_payload jsonb not null default '{}'::jsonb,
  normalized jsonb not null default '{}'::jsonb,
  match_status text not null default 'pending' check (match_status in (
    'pending', 'confirmed', 'probable', 'ambiguous', 'conflict', 'unmatched', 'failed'
  )),
  match_confidence numeric(5,4) check (match_confidence is null or (match_confidence >= 0 and match_confidence <= 1)),
  match_signals jsonb not null default '[]'::jsonb,
  discrepancy_report jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in (
    'draft', 'processing', 'needs_confirmation', 'linked', 'failed', 'cancelled'
  )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_rights_catalog_imports_owner_idx
  on public.music_rights_catalog_imports (owner_user_id, created_at desc);

create table public.music_rights_external_catalog_refs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  artist_music_id uuid references public.artist_music(id) on delete set null,
  catalog_import_id uuid references public.music_rights_catalog_imports(id) on delete set null,
  provider text not null,
  external_id text,
  external_url text,
  isrc text,
  upc text,
  title text,
  artist_name text,
  release_date date,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  raw jsonb not null default '{}'::jsonb,
  match_status text not null default 'unmatched' check (match_status in (
    'confirmed', 'probable', 'ambiguous', 'conflict', 'unmatched'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_rights_external_catalog_refs_project_idx
  on public.music_rights_external_catalog_refs (project_id, provider);

create table public.music_rights_invitations (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  party_id uuid references public.music_rights_parties(id) on delete set null,
  invitee_email text not null,
  invitee_display_name text,
  invitee_user_id uuid references auth.users(id) on delete set null,
  proposed_roles text[] not null default '{}',
  claim_ids uuid[] not null default '{}',
  requires_signature boolean not null default false,
  public_display_requested boolean not null default false,
  token_hash text not null,
  status text not null default 'pending' check (status in (
    'pending', 'accepted', 'countered', 'rejected', 'expired', 'revoked'
  )),
  counter_payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_rights_invitations_project_idx
  on public.music_rights_invitations (project_id, status);
create index music_rights_invitations_email_idx
  on public.music_rights_invitations (lower(invitee_email), status);

-- Agreements
create table public.music_rights_agreement_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  semantic_version text not null,
  title text not null,
  purpose text not null,
  jurisdiction text,
  territory_codes text[] not null default '{WORLDWIDE}',
  required_fields jsonb not null default '[]'::jsonb,
  required_signer_roles text[] not null default '{}',
  body_markdown text not null,
  template_hash text not null,
  counsel_approval_status text not null default 'draft' check (counsel_approval_status in (
    'draft', 'pending_counsel', 'approved', 'retired'
  )),
  effective_from timestamptz,
  retired_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_key, semantic_version)
);

create table public.music_rights_agreements (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  project_id uuid not null references public.music_rights_projects(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid not null references public.music_rights_agreement_templates(id),
  title text not null,
  status text not null default 'draft' check (status in (
    'draft', 'pending_signatures', 'partially_signed', 'fully_signed',
    'amended', 'superseded', 'invalidated', 'cancelled'
  )),
  current_version integer not null default 1 check (current_version > 0),
  superseded_by uuid references public.music_rights_agreements(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_rights_agreements_project_idx
  on public.music_rights_agreements (project_id, status);

create table public.music_rights_agreement_versions (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.music_rights_agreements(id) on delete cascade,
  version integer not null check (version > 0),
  template_id uuid not null references public.music_rights_agreement_templates(id),
  rendered_markdown text not null,
  rendered_hash text not null,
  claim_snapshot jsonb not null default '[]'::jsonb,
  claim_snapshot_hash text not null,
  party_snapshot jsonb not null default '[]'::jsonb,
  party_snapshot_hash text not null,
  governing_law text,
  dispute_provisions text,
  storage_bucket text,
  storage_path text,
  document_sha256 text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (agreement_id, version)
);

create table public.music_rights_agreement_parties (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.music_rights_agreements(id) on delete cascade,
  agreement_version_id uuid references public.music_rights_agreement_versions(id) on delete set null,
  party_id uuid not null references public.music_rights_parties(id) on delete cascade,
  signer_role text not null,
  signing_order integer not null default 1 check (signing_order > 0),
  status text not null default 'pending' check (status in (
    'pending', 'invited', 'signed', 'declined', 'waived'
  )),
  signed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (agreement_id, party_id, signer_role)
);

create table public.music_rights_signature_requests (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  agreement_id uuid not null references public.music_rights_agreements(id) on delete cascade,
  agreement_version_id uuid not null references public.music_rights_agreement_versions(id) on delete cascade,
  agreement_party_id uuid not null references public.music_rights_agreement_parties(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  signer_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in (
    'pending', 'reauth_required', 'ready', 'signed', 'declined', 'expired', 'cancelled'
  )),
  consent_text_version text not null default 'v1',
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index music_rights_signature_requests_agreement_idx
  on public.music_rights_signature_requests (agreement_id, status);

create table public.music_rights_signature_events (
  id uuid primary key default gen_random_uuid(),
  signature_request_id uuid not null references public.music_rights_signature_requests(id) on delete cascade,
  agreement_id uuid not null references public.music_rights_agreements(id) on delete cascade,
  agreement_version_id uuid not null references public.music_rights_agreement_versions(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'created', 'reauth_completed', 'consent_accepted', 'document_viewed',
    'signed', 'declined', 'invalidated', 'copy_sealed', 'expired'
  )),
  document_hash text,
  claim_snapshot_hash text,
  authentication_method text,
  provider_reference text,
  ip_hash text,
  user_agent_hash text,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index music_rights_signature_events_request_idx
  on public.music_rights_signature_events (signature_request_id, created_at);

-- Seed a conservative internal split-sheet template (counsel approval pending)
insert into public.music_rights_agreement_templates (
  template_key, semantic_version, title, purpose, jurisdiction,
  required_fields, required_signer_roles, body_markdown, template_hash, counsel_approval_status
) values (
  'electronic_split_sheet',
  '1.0.0',
  'Electronic Split Sheet',
  'Record proposed ownership and credit shares for a musical work and/or sound recording.',
  'US',
  '["project_title","party_names","claim_shares"]'::jsonb,
  array['claimant', 'witness'],
  E'# Electronic Split Sheet\n\nThis document records the parties'' proposed splits for **{{project_title}}**.\n\n{{claim_table}}\n\nThis record is not a legal determination of copyright ownership. Material amendments require a new version and re-signature.',
  encode(digest(convert_to(
    E'# Electronic Split Sheet\n\nThis document records the parties'' proposed splits for **{{project_title}}**.\n\n{{claim_table}}\n\nThis record is not a legal determination of copyright ownership. Material amendments require a new version and re-signature.',
    'UTF8'
  ), 'sha256'), 'hex'),
  'pending_counsel'
);

alter table public.music_rights_catalog_imports enable row level security;
alter table public.music_rights_external_catalog_refs enable row level security;
alter table public.music_rights_invitations enable row level security;
alter table public.music_rights_agreement_templates enable row level security;
alter table public.music_rights_agreements enable row level security;
alter table public.music_rights_agreement_versions enable row level security;
alter table public.music_rights_agreement_parties enable row level security;
alter table public.music_rights_signature_requests enable row level security;
alter table public.music_rights_signature_events enable row level security;

grant select, insert, update on
  public.music_rights_catalog_imports,
  public.music_rights_external_catalog_refs,
  public.music_rights_invitations,
  public.music_rights_agreements,
  public.music_rights_agreement_parties,
  public.music_rights_signature_requests
to authenticated;

grant select, insert on
  public.music_rights_agreement_versions,
  public.music_rights_signature_events
to authenticated;

grant select on public.music_rights_agreement_templates to authenticated;

grant all on
  public.music_rights_catalog_imports,
  public.music_rights_external_catalog_refs,
  public.music_rights_invitations,
  public.music_rights_agreement_templates,
  public.music_rights_agreements,
  public.music_rights_agreement_versions,
  public.music_rights_agreement_parties,
  public.music_rights_signature_requests,
  public.music_rights_signature_events
to service_role;

-- Owner / invitee policies
create policy music_rights_catalog_imports_owner on public.music_rights_catalog_imports
for all to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy music_rights_external_catalog_refs_owner on public.music_rights_external_catalog_refs
for all to authenticated
using ((select auth.uid()) = owner_user_id)
with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.music_rights_projects p
    where p.id = project_id and p.owner_user_id = (select auth.uid())
  )
);

create policy music_rights_invitations_owner_select on public.music_rights_invitations
for select to authenticated using (
  (select auth.uid()) = owner_user_id
  or (select auth.uid()) = invitee_user_id
);
create policy music_rights_invitations_owner_insert on public.music_rights_invitations
for insert to authenticated with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.music_rights_projects p
    where p.id = project_id and p.owner_user_id = (select auth.uid())
  )
);
create policy music_rights_invitations_update on public.music_rights_invitations
for update to authenticated
using (
  (select auth.uid()) = owner_user_id
  or (select auth.uid()) = invitee_user_id
)
with check (
  (select auth.uid()) = owner_user_id
  or (select auth.uid()) = invitee_user_id
);

create policy music_rights_agreement_templates_select on public.music_rights_agreement_templates
for select to authenticated using (true);

create policy music_rights_agreements_owner on public.music_rights_agreements
for all to authenticated
using ((select auth.uid()) = owner_user_id)
with check (
  (select auth.uid()) = owner_user_id
  and exists (
    select 1 from public.music_rights_projects p
    where p.id = project_id and p.owner_user_id = (select auth.uid())
  )
);

create policy music_rights_agreement_versions_select on public.music_rights_agreement_versions
for select to authenticated using (exists (
  select 1 from public.music_rights_agreements a
  where a.id = agreement_id and a.owner_user_id = (select auth.uid())
));
create policy music_rights_agreement_versions_insert on public.music_rights_agreement_versions
for insert to authenticated with check (exists (
  select 1 from public.music_rights_agreements a
  where a.id = agreement_id and a.owner_user_id = (select auth.uid())
));

create policy music_rights_agreement_parties_owner on public.music_rights_agreement_parties
for all to authenticated
using (exists (
  select 1 from public.music_rights_agreements a
  where a.id = agreement_id and (
    a.owner_user_id = (select auth.uid())
    or exists (
      select 1 from public.music_rights_parties party
      where party.id = music_rights_agreement_parties.party_id
        and party.linked_user_id = (select auth.uid())
    )
  )
))
with check (exists (
  select 1 from public.music_rights_agreements a
  where a.id = agreement_id and a.owner_user_id = (select auth.uid())
));

create policy music_rights_signature_requests_select on public.music_rights_signature_requests
for select to authenticated using (
  (select auth.uid()) = owner_user_id
  or (select auth.uid()) = signer_user_id
);
create policy music_rights_signature_requests_insert on public.music_rights_signature_requests
for insert to authenticated with check ((select auth.uid()) = owner_user_id);
create policy music_rights_signature_requests_update on public.music_rights_signature_requests
for update to authenticated
using (
  (select auth.uid()) = owner_user_id
  or (select auth.uid()) = signer_user_id
)
with check (
  (select auth.uid()) = owner_user_id
  or (select auth.uid()) = signer_user_id
);

create policy music_rights_signature_events_select on public.music_rights_signature_events
for select to authenticated using (exists (
  select 1 from public.music_rights_agreements a
  where a.id = agreement_id and (
    a.owner_user_id = (select auth.uid())
    or exists (
      select 1 from public.music_rights_signature_requests sr
      where sr.id = signature_request_id and sr.signer_user_id = (select auth.uid())
    )
  )
));
create policy music_rights_signature_events_insert on public.music_rights_signature_events
for insert to authenticated with check (exists (
  select 1 from public.music_rights_signature_requests sr
  where sr.id = signature_request_id
    and (sr.owner_user_id = (select auth.uid()) or sr.signer_user_id = (select auth.uid()))
));

-- service_role bypass
create policy music_rights_catalog_imports_service on public.music_rights_catalog_imports
for all to service_role using (true) with check (true);
create policy music_rights_external_catalog_refs_service on public.music_rights_external_catalog_refs
for all to service_role using (true) with check (true);
create policy music_rights_invitations_service on public.music_rights_invitations
for all to service_role using (true) with check (true);
create policy music_rights_agreement_templates_service on public.music_rights_agreement_templates
for all to service_role using (true) with check (true);
create policy music_rights_agreements_service on public.music_rights_agreements
for all to service_role using (true) with check (true);
create policy music_rights_agreement_versions_service on public.music_rights_agreement_versions
for all to service_role using (true) with check (true);
create policy music_rights_agreement_parties_service on public.music_rights_agreement_parties
for all to service_role using (true) with check (true);
create policy music_rights_signature_requests_service on public.music_rights_signature_requests
for all to service_role using (true) with check (true);
create policy music_rights_signature_events_service on public.music_rights_signature_events
for all to service_role using (true) with check (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'music-rights-documents',
  'music-rights-documents',
  false,
  52428800,
  array['application/pdf', 'application/json', 'text/plain', 'text/markdown', 'application/octet-stream']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "music_rights_documents_owner_select" on storage.objects;
drop policy if exists "music_rights_documents_owner_insert" on storage.objects;
drop policy if exists "music_rights_documents_owner_update" on storage.objects;
drop policy if exists "music_rights_documents_owner_delete" on storage.objects;

create policy "music_rights_documents_owner_select" on storage.objects
for select to authenticated
using (bucket_id = 'music-rights-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "music_rights_documents_owner_insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'music-rights-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "music_rights_documents_owner_update" on storage.objects
for update to authenticated
using (bucket_id = 'music-rights-documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'music-rights-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "music_rights_documents_owner_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'music-rights-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

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
  ('music_catalog_import_enabled', 'Music catalog import', 'Enable existing-catalog import and match confidence workflows.', false, 0),
  ('music_contributor_workflows_enabled', 'Music contributor workflows', 'Enable contributor invitations, accept/counter/reject, and confirmations.', false, 0),
  ('music_agreements_enabled', 'Music rights agreements', 'Enable agreement generation and first-party electronic signatures.', false, 0)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

comment on table public.music_rights_catalog_imports is 'Import jobs for linking external catalog metadata to artist_music without changing distribution.';
comment on table public.music_rights_invitations is 'Contributor invitation and claim confirmation flow.';
comment on table public.music_rights_agreement_versions is 'Immutable rendered agreement versions with claim/party snapshots.';
comment on table public.music_rights_signature_events is 'Append-only signature ceremony evidence; IP/UA stored hashed only.';

commit;
