-- WORK-102: Organization / assignment authority for workforce records.
-- Expand-only: can_workforce helper + org_id on tour party rows (backfill where known).
-- App-layer authority (lib/admin/workforce-authority.service.ts) is the command boundary;
-- this helper is available for future RLS and SQL checks. No blanket policy replace.

create or replace function public.can_workforce(uid uuid, oid uuid, perm text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'extensions'
as $$
  select
    uid is not null
    and oid is not null
    and public.is_org_member(uid, oid)
    and public.has_perm(uid, oid, perm);
$$;

revoke all on function public.can_workforce(uuid, uuid, text) from public;
grant execute on function public.can_workforce(uuid, uuid, text) to authenticated, service_role;

comment on function public.can_workforce(uuid, uuid, text) is
  'WORK-102 workforce predicate: membership + has_perm for workforce.* capabilities.';

-- Denormalized org scope on tour party (resolved via tours; never invent).
alter table if exists public.tour_team_members
  add column if not exists org_id uuid references public.organizations (id) on delete cascade;

do $$
begin
  if to_regclass('public.tour_team_members') is not null
     and to_regclass('public.tours') is not null then
    update public.tour_team_members m
    set org_id = t.org_id
    from public.tours t
    where m.org_id is null
      and m.tour_id = t.id
      and t.org_id is not null;
  end if;
end $$;

create index if not exists idx_tour_team_members_org_id
  on public.tour_team_members (org_id)
  where org_id is not null;

comment on column public.tour_team_members.org_id is
  'WORK-102 acting organization scope; backfilled from tours.org_id when known.';
