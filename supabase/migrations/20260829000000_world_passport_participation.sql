-- =====================================================================
-- P21 — Music Passport, follows, and community contributions.
-- Additive; owner-scoped RLS on user data, deny-by-default on
-- contribution queues (console trusted path triages them).
-- =====================================================================

create table if not exists public.world_user_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  object_kind text not null check (object_kind in ('place','country','scene','genre','journey')),
  object_key text not null,
  created_at timestamptz not null default now(),

  constraint world_user_follows_unique unique (user_id, object_kind, object_key)
);
create index if not exists world_user_follows_object_idx
  on public.world_user_follows (object_kind, object_key);

alter table public.world_user_follows enable row level security;
create policy world_user_follows_owner_all
  on public.world_user_follows
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.world_passport_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_kind text not null check (entry_kind in (
    'place_explored','genre_discovered','scene_discovered',
    'radio_heard','instrument_learned','journey_completed','event_attended')),
  entry_key text not null,
  recorded_at timestamptz not null default now(),
  verification jsonb,

  constraint world_passport_entries_unique unique (user_id, entry_kind, entry_key)
);
create index if not exists world_passport_entries_user_idx
  on public.world_passport_entries (user_id, entry_kind);

alter table public.world_passport_entries enable row level security;
create policy world_passport_entries_owner_all
  on public.world_passport_entries
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Passport visibility settings live on the user's own profile row so they
-- participate in the existing profile privacy surface.
alter table public.profiles
  add column if not exists world_passport_settings jsonb not null default '{"visibility":"private","shareJourneys":false}'::jsonb;

create table if not exists public.world_contributions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in (
    'correction','landmark','artist','tradition','connection','source_suggestion')),
  place_path text,
  payload jsonb not null default '{}'::jsonb,
  review_status text not null default 'candidate'
    check (review_status in ('candidate','needs_review','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists world_contributions_queue_idx
  on public.world_contributions (review_status, created_at);

alter table public.world_contributions enable row level security;
create policy world_contributions_author_read_own
  on public.world_contributions
  for select to authenticated
  using (submitted_by = auth.uid());
