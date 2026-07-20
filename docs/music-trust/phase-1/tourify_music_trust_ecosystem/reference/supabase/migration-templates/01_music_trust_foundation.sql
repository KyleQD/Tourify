-- DESIGN TEMPLATE ONLY.
-- After auditing current types and policies, create a real migration with:
--   supabase migration new music_trust_foundation
-- Do not apply this file directly to production.

begin;

alter table public.artist_music
  add column if not exists ai_use_category text not null default 'unknown',
  add column if not exists training_use_policy text not null default 'rights_reserved',
  add column if not exists origin_status text not null default 'not_recorded',
  add column if not exists certification_status text not null default 'not_requested',
  add column if not exists certification_level smallint not null default 0,
  add column if not exists certification_public_id uuid,
  add column if not exists certification_standard_version text,
  add column if not exists certification_updated_at timestamptz;

-- Codex: use existing constraint naming conventions and check for conflicting legacy values.
alter table public.artist_music
  drop constraint if exists artist_music_ai_use_category_check,
  add constraint artist_music_ai_use_category_check
    check (ai_use_category in ('human_created', 'assistive_ai', 'materially_generated', 'unknown'));

alter table public.artist_music
  drop constraint if exists artist_music_training_use_policy_check,
  add constraint artist_music_training_use_policy_check
    check (training_use_policy in ('rights_reserved', 'licensed_only', 'opted_in'));

alter table public.artist_music
  drop constraint if exists artist_music_origin_status_check,
  add constraint artist_music_origin_status_check
    check (origin_status in ('not_recorded', 'pending', 'recorded', 'failed', 'superseded'));

alter table public.artist_music
  drop constraint if exists artist_music_certification_status_check,
  add constraint artist_music_certification_status_check
    check (certification_status in (
      'not_requested', 'draft', 'submitted', 'in_review', 'needs_information',
      'approved', 'rejected', 'withdrawn', 'suspended', 'revoked'
    ));

create index if not exists artist_music_certification_status_idx
  on public.artist_music (certification_status, certification_level);

create table if not exists public.music_upload_declarations (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.artist_music(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  declaration_version integer not null,
  rights_confirmed boolean not null,
  ai_use_category text not null,
  ai_tools jsonb not null default '[]'::jsonb,
  ai_disclosure_details text,
  training_use_policy text not null,
  music_upload_policy_version text not null,
  human_music_policy_version text not null,
  statement_text_hash text not null,
  declared_at timestamptz not null default now(),
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (track_id, declaration_version),
  check (ai_use_category in ('human_created', 'assistive_ai', 'materially_generated', 'unknown')),
  check (training_use_policy in ('rights_reserved', 'licensed_only', 'opted_in'))
);

create index if not exists music_upload_declarations_track_idx
  on public.music_upload_declarations (track_id, declaration_version desc);

create table if not exists public.music_file_fingerprints (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.artist_music(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_role text not null,
  storage_bucket text not null,
  storage_path text not null,
  sha256 text,
  acoustic_fingerprint text,
  byte_size bigint,
  mime_type text,
  technical_metadata jsonb not null default '{}'::jsonb,
  processing_status text not null default 'pending',
  processing_error text,
  processor_version text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (file_role in ('full', 'preview', 'cover', 'evidence')),
  check (processing_status in ('pending', 'processing', 'complete', 'failed')),
  unique (track_id, file_role, storage_bucket, storage_path)
);

create table if not exists public.music_origin_records (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  track_id uuid not null references public.artist_music(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  schema_version text not null,
  manifest_json jsonb not null,
  manifest_hash text not null,
  previous_manifest_hash text,
  status text not null default 'active',
  is_public boolean not null default false,
  recorded_at timestamptz not null default now(),
  superseded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (track_id, version),
  check (status in ('active', 'suspended', 'superseded', 'revoked'))
);

create table if not exists public.music_origin_events (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.artist_music(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

alter table public.music_upload_declarations enable row level security;
alter table public.music_file_fingerprints enable row level security;
alter table public.music_origin_records enable row level security;
alter table public.music_origin_events enable row level security;

create policy "music declarations owner select"
  on public.music_upload_declarations for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "music declarations owner insert"
  on public.music_upload_declarations for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.artist_music track
      where track.id = track_id and track.user_id = (select auth.uid())
    )
  );

create policy "music fingerprints owner select"
  on public.music_file_fingerprints for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "music origin records owner select"
  on public.music_origin_records for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "music origin events owner select"
  on public.music_origin_events for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.artist_music track
      where track.id = track_id and track.user_id = (select auth.uid())
    )
  );

-- Writes from trusted workers/review operations should use the repository's existing
-- server-only service path. Do not create broad client policies as a shortcut.

-- Confirm whether explicit Data API grants are required in this project before adding them.

commit;
