-- Organization personas integration: accounts backfill, invitee invite RLS, org_members posting RLS.
set client_min_messages = warning;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  account_type text not null,
  profile_table text not null,
  profile_id uuid not null,
  display_name text not null,
  username text,
  avatar_url text,
  is_verified boolean default false,
  is_active boolean default true,
  follower_count integer default 0,
  following_count integer default 0,
  post_count integer default 0,
  engagement_score numeric default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(profile_table, profile_id)
);

create index if not exists idx_accounts_owner on public.accounts(owner_user_id);
create index if not exists idx_accounts_type on public.accounts(account_type);
create index if not exists idx_accounts_profile_lookup on public.accounts(profile_table, profile_id);
create index if not exists idx_accounts_active on public.accounts(is_active) where is_active = true;

alter table public.accounts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts'
      and policyname = 'accounts_public_active_read'
  ) then
    create policy accounts_public_active_read
      on public.accounts
      for select
      to anon, authenticated
      using (is_active = true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'accounts'
      and policyname = 'accounts_owner_manage'
  ) then
    create policy accounts_owner_manage
      on public.accounts
      for all
      to authenticated
      using (owner_user_id = (select auth.uid()))
      with check (owner_user_id = (select auth.uid()));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Backfill accounts rows for public organizer brands
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.accounts') is null then
    raise notice 'accounts table missing; skip backfill';
    return;
  end if;

  insert into public.accounts (
    owner_user_id,
    account_type,
    profile_table,
    profile_id,
    display_name,
    username,
    is_active,
    metadata
  )
  select
    oa.user_id,
    'organization',
    'organizer_accounts',
    oa.id,
    oa.organization_name,
    coalesce(oa.url_slug, left(replace(lower(oa.organization_name), ' ', '-'), 40)),
    true,
    jsonb_build_object(
      'organization_name', oa.organization_name,
      'organization_type', oa.organization_type,
      'subtype', coalesce(oa.subtype, 'generic'),
      'description', oa.description
    )
  from public.organizer_accounts oa
  where oa.is_active = true
    and not exists (
      select 1 from public.accounts a
      where a.profile_id = oa.id
        and a.account_type in ('organization', 'organizer', 'business', 'admin')
    );

  update public.accounts a
  set
    username = coalesce(oa.url_slug, a.username),
    display_name = coalesce(nullif(a.display_name, ''), oa.organization_name),
    metadata = coalesce(a.metadata, '{}'::jsonb) || jsonb_build_object(
      'subtype', coalesce(oa.subtype, 'generic'),
      'organization_name', oa.organization_name
    ),
    updated_at = now()
  from public.organizer_accounts oa
  where a.profile_id = oa.id
    and a.account_type in ('organization', 'organizer', 'business', 'admin')
    and oa.url_slug is not null
    and (a.username is distinct from oa.url_slug or a.username is null);
exception when others then
  raise notice 'accounts backfill skipped: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- org_invites: invitee can SELECT their own invite by email
-- ---------------------------------------------------------------------------
drop policy if exists invites_select on public.org_invites;
drop policy if exists org_invites_select on public.org_invites;
drop policy if exists org_invites_select_members_or_invitee on public.org_invites;

create policy org_invites_select_members_or_invitee on public.org_invites
  for select to authenticated
  using (
    public.has_perm(auth.uid(), org_id, 'org.invite')
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- ---------------------------------------------------------------------------
-- Posts RLS: allow org_members delegates to attribute posts to the org brand
-- ---------------------------------------------------------------------------
alter table if exists public.organizer_accounts
  add column if not exists ops_org_id uuid;

drop policy if exists "Users can create posts attributed to owned entities" on public.posts;

create policy "Users can create posts attributed to owned entities"
  on public.posts for insert
  with check (
    auth.uid() = user_id
    and (
      posted_as_profile_id is null
      or posted_as_profile_id = auth.uid()
      or exists (
        select 1 from public.artist_profiles
        where id = posted_as_profile_id and user_id = auth.uid()
      )
      or exists (
        select 1 from public.venue_profiles
        where id = posted_as_profile_id and user_id = auth.uid()
      )
      or exists (
        select 1 from public.organizer_accounts
        where id = posted_as_profile_id and user_id = auth.uid()
      )
      or exists (
        select 1 from public.account_relationships
        where owned_profile_id = posted_as_profile_id
          and owner_user_id = auth.uid()
      )
      or exists (
        select 1
        from public.organizer_accounts oa
        join public.org_members m on m.org_id = oa.ops_org_id
        where oa.id = posted_as_profile_id
          and m.user_id = auth.uid()
          and m.role in ('owner', 'admin', 'tour_manager', 'production')
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Blog RLS: same org_members delegation when blog table exists
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.artist_blog_posts') is null then
    return;
  end if;

  drop policy if exists "Users can create blogs attributed to owned entities" on public.artist_blog_posts;

  create policy "Users can create blogs attributed to owned entities"
    on public.artist_blog_posts for insert
    with check (
      auth.uid() = user_id
      and (
        posted_as_profile_id is null
        or posted_as_profile_id = auth.uid()
        or exists (
          select 1 from public.artist_profiles
          where id = posted_as_profile_id and user_id = auth.uid()
        )
        or exists (
          select 1 from public.venue_profiles
          where id = posted_as_profile_id and user_id = auth.uid()
        )
        or exists (
          select 1 from public.organizer_accounts
          where id = posted_as_profile_id and user_id = auth.uid()
        )
        or exists (
          select 1 from public.account_relationships
          where owned_profile_id = posted_as_profile_id
            and owner_user_id = auth.uid()
        )
        or exists (
          select 1
          from public.organizer_accounts oa
          join public.org_members m on m.org_id = oa.ops_org_id
          where oa.id = posted_as_profile_id
            and m.user_id = auth.uid()
            and m.role in ('owner', 'admin', 'tour_manager', 'production')
        )
      )
    );
exception when others then
  raise notice 'blog RLS update skipped: %', sqlerrm;
end $$;
