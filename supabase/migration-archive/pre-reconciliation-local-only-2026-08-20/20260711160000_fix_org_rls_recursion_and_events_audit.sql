-- Break RLS recursion: has_perm / is_org_member queried org_members under RLS,
-- and members_select used is_org_member → infinite recursion (54001).
create or replace function public.is_org_member(uid uuid, oid uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $$
  select exists(
    select 1 from public.org_members m
    where m.org_id = oid and m.user_id = uid
  )
$$;

create or replace function public.has_perm(uid uuid, oid uuid, perm text)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'extensions'
as $$
declare
  r text;
  p text[];
begin
  select role into r from public.org_members where org_id = oid and user_id = uid;
  if r is null then return false; end if;
  select perms into p from public.org_role_permissions where role = r;
  if p is null then return false; end if;
  return perm = any(p);
end
$$;

revoke all on function public.is_org_member(uuid, uuid) from public;
grant execute on function public.is_org_member(uuid, uuid) to authenticated, anon, service_role;

revoke all on function public.has_perm(uuid, uuid, text) from public;
grant execute on function public.has_perm(uuid, uuid, text) to authenticated, anon, service_role;

-- Misplaced events_v2 audit trigger on legacy/artist events table
drop trigger if exists trg_events_audit on public.events;
