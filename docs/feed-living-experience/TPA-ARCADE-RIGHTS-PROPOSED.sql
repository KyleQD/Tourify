-- Tourify Protected Audio / Arcade fan-use rights: PROPOSAL ONLY (2026-10-18)
-- DO NOT run against any environment until canonical DB project, backup,
-- outstanding rights-schema divergence, and consent text are signed off.
-- Deliberately stored under docs/, not supabase/migrations/.
--
-- Defaults DENY new fan-wide game access. Upload/right confirmation is NOT a
-- sufficient grant for synchronization in interactive gameplay.
--
-- PRECONDITION: public.artist_music(id uuid PRIMARY KEY, user_id uuid not null)
-- Run reviewed migration via the repo's real migration workflow; test RLS in
-- a disposable environment and inspect Supabase security advisors.

begin;

create table if not exists public.music_arcade_permissions (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null unique references public.artist_music(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'revoked')),
  license_scope text[] not null default array[]::text[],
  territory_codes text[] not null default array[]::text[],
  -- Clearance requires legal evaluation, not just a user checkbox.
  master_clearance_verified boolean not null default false,
  composition_clearance_verified boolean not null default false,
  license_document_reference text,
  consent_text_version text,
  recorded_consent_at timestamptz,
  approved_at timestamptz,
  valid_from timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint music_arcade_approval_complete check (
    status <> 'approved' or (
      master_clearance_verified
      and composition_clearance_verified
      and consent_text_version is not null
      and recorded_consent_at is not null
      and approved_at is not null
      and revoked_at is null
      and license_scope @> array['beat_deck']::text[]
      and (expires_at is null or valid_from is null or expires_at > valid_from)
    )
  )
);

create index if not exists idx_music_arcade_permissions_owner on public.music_arcade_permissions(owner_user_id);
create index if not exists idx_music_arcade_permissions_status on public.music_arcade_permissions(status, valid_from, expires_at);

-- Charts only store musical timing metadata. Never raw recording bytes,
-- storage object paths, DRM keys, fingerprint values or rights contracts.
create table if not exists public.music_arcade_beatmaps (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.artist_music(id) on delete cascade,
  chart_version integer not null check (chart_version > 0),
  difficulty text not null check (difficulty in ('easy', 'normal', 'hard')),
  state text not null default 'draft' check (state in ('draft','in_review','published','archived')),
  analysis_algorithm_version text,
  bpm numeric(8,3) not null check (bpm >= 30 and bpm <= 300),
  audio_offset_ms integer not null default 0 check (audio_offset_ms between -30000 and 30000),
  chart_duration_ms integer not null check (chart_duration_ms between 1000 and 1800000),
  notes jsonb not null default '[]'::jsonb check (jsonb_typeof(notes) = 'array'),
  review_user_id uuid references auth.users(id),
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(track_id,difficulty,chart_version),
  constraint music_arcade_published_reviewed check (
    state <> 'published' or (review_user_id is not null and reviewed_at is not null and published_at is not null)
  )
);
create index if not exists idx_arcade_chart_selector on public.music_arcade_beatmaps(track_id, difficulty, state, chart_version desc);

-- Server-only, append-only audit log. No user direct writes or direct reads.
create table if not exists public.music_arcade_permission_events (
  id uuid primary key default gen_random_uuid(),
  permission_id uuid references public.music_arcade_permissions(id) on delete set null,
  track_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('consent_requested','clearance_reviewed','permission_approved','permission_revoked','license_expired','admin_hold')),
  consent_text_version text,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_arcade_permission_events_track_created on public.music_arcade_permission_events(track_id, created_at desc);

alter table public.music_arcade_permissions enable row level security;
alter table public.music_arcade_beatmaps enable row level security;
alter table public.music_arcade_permission_events enable row level security;

-- Owner can see their grant state, but cannot modify status/rights through
-- PostgREST. Only reviewed server code with service credentials can approve,
-- revoke or append events; use server-issued role boundaries and audit.
revoke all on public.music_arcade_permissions from anon, authenticated;
revoke all on public.music_arcade_beatmaps from anon, authenticated;
revoke all on public.music_arcade_permission_events from anon, authenticated;
grant select on public.music_arcade_permissions to authenticated;
grant select on public.music_arcade_beatmaps to authenticated;

create policy "Artist can view own Arcade permission status"
on public.music_arcade_permissions for select to authenticated
using (
  owner_user_id = (select auth.uid())
  and exists (
    select 1 from public.artist_music m
    where m.id = track_id and m.user_id = (select auth.uid())
  )
);

create policy "Artist can inspect own Arcade chart drafts"
on public.music_arcade_beatmaps for select to authenticated
using (
  exists (
    select 1 from public.artist_music m
    where m.id = track_id and m.user_id = (select auth.uid())
  )
);

-- No public policy for reading grants, published beatmap notes or audit
-- events. A server-side endpoint can expose a minimal approved catalog/chart
-- only AFTER fresh permission, moderation and playback-entitlement checks.

commit;

-- API-side permission eligibility (pseudocode; implement server-side):
-- permission.status === 'approved'
-- AND permission.master_clearance_verified === true
-- AND permission.composition_clearance_verified === true
-- AND now >= valid_from (if present), now < expires_at (if present)
-- AND permission.revoked_at IS NULL
-- AND requested scope/territory is within the recorded grant
-- AND artist_music.is_public AND is_visible AND moderation_status = 'approved'
-- AND artist_music.rights_confirmed
-- AND resolveMusicAccess() allows this listener
-- AND an approved beatmap exists (or practice-only mode is clearly labeled)
--
-- NEGATIVE TESTS (mandatory): anon, artist A reading B, direct INSERT/UPDATE,
-- fan reading grants/beatmaps/audit, invalid master/composition, non-approved,
-- expired, revoked, off-territory, preview-only paid content, deleted artist.
-- Stop NEW licenses immediately on revocation. Existing signed URLs remain
-- valid until expiry and require separate delivery-key revocation measures.
