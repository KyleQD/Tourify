set client_min_messages = warning;

alter table if exists public.organizations
  add column if not exists slug text;

do $$
begin
  if to_regclass('public.organizations') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'organizations_slug_key'
         and conrelid = 'public.organizations'::regclass
     ) then
    begin
      alter table public.organizations add constraint organizations_slug_key unique (slug);
    exception
      when duplicate_object then null;
      when unique_violation then null;
    end;
  end if;
end;
$$;

alter table if exists public.tours
  add column if not exists org_id uuid references public.organizations(id) on delete set null,
  add column if not exists slug text,
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists revenue numeric,
  add column if not exists expenses numeric;

update public.tours
set created_by = user_id
where created_by is null
  and user_id is not null;

update public.tours
set slug = concat(
  lower(regexp_replace(coalesce(nullif(name, ''), 'tour'), '[^a-zA-Z0-9]+', '-', 'g')),
  '-',
  substr(replace(id::text, '-', ''), 1, 8)
)
where slug is null or btrim(slug) = '';

do $$
begin
  if to_regclass('public.tours') is not null
     and not exists (
       select 1
       from pg_constraint
       where conname = 'tours_slug_key'
         and conrelid = 'public.tours'::regclass
     ) then
    begin
      alter table public.tours add constraint tours_slug_key unique (slug);
    exception
      when duplicate_object then null;
      when unique_violation then null;
    end;
  end if;
end;
$$;

create index if not exists idx_tours_org_status_dates
  on public.tours(org_id, status, start_date, end_date);

create index if not exists idx_tours_created_by on public.tours(created_by);
create index if not exists idx_tours_user_id on public.tours(user_id);

alter table if exists public.tour_team_members
  add column if not exists is_active boolean default true;

create or replace function public.is_tour_owner(p_tour_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.tours t
    where t.id = p_tour_id
      and (
        t.created_by = auth.uid()
        or t.user_id = auth.uid()
      )
  );
$$;

create or replace function public.is_confirmed_tour_team_member(p_tour_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.tour_team_members ttm
    where ttm.tour_id = p_tour_id
      and ttm.user_id = auth.uid()
      and coalesce(ttm.is_active, true) = true
      and (
        lower(coalesce(ttm.status::text, 'confirmed')) in ('confirmed', 'active', 'accepted')
        or ttm.status is null
      )
  );
$$;

create or replace function public.can_access_tour(p_tour_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_tour_owner(p_tour_id) or public.is_confirmed_tour_team_member(p_tour_id);
$$;

revoke all on function public.is_tour_owner(uuid) from public;
revoke all on function public.is_confirmed_tour_team_member(uuid) from public;
revoke all on function public.can_access_tour(uuid) from public;
grant execute on function public.is_tour_owner(uuid) to authenticated;
grant execute on function public.is_confirmed_tour_team_member(uuid) to authenticated;
grant execute on function public.can_access_tour(uuid) to authenticated;

drop policy if exists "Users can view tours they created" on public.tours;
drop policy if exists "Users can create tours" on public.tours;
drop policy if exists "Users can update tours they created" on public.tours;
drop policy if exists "Users can delete tours they created" on public.tours;
drop policy if exists tours_read_owner_or_team on public.tours;
drop policy if exists tours_read on public.tours;
drop policy if exists tours_write on public.tours;
drop policy if exists "Users can view tours they have access to" on public.tours;
drop policy if exists "Tour managers can manage tours" on public.tours;

create policy tours_select_owner_or_team
on public.tours
for select
to authenticated
using (public.can_access_tour(id));

create policy tours_insert_owner
on public.tours
for insert
to authenticated
with check (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or user_id = auth.uid()
    or (created_by is null and user_id is null)
  )
);

create policy tours_update_owner
on public.tours
for update
to authenticated
using (public.is_tour_owner(id))
with check (public.is_tour_owner(id));

create policy tours_delete_owner
on public.tours
for delete
to authenticated
using (public.is_tour_owner(id));

drop policy if exists "Users can view their tour team members" on public.tour_team_members;
drop policy if exists "Users can insert their tour team members" on public.tour_team_members;
drop policy if exists "Users can update their tour team members" on public.tour_team_members;
drop policy if exists "Users can delete their tour team members" on public.tour_team_members;
drop policy if exists "Users can view team members for tours they created" on public.tour_team_members;
drop policy if exists "Users can manage team members for tours they created" on public.tour_team_members;
drop policy if exists team_read_owner_or_team on public.tour_team_members;
drop policy if exists team_write_owner_only on public.tour_team_members;
drop policy if exists "Beta access - users can view team members" on public.tour_team_members;
drop policy if exists "Beta access - users can manage team members" on public.tour_team_members;
drop policy if exists tour_team_members_all on public.tour_team_members;

create policy tour_team_members_select
on public.tour_team_members
for select
to authenticated
using (
  public.is_tour_owner(tour_id)
  or (user_id = auth.uid() and coalesce(is_active, true) = true)
);

create policy tour_team_members_insert
on public.tour_team_members
for insert
to authenticated
with check (public.is_tour_owner(tour_id));

create policy tour_team_members_update
on public.tour_team_members
for update
to authenticated
using (public.is_tour_owner(tour_id))
with check (public.is_tour_owner(tour_id));

create policy tour_team_members_delete
on public.tour_team_members
for delete
to authenticated
using (public.is_tour_owner(tour_id));;
