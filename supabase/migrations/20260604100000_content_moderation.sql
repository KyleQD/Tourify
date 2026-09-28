-- Add moderation columns to posts table
alter table posts
  add column if not exists moderation_status text not null default 'approved'
    check (moderation_status in ('approved', 'pending', 'flagged', 'removed')),
  add column if not exists is_visible boolean not null default true;

-- Add moderation columns to artist_music table
alter table artist_music
  add column if not exists moderation_status text not null default 'approved'
    check (moderation_status in ('approved', 'pending', 'flagged', 'removed')),
  add column if not exists is_visible boolean not null default true;

-- Indexes for moderation filtering
create index if not exists idx_posts_moderation_status on posts (moderation_status);
create index if not exists idx_posts_is_visible on posts (is_visible);
create index if not exists idx_artist_music_moderation_status on artist_music (moderation_status);

-- Organizer accounts are referenced by feature flag and staffing policies below.
-- Some restored migration histories omitted the original create-table migration,
-- so keep this compatibility definition additive and owner-scoped.
create table if not exists public.organizer_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_name text not null,
  organization_type text not null default 'organizer',
  description text,
  contact_info jsonb default '{}'::jsonb,
  specialties text[] default '{}',
  social_links jsonb default '{}'::jsonb,
  admin_level text,
  ops_org_id uuid,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizer_accounts enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'organizer_accounts'
      and policyname = 'organizer_accounts_owner_manage'
  ) then
    create policy organizer_accounts_owner_manage
      on public.organizer_accounts
      for all
      to authenticated
      using ((select auth.uid()) = user_id)
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- Feature flags table
create table if not exists feature_flags (
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

-- RLS for feature_flags (admin only)
alter table feature_flags enable row level security;

create policy "Admin can manage feature flags"
  on feature_flags
  for all
  to authenticated
  using (
    exists (
      select 1 from organizer_accounts
      where user_id = auth.uid() and is_active = true
    )
  )
  with check (
    exists (
      select 1 from organizer_accounts
      where user_id = auth.uid() and is_active = true
    )
  );

-- Trigger to update updated_at on feature_flags
create or replace function update_feature_flags_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists feature_flags_updated_at on feature_flags;
create trigger feature_flags_updated_at
  before update on feature_flags
  for each row execute function update_feature_flags_updated_at();
