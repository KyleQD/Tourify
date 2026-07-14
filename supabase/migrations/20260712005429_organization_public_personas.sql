-- Organization public personas: slug, subtype, ops tenant link, artist roster, tour manager role.
set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- organizer_accounts: public brand identity
-- ---------------------------------------------------------------------------
alter table public.organizer_accounts
  add column if not exists url_slug text,
  add column if not exists subtype text,
  add column if not exists ops_org_id uuid,
  add column if not exists avatar_url text,
  add column if not exists banner_url text,
  add column if not exists is_public boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organizer_accounts_subtype_check'
      and conrelid = 'public.organizer_accounts'::regclass
  ) then
    alter table public.organizer_accounts
      add constraint organizer_accounts_subtype_check
      check (
        subtype is null or subtype in (
          'band',
          'label',
          'promoter',
          'performance_agency',
          'staffing_agency',
          'production_company',
          'rental_company',
          'generic'
        )
      );
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'organizations'
  ) and not exists (
    select 1 from pg_constraint
    where conname = 'organizer_accounts_ops_org_id_fkey'
      and conrelid = 'public.organizer_accounts'::regclass
  ) then
    alter table public.organizer_accounts
      add constraint organizer_accounts_ops_org_id_fkey
      foreign key (ops_org_id) references public.organizations (id) on delete set null;
  end if;
end $$;

create unique index if not exists organizer_accounts_url_slug_uidx
  on public.organizer_accounts (url_slug)
  where url_slug is not null;

create index if not exists organizer_accounts_subtype_idx
  on public.organizer_accounts (subtype)
  where subtype is not null;

create index if not exists organizer_accounts_ops_org_id_idx
  on public.organizer_accounts (ops_org_id)
  where ops_org_id is not null;

create index if not exists organizer_accounts_public_slug_idx
  on public.organizer_accounts (url_slug)
  where is_public = true and is_active = true;

-- Backfill subtype from legacy organization_type
update public.organizer_accounts
set subtype = case
  when organization_type in ('band', 'label', 'promoter', 'performance_agency', 'staffing_agency', 'production_company', 'rental_company', 'generic')
    then organization_type
  when organization_type in ('talent_agency', 'booking_agency') then 'performance_agency'
  when organization_type in ('event_management', 'festival_organizer', 'tour_management') then 'promoter'
  when organization_type = 'production_company' then 'production_company'
  else 'generic'
end
where subtype is null;

-- Backfill public slugs from organization names
with candidates as (
  select
    id,
    lower(regexp_replace(regexp_replace(coalesce(organization_name, 'org'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')) as base_slug
  from public.organizer_accounts
  where url_slug is null
),
numbered as (
  select
    id,
    case
      when base_slug = '' then 'org'
      else left(base_slug, 40)
    end as base_slug,
    row_number() over (
      partition by case when base_slug = '' then 'org' else left(base_slug, 40) end
      order by id
    ) as rn
  from candidates
)
update public.organizer_accounts oa
set url_slug = case
  when n.rn = 1 then n.base_slug
  else left(n.base_slug, 36) || '-' || n.rn::text
end
from numbered n
where oa.id = n.id
  and oa.url_slug is null;

-- Public read for active public brands
drop policy if exists organizer_accounts_public_select on public.organizer_accounts;
create policy organizer_accounts_public_select on public.organizer_accounts
  for select to anon, authenticated
  using (is_public = true and is_active = true);

-- ---------------------------------------------------------------------------
-- organization_artist_members (band / label roster)
-- ---------------------------------------------------------------------------
create table if not exists public.organization_artist_members (
  id uuid primary key default gen_random_uuid(),
  organizer_account_id uuid not null references public.organizer_accounts (id) on delete cascade,
  artist_profile_id uuid not null references public.artist_profiles (id) on delete cascade,
  role text not null default 'member',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'removed')),
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organizer_account_id, artist_profile_id)
);

create index if not exists organization_artist_members_org_idx
  on public.organization_artist_members (organizer_account_id, status);

create index if not exists organization_artist_members_artist_idx
  on public.organization_artist_members (artist_profile_id, status);

alter table public.organization_artist_members enable row level security;

drop policy if exists organization_artist_members_public_select on public.organization_artist_members;
create policy organization_artist_members_public_select on public.organization_artist_members
  for select to anon, authenticated
  using (
    status = 'accepted'
    and exists (
      select 1 from public.organizer_accounts oa
      where oa.id = organizer_account_id
        and oa.is_public = true
        and oa.is_active = true
    )
  );

drop policy if exists organization_artist_members_artist_select on public.organization_artist_members;
create policy organization_artist_members_artist_select on public.organization_artist_members
  for select to authenticated
  using (
    exists (
      select 1 from public.artist_profiles ap
      where ap.id = artist_profile_id and ap.user_id = auth.uid()
    )
  );

drop policy if exists organization_artist_members_org_manage on public.organization_artist_members;
create policy organization_artist_members_org_manage on public.organization_artist_members
  for all to authenticated
  using (
    exists (
      select 1 from public.organizer_accounts oa
      where oa.id = organizer_account_id and oa.user_id = auth.uid()
    )
    or exists (
      select 1 from public.organizer_accounts oa
      join public.org_members m on m.org_id = oa.ops_org_id
      where oa.id = organizer_account_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'tour_manager')
    )
  )
  with check (
    exists (
      select 1 from public.organizer_accounts oa
      where oa.id = organizer_account_id and oa.user_id = auth.uid()
    )
    or exists (
      select 1 from public.organizer_accounts oa
      join public.org_members m on m.org_id = oa.ops_org_id
      where oa.id = organizer_account_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'admin', 'tour_manager')
    )
  );

drop policy if exists organization_artist_members_artist_update on public.organization_artist_members;
create policy organization_artist_members_artist_update on public.organization_artist_members
  for update to authenticated
  using (
    exists (
      select 1 from public.artist_profiles ap
      where ap.id = artist_profile_id and ap.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.artist_profiles ap
      where ap.id = artist_profile_id and ap.user_id = auth.uid()
    )
  );

grant select on public.organization_artist_members to anon, authenticated;
grant insert, update, delete on public.organization_artist_members to authenticated;
grant all on public.organization_artist_members to service_role;

-- ---------------------------------------------------------------------------
-- Tour manager role on ops tenants
-- ---------------------------------------------------------------------------
insert into public.org_role_permissions (role, perms) values
  (
    'tour_manager',
    array[
      'event.manage',
      'offer.manage',
      'task.manage',
      'schedule.manage',
      'staff.manage',
      'report.view',
      'storage.read',
      'storage.write',
      'org.invite'
    ]
  )
on conflict (role) do update
set perms = excluded.perms;

-- ---------------------------------------------------------------------------
-- create_organizer_account: slug + subtype + linked ops org
-- ---------------------------------------------------------------------------
drop function if exists public.create_organizer_account(uuid, text, text, text, jsonb, jsonb, text[]);
drop function if exists public.create_organizer_account(uuid, text, text, text, jsonb, jsonb, text[], text, text);

create or replace function public.slugify_org_name(p_name text)
returns text
language sql
immutable
as $$
  select left(
    nullif(
      lower(regexp_replace(regexp_replace(coalesce(p_name, 'org'), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')),
      ''
    ),
    40
  );
$$;

create or replace function public.create_organizer_account(
  p_user_id uuid,
  p_organization_name text,
  p_organization_type text default 'event_management',
  p_description text default null,
  p_contact_info jsonb default '{}'::jsonb,
  p_social_links jsonb default '{}'::jsonb,
  p_specialties text[] default '{}',
  p_subtype text default null,
  p_url_slug text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_account_id uuid;
  resolved_subtype text;
  resolved_slug text;
  base_slug text;
  slug_attempt text;
  n int := 0;
  new_ops_org_id uuid;
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'User ID mismatch';
  end if;

  resolved_subtype := coalesce(
    nullif(p_subtype, ''),
    case
      when p_organization_type in (
        'band', 'label', 'promoter', 'performance_agency', 'staffing_agency',
        'production_company', 'rental_company', 'generic'
      ) then p_organization_type
      when p_organization_type in ('talent_agency', 'booking_agency') then 'performance_agency'
      when p_organization_type in ('event_management', 'festival_organizer', 'tour_management') then 'promoter'
      else 'generic'
    end
  );

  base_slug := coalesce(nullif(public.slugify_org_name(p_url_slug), ''), public.slugify_org_name(p_organization_name), 'org');
  resolved_slug := base_slug;
  while exists (select 1 from public.organizer_accounts where url_slug = resolved_slug) loop
    n := n + 1;
    resolved_slug := left(base_slug, 36) || '-' || n::text;
  end loop;

  insert into public.organizations (name, slug, created_by)
  values (
    p_organization_name,
    resolved_slug,
    p_user_id
  )
  on conflict (slug) do update set name = excluded.name
  returning id into new_ops_org_id;

  if new_ops_org_id is null then
    select id into new_ops_org_id from public.organizations where slug = resolved_slug limit 1;
  end if;

  insert into public.org_members (org_id, user_id, role, invited_by)
  values (new_ops_org_id, p_user_id, 'owner', p_user_id)
  on conflict (org_id, user_id) do nothing;

  insert into public.organizer_accounts (
    user_id,
    organization_name,
    organization_type,
    description,
    contact_info,
    social_links,
    specialties,
    admin_level,
    is_active,
    url_slug,
    subtype,
    ops_org_id,
    is_public
  ) values (
    p_user_id,
    p_organization_name,
    p_organization_type,
    p_description,
    coalesce(p_contact_info, '{}'::jsonb),
    coalesce(p_social_links, '{}'::jsonb),
    coalesce(p_specialties, '{}'),
    'super',
    true,
    resolved_slug,
    resolved_subtype,
    new_ops_org_id,
    true
  )
  returning id into new_account_id;

  -- Keep accounts search index in sync when table exists
  if to_regclass('public.accounts') is not null then
    begin
      if not exists (
        select 1 from public.accounts
        where profile_id = new_account_id
          and account_type in ('organization', 'organizer', 'business', 'admin')
      ) then
        insert into public.accounts (
          owner_user_id,
          account_type,
          profile_id,
          display_name,
          username,
          is_active,
          metadata
        ) values (
          p_user_id,
          'organization',
          new_account_id,
          p_organization_name,
          resolved_slug,
          true,
          jsonb_build_object(
            'organization_name', p_organization_name,
            'organization_type', p_organization_type,
            'subtype', resolved_subtype,
            'description', p_description
          )
        );
      else
        update public.accounts
        set
          display_name = p_organization_name,
          username = resolved_slug,
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'organization_name', p_organization_name,
            'organization_type', p_organization_type,
            'subtype', resolved_subtype
          ),
          updated_at = now()
        where profile_id = new_account_id
          and account_type in ('organization', 'organizer', 'business', 'admin');
      end if;
    exception when others then
      -- Non-fatal: public brand row already created
      null;
    end;
  end if;

  return new_account_id;
end;
$$;

comment on function public.create_organizer_account is
  'Creates a public organization brand (slug + subtype) linked to an ops tenant and owner membership';

-- Sync accounts.username to organizer url_slug when both tables exist
do $$
begin
  if to_regclass('public.accounts') is not null then
    update public.accounts a
    set
      username = oa.url_slug,
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
  end if;
exception when others then
  raise notice 'accounts username sync skipped: %', sqlerrm;
end $$;