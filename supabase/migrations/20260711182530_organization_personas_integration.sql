-- Organization personas integration: accounts backfill, invitee invite RLS, org_members posting RLS.
set client_min_messages = warning;

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
