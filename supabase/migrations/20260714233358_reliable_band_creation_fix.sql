-- Reliable organization/band creation:
-- keep the authenticated-user ownership guard, but let band creation set
-- visibility atomically during organizer account creation.

drop function if exists public.create_organizer_account(uuid, text, text, text, jsonb, jsonb, text[], text, text);
drop function if exists public.create_organizer_account(uuid, text, text, text, jsonb, jsonb, text[], text, text, boolean);

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
  p_url_slug text default null,
  p_is_public boolean default true
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

  -- Pick a fresh ops-org slug without updating or attaching to any existing organization.
  -- This keeps the function scoped to the newly created organizer/band account.
  loop
    if exists (select 1 from public.organizer_accounts where url_slug = resolved_slug) then
      n := n + 1;
      resolved_slug := left(base_slug, 36) || '-' || n::text;
      continue;
    end if;

    begin
      insert into public.organizations (name, slug, created_by)
      values (
        p_organization_name,
        resolved_slug,
        p_user_id
      )
      returning id into new_ops_org_id;
      exit;
    exception
      when unique_violation then
        n := n + 1;
        resolved_slug := left(base_slug, 36) || '-' || n::text;
    end;
  end loop;

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
    case
      when resolved_subtype = 'band' then coalesce(p_is_public, true)
      else true
    end
  )
  returning id into new_account_id;

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
      null;
    end;
  end if;

  return new_account_id;
end;
$$;

comment on function public.create_organizer_account is
  'Creates an organization brand (slug + subtype) linked to a new ops tenant and owner membership. Only band subtype can use p_is_public; other subtypes remain public. Requires auth.uid() to match p_user_id.';
