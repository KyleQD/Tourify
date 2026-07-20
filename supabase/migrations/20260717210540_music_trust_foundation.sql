begin;

create extension if not exists pgcrypto;

alter table public.artist_music
  add column if not exists trust_schema_version smallint not null default 0,
  add column if not exists trust_setup_status text not null default 'incomplete',
  add column if not exists active_declaration_id uuid,
  add column if not exists ai_use_category text not null default 'unknown',
  add column if not exists training_use_policy text not null default 'rights_reserved',
  add column if not exists origin_status text not null default 'not_recorded',
  add column if not exists certification_status text not null default 'not_requested',
  add column if not exists certification_level smallint not null default 0,
  add column if not exists certification_public_id uuid,
  add column if not exists certification_standard_version text,
  add column if not exists certification_updated_at timestamptz;

alter table public.artist_music
  drop constraint if exists artist_music_trust_schema_version_check,
  add constraint artist_music_trust_schema_version_check check (trust_schema_version between 0 and 1),
  drop constraint if exists artist_music_trust_setup_status_check,
  add constraint artist_music_trust_setup_status_check check (trust_setup_status in ('incomplete', 'ready', 'repair_required')),
  drop constraint if exists artist_music_ai_use_category_check,
  add constraint artist_music_ai_use_category_check check (ai_use_category in ('human_created', 'assistive_ai', 'materially_generated', 'unknown')),
  drop constraint if exists artist_music_training_use_policy_check,
  add constraint artist_music_training_use_policy_check check (training_use_policy in ('rights_reserved', 'licensed_only', 'opted_in')),
  drop constraint if exists artist_music_origin_status_check,
  add constraint artist_music_origin_status_check check (origin_status in ('not_recorded', 'pending', 'recorded', 'failed', 'superseded')),
  drop constraint if exists artist_music_certification_status_check,
  add constraint artist_music_certification_status_check check (certification_status in (
    'not_requested', 'draft', 'submitted', 'in_review', 'needs_information',
    'approved', 'rejected', 'withdrawn', 'suspended', 'revoked'
  )),
  drop constraint if exists artist_music_certification_level_check,
  add constraint artist_music_certification_level_check check (certification_level between 0 and 5),
  drop constraint if exists artist_music_phase1_publication_check,
  add constraint artist_music_phase1_publication_check check (
    trust_schema_version = 0 or not is_public or (
      trust_setup_status = 'ready'
      and active_declaration_id is not null
      and rights_confirmed = true
      and ai_use_category in ('human_created', 'assistive_ai')
      and moderation_status = 'approved'
      and is_visible = true
      and (preview_mode = 'full' or preview_storage_path is not null)
    )
  ) not valid;

create index if not exists artist_music_trust_status_idx
  on public.artist_music (trust_schema_version, origin_status, certification_status);
create index if not exists artist_music_certification_status_idx
  on public.artist_music (certification_status, certification_level);

create table public.music_upload_declarations (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.artist_music(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  declaration_version integer not null check (declaration_version > 0),
  rights_confirmed boolean not null default false,
  ai_use_category text not null default 'unknown' check (ai_use_category in ('human_created', 'assistive_ai', 'materially_generated', 'unknown')),
  ai_tools jsonb not null default '[]'::jsonb check (jsonb_typeof(ai_tools) = 'array'),
  ai_disclosure_details text,
  synthesized_voice_or_likeness boolean not null default false,
  contributor_disclosures_confirmed boolean not null default false,
  source_material_available boolean not null default false,
  training_use_policy text not null default 'rights_reserved' check (training_use_policy in ('rights_reserved', 'licensed_only', 'opted_in')),
  music_upload_policy_version text not null,
  human_music_policy_version text not null,
  accepted_music_upload_policy boolean not null default false,
  accepted_human_music_policy boolean not null default false,
  statement_text_hash text not null check (length(statement_text_hash) = 64),
  idempotency_key text not null,
  declared_at timestamptz not null default now(),
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (track_id, declaration_version),
  unique (user_id, idempotency_key)
);

create index music_upload_declarations_track_idx
  on public.music_upload_declarations (track_id, declaration_version desc);

alter table public.artist_music
  add constraint artist_music_active_declaration_fkey
  foreign key (active_declaration_id) references public.music_upload_declarations(id) on delete set null;

create table public.music_file_fingerprints (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.artist_music(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  declaration_id uuid references public.music_upload_declarations(id) on delete set null,
  file_role text not null default 'full' check (file_role in ('full', 'preview')),
  storage_bucket text not null,
  storage_path text not null,
  sha256 text check (sha256 is null or length(sha256) = 64),
  acoustic_fingerprint text,
  fingerprint_algorithm text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  mime_type text,
  technical_metadata jsonb not null default '{}'::jsonb,
  match_signals jsonb not null default '[]'::jsonb,
  processing_status text not null default 'pending' check (processing_status in ('pending', 'processing', 'complete', 'failed', 'dead_letter')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  processing_error_code text,
  processing_error text,
  processor_version text,
  processed_at timestamptz,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (track_id, file_role, storage_bucket, storage_path)
);

create index music_file_fingerprints_worker_idx
  on public.music_file_fingerprints (processing_status, next_attempt_at)
  where processing_status in ('pending', 'failed', 'processing');
create index music_file_fingerprints_sha256_idx
  on public.music_file_fingerprints (sha256) where sha256 is not null;

create table public.music_origin_records (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  track_id uuid not null references public.artist_music(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  declaration_id uuid not null references public.music_upload_declarations(id) on delete restrict,
  fingerprint_id uuid not null unique references public.music_file_fingerprints(id) on delete restrict,
  version integer not null check (version > 0),
  schema_version text not null,
  manifest_json jsonb not null,
  manifest_hash text not null check (length(manifest_hash) = 64),
  previous_manifest_hash text,
  status text not null default 'active' check (status in ('active', 'suspended', 'superseded', 'revoked')),
  is_public boolean not null default false,
  recorded_at timestamptz not null default now(),
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (track_id, version),
  unique (track_id, manifest_hash)
);

create table public.music_origin_events (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.artist_music(id) on delete cascade,
  origin_record_id uuid references public.music_origin_records(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create unique index music_origin_events_request_idx
  on public.music_origin_events (track_id, event_type, request_id) where request_id is not null;

create or replace function public.enforce_music_phase1_publication()
returns trigger language plpgsql set search_path = public as $$
declare
  declaration_row public.music_upload_declarations%rowtype;
begin
  if new.trust_schema_version = 1 and new.is_public then
    select * into declaration_row from public.music_upload_declarations
      where id = new.active_declaration_id;
    if declaration_row.id is null
      or declaration_row.track_id <> new.id
      or declaration_row.user_id <> new.user_id
      or declaration_row.rights_confirmed is not true
      or declaration_row.rights_confirmed is distinct from new.rights_confirmed
      or declaration_row.ai_use_category is distinct from new.ai_use_category
      or declaration_row.training_use_policy is distinct from new.training_use_policy
      or declaration_row.accepted_music_upload_policy is not true
      or declaration_row.accepted_human_music_policy is not true
      or declaration_row.ai_use_category not in ('human_created', 'assistive_ai') then
      raise exception using errcode = '23514', message = 'music_trust_publication_blocked';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists artist_music_phase1_publication_guard on public.artist_music;
create trigger artist_music_phase1_publication_guard
before insert or update of is_public, active_declaration_id, trust_setup_status,
  rights_confirmed, ai_use_category, moderation_status, is_visible,
  preview_mode, preview_storage_path, trust_schema_version
on public.artist_music for each row execute function public.enforce_music_phase1_publication();

alter table public.music_upload_declarations enable row level security;
alter table public.music_file_fingerprints enable row level security;
alter table public.music_origin_records enable row level security;
alter table public.music_origin_events enable row level security;

revoke all on public.music_upload_declarations, public.music_file_fingerprints,
  public.music_origin_records, public.music_origin_events from anon, authenticated;
grant select, insert on public.music_upload_declarations to authenticated;
grant select on public.music_file_fingerprints, public.music_origin_records, public.music_origin_events to authenticated;
grant all on public.music_upload_declarations, public.music_file_fingerprints,
  public.music_origin_records, public.music_origin_events to service_role;

create policy music_declarations_owner_select on public.music_upload_declarations
for select to authenticated using ((select auth.uid()) = user_id);
create policy music_declarations_owner_insert on public.music_upload_declarations
for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.artist_music track
    where track.id = track_id and track.user_id = (select auth.uid())
  )
);
create policy music_fingerprints_owner_select on public.music_file_fingerprints
for select to authenticated using ((select auth.uid()) = user_id);
create policy music_origin_records_owner_select on public.music_origin_records
for select to authenticated using ((select auth.uid()) = user_id);
create policy music_origin_events_owner_select on public.music_origin_events
for select to authenticated using (exists (
  select 1 from public.artist_music track
  where track.id = track_id and track.user_id = (select auth.uid())
));
create policy music_declarations_service_all on public.music_upload_declarations
for all to service_role using (true) with check (true);
create policy music_fingerprints_service_all on public.music_file_fingerprints
for all to service_role using (true) with check (true);
create policy music_origin_records_service_all on public.music_origin_records
for all to service_role using (true) with check (true);
create policy music_origin_events_service_all on public.music_origin_events
for all to service_role using (true) with check (true);

drop policy if exists "Users can update their own music" on public.artist_music;
create policy "Users can update their own music" on public.artist_music
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('music_trust_upload_fields_enabled', 'Music trust upload fields', 'Collect versioned rights and origin declarations.', false, 0),
  ('music_origin_processing_enabled', 'Music origin processing', 'Hash private sources and issue origin manifests.', false, 0),
  ('music_certification_requests_enabled', 'Music certification requests', 'Allow artists to create and submit certification cases.', false, 0),
  ('music_certification_admin_review_enabled', 'Music certification review', 'Expose the reviewer queue and decisions.', false, 0),
  ('music_public_verification_enabled', 'Music public verification', 'Expose narrow public origin and certificate verification.', false, 0),
  ('music_human_only_public_gate_enabled', 'Music human-only public gate', 'Require human-created or assistive-AI declarations for publication.', false, 0)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

create or replace view public.music_tracks with (security_invoker = true) as
select
  tracks.id, tracks.user_id, tracks.artist_profile_id, tracks.title, tracks.description,
  tracks.type, tracks.genre, tracks.release_date, tracks.duration,
  null::text as file_url, null::text as preview_file_url,
  tracks.cover_art_url, tracks.tags, tracks.is_public, tracks.is_visible,
  tracks.moderation_status, tracks.access_mode, tracks.preview_mode,
  tracks.preview_duration_seconds, tracks.allow_library_add,
  tracks.allow_profile_feature, tracks.allow_downloads, tracks.rights_confirmed,
  tracks.metadata, tracks.stats,
  coalesce((tracks.stats ->> 'plays')::int, 0) as play_count,
  coalesce((tracks.stats ->> 'likes')::int, 0) as likes_count,
  coalesce((tracks.stats ->> 'shares')::int, 0) as shares_count,
  coalesce((tracks.stats ->> 'comments')::int, 0) as comments_count,
  profiles.username as artist_username,
  coalesce(profiles.full_name, profiles.username) as artist_name,
  profiles.avatar_url as artist_avatar_url,
  tracks.created_at, tracks.updated_at,
  tracks.ai_use_category, tracks.training_use_policy, tracks.origin_status,
  tracks.certification_status, tracks.certification_level,
  tracks.certification_public_id, tracks.certification_standard_version,
  tracks.certification_updated_at
from public.artist_music tracks
left join public.profiles on profiles.id = tracks.user_id;

grant select on public.music_tracks to anon, authenticated;

comment on table public.music_upload_declarations is 'Immutable, versioned artist attestations for music publication.';
comment on table public.music_file_fingerprints is 'Private origin processing jobs and file-derived integrity data.';
comment on table public.music_origin_records is 'Immutable deterministic origin manifests; not legal ownership conclusions.';
comment on column public.artist_music.trust_schema_version is 'Zero preserves legacy behavior; one opts into the phase-one publication guard.';

commit;
