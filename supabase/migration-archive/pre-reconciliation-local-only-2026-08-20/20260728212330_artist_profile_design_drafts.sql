-- Private working copies for Artist Profile Studio.
-- Published designs remain in artist_profiles.settings.public_profile_design so
-- the canonical public artist loader can render them without privileged reads.

create table if not exists public.artist_profile_design_drafts (
  artist_profile_id uuid primary key
    references public.artist_profiles(id) on delete cascade,
  owner_user_id uuid not null
    references auth.users(id) on delete cascade,
  draft jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artist_profile_design_drafts_draft_is_object
    check (jsonb_typeof(draft) = 'object')
);

create index if not exists artist_profile_design_drafts_owner_user_id_idx
  on public.artist_profile_design_drafts(owner_user_id);

create or replace function public.set_artist_profile_design_draft_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_artist_profile_design_draft_updated_at
  on public.artist_profile_design_drafts;

create trigger set_artist_profile_design_draft_updated_at
before update on public.artist_profile_design_drafts
for each row execute function public.set_artist_profile_design_draft_updated_at();

alter table public.artist_profile_design_drafts enable row level security;
alter table public.artist_profile_design_drafts force row level security;

drop policy if exists "Artist owners can read profile design drafts"
  on public.artist_profile_design_drafts;
create policy "Artist owners can read profile design drafts"
on public.artist_profile_design_drafts
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  and exists (
    select 1
    from public.artist_profiles
    where artist_profiles.id = artist_profile_design_drafts.artist_profile_id
      and artist_profiles.user_id = (select auth.uid())
  )
);

drop policy if exists "Artist owners can insert profile design drafts"
  on public.artist_profile_design_drafts;
create policy "Artist owners can insert profile design drafts"
on public.artist_profile_design_drafts
for insert
to authenticated
with check (
  owner_user_id = (select auth.uid())
  and exists (
    select 1
    from public.artist_profiles
    where artist_profiles.id = artist_profile_design_drafts.artist_profile_id
      and artist_profiles.user_id = (select auth.uid())
  )
);

drop policy if exists "Artist owners can update profile design drafts"
  on public.artist_profile_design_drafts;
create policy "Artist owners can update profile design drafts"
on public.artist_profile_design_drafts
for update
to authenticated
using (
  owner_user_id = (select auth.uid())
  and exists (
    select 1
    from public.artist_profiles
    where artist_profiles.id = artist_profile_design_drafts.artist_profile_id
      and artist_profiles.user_id = (select auth.uid())
  )
)
with check (
  owner_user_id = (select auth.uid())
  and exists (
    select 1
    from public.artist_profiles
    where artist_profiles.id = artist_profile_design_drafts.artist_profile_id
      and artist_profiles.user_id = (select auth.uid())
  )
);

drop policy if exists "Artist owners can delete profile design drafts"
  on public.artist_profile_design_drafts;
create policy "Artist owners can delete profile design drafts"
on public.artist_profile_design_drafts
for delete
to authenticated
using (
  owner_user_id = (select auth.uid())
  and exists (
    select 1
    from public.artist_profiles
    where artist_profiles.id = artist_profile_design_drafts.artist_profile_id
      and artist_profiles.user_id = (select auth.uid())
  )
);

revoke all on table public.artist_profile_design_drafts from anon;
grant select, insert, update, delete
  on table public.artist_profile_design_drafts
  to authenticated;

revoke execute on function public.set_artist_profile_design_draft_updated_at()
  from public, anon, authenticated;
