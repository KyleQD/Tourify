set client_min_messages = warning;

-- The artist music API and public music surfaces read these fields even when
-- trust rollout flags are disabled. Keep the catalog query compatible with
-- the active schema while the declaration/fingerprint workers remain gated.
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
  add constraint artist_music_trust_schema_version_check
    check (trust_schema_version between 0 and 1) not valid,
  drop constraint if exists artist_music_trust_setup_status_check,
  add constraint artist_music_trust_setup_status_check
    check (trust_setup_status in ('incomplete', 'ready', 'repair_required')) not valid,
  drop constraint if exists artist_music_ai_use_category_check,
  add constraint artist_music_ai_use_category_check
    check (ai_use_category in ('human_created', 'assistive_ai', 'materially_generated', 'unknown')) not valid,
  drop constraint if exists artist_music_training_use_policy_check,
  add constraint artist_music_training_use_policy_check
    check (training_use_policy in ('rights_reserved', 'licensed_only', 'opted_in')) not valid,
  drop constraint if exists artist_music_origin_status_check,
  add constraint artist_music_origin_status_check
    check (origin_status in ('not_recorded', 'pending', 'recorded', 'failed', 'superseded')) not valid,
  drop constraint if exists artist_music_certification_status_check,
  add constraint artist_music_certification_status_check
    check (certification_status in (
      'not_requested', 'draft', 'submitted', 'in_review', 'needs_information',
      'approved', 'rejected', 'withdrawn', 'suspended', 'revoked'
    )) not valid,
  drop constraint if exists artist_music_certification_level_check,
  add constraint artist_music_certification_level_check
    check (certification_level between 0 and 5) not valid;

create index if not exists artist_music_trust_status_idx
  on public.artist_music (trust_schema_version, origin_status, certification_status);

create index if not exists artist_music_certification_status_idx
  on public.artist_music (certification_status, certification_level);
