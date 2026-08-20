set client_min_messages = warning;

-- Repair legacy organizer accounts that predate the org-scoped Admin model.
-- New organizer creation already creates organizations + org_members owner rows;
-- this migration only backfills missing links and missing owner memberships.

create extension if not exists pgcrypto;

do $$
declare
  account record;
  base_slug text;
  resolved_slug text;
  slug_index integer;
  new_org_id uuid;
begin
  if to_regclass('public.organizer_accounts') is null
    or to_regclass('public.organizations') is null
    or to_regclass('public.org_members') is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizer_accounts'
      and column_name = 'ops_org_id'
  ) then
    return;
  end if;

  for account in
    select id, user_id, organization_name, url_slug
    from public.organizer_accounts
    where is_active is distinct from false
      and user_id is not null
      and ops_org_id is null
  loop
    base_slug := left(
      nullif(
        lower(
          regexp_replace(
            regexp_replace(
              coalesce(nullif(account.url_slug, ''), nullif(account.organization_name, ''), 'org-' || left(account.id::text, 8)),
              '[^a-zA-Z0-9]+',
              '-',
              'g'
            ),
            '(^-|-$)',
            '',
            'g'
          )
        ),
        ''
      ),
      40
    );

    if base_slug is null or base_slug = '' then
      base_slug := 'org-' || left(account.id::text, 8);
    end if;

    resolved_slug := base_slug;
    slug_index := 0;
    new_org_id := null;

    loop
      begin
        insert into public.organizations (name, slug, created_by)
        values (
          coalesce(nullif(account.organization_name, ''), 'Organization'),
          resolved_slug,
          account.user_id
        )
        returning id into new_org_id;
        exit;
      exception
        when unique_violation then
          slug_index := slug_index + 1;
          resolved_slug := left(base_slug, 36) || '-' || slug_index::text;
      end;
    end loop;

    update public.organizer_accounts
    set ops_org_id = new_org_id
    where id = account.id
      and ops_org_id is null;
  end loop;
end $$;

insert into public.org_members (org_id, user_id, role, invited_by)
select oa.ops_org_id, oa.user_id, 'owner', oa.user_id
from public.organizer_accounts oa
where oa.is_active is distinct from false
  and oa.user_id is not null
  and oa.ops_org_id is not null
  and not exists (
    select 1
    from public.org_members om
    where om.org_id = oa.ops_org_id
      and om.user_id = oa.user_id
  )
on conflict (org_id, user_id) do nothing;
