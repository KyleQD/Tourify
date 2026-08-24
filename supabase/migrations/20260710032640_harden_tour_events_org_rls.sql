set client_min_messages = warning;

-- Harden admin tour/event builder access:
-- 1) tour_events: replace broad authenticated ALL with org/tour-scoped policies
-- 2) tours: allow org_members access alongside owner/team helpers
-- 3) unique (tour_id, event_id) index (idempotent)
-- 4) lock down touch_tour_events_updated_at execute grants

-- ---------------------------------------------------------------------------
-- 1. Unique assignment constraint (idempotent)
-- ---------------------------------------------------------------------------

create unique index if not exists tour_events_tour_id_event_id_key
  on public.tour_events (tour_id, event_id);

-- ---------------------------------------------------------------------------
-- 2. Trigger function hygiene (non-security-definer, locked grants)
-- ---------------------------------------------------------------------------

create or replace function public.touch_tour_events_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_tour_events_updated_at() from public;
revoke all on function public.touch_tour_events_updated_at() from anon;
revoke all on function public.touch_tour_events_updated_at() from authenticated;

do $$
begin
  if to_regclass('public.tour_events') is not null then
    drop trigger if exists trg_tour_events_touch on public.tour_events;
    create trigger trg_tour_events_touch
      before update on public.tour_events
      for each row
      execute function public.touch_tour_events_updated_at();
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. tours: org_members access in addition to owner/team
-- ---------------------------------------------------------------------------

drop policy if exists tours_select_owner_or_team on public.tours;
drop policy if exists tours_select_owner_team_or_org on public.tours;
drop policy if exists tours_insert_owner on public.tours;
drop policy if exists tours_insert_owner_or_org on public.tours;
drop policy if exists tours_update_owner on public.tours;
drop policy if exists tours_update_owner_or_org on public.tours;
drop policy if exists tours_delete_owner on public.tours;
drop policy if exists tours_delete_owner_or_org on public.tours;

create policy tours_select_owner_team_or_org
on public.tours
for select
to authenticated
using (
  public.can_access_tour(id)
  or (org_id is not null and public.is_org_member(auth.uid(), org_id))
);

create policy tours_insert_owner_or_org
on public.tours
for insert
to authenticated
with check (
  auth.uid() is not null
  and (
    created_by = auth.uid()
    or user_id = auth.uid()
    or (created_by is null and user_id is null)
    or (org_id is not null and public.has_perm(auth.uid(), org_id, 'event.manage'))
  )
);

create policy tours_update_owner_or_org
on public.tours
for update
to authenticated
using (
  public.is_tour_owner(id)
  or (org_id is not null and public.has_perm(auth.uid(), org_id, 'event.manage'))
)
with check (
  public.is_tour_owner(id)
  or (org_id is not null and public.has_perm(auth.uid(), org_id, 'event.manage'))
);

create policy tours_delete_owner_or_org
on public.tours
for delete
to authenticated
using (
  public.is_tour_owner(id)
  or (org_id is not null and public.has_perm(auth.uid(), org_id, 'event.manage'))
);

-- ---------------------------------------------------------------------------
-- 4. tour_events: org-scoped + tour-owner access
-- ---------------------------------------------------------------------------

drop policy if exists tour_events_all on public.tour_events;
drop policy if exists tour_events_select on public.tour_events;
drop policy if exists tour_events_insert on public.tour_events;
drop policy if exists tour_events_update on public.tour_events;
drop policy if exists tour_events_delete on public.tour_events;

create policy tour_events_select
on public.tour_events
for select
to authenticated
using (
  public.can_access_tour(tour_id)
  or (
    exists (
      select 1
      from public.tours t
      where t.id = tour_id
        and t.org_id is not null
        and public.is_org_member(auth.uid(), t.org_id)
    )
    and exists (
      select 1
      from public.events_v2 e
      where e.id = event_id
        and e.org_id is not null
        and public.is_org_member(auth.uid(), e.org_id)
    )
  )
);

create policy tour_events_insert
on public.tour_events
for insert
to authenticated
with check (
  public.is_tour_owner(tour_id)
  or exists (
    select 1
    from public.tours t
    join public.events_v2 e on e.id = event_id
    where t.id = tour_id
      and t.org_id is not null
      and e.org_id is not null
      and t.org_id = e.org_id
      and public.has_perm(auth.uid(), t.org_id, 'event.manage')
  )
);

create policy tour_events_update
on public.tour_events
for update
to authenticated
using (
  public.is_tour_owner(tour_id)
  or exists (
    select 1
    from public.tours t
    join public.events_v2 e on e.id = event_id
    where t.id = tour_id
      and t.org_id is not null
      and e.org_id is not null
      and t.org_id = e.org_id
      and public.has_perm(auth.uid(), t.org_id, 'event.manage')
  )
)
with check (
  public.is_tour_owner(tour_id)
  or exists (
    select 1
    from public.tours t
    join public.events_v2 e on e.id = event_id
    where t.id = tour_id
      and t.org_id is not null
      and e.org_id is not null
      and t.org_id = e.org_id
      and public.has_perm(auth.uid(), t.org_id, 'event.manage')
  )
);

create policy tour_events_delete
on public.tour_events
for delete
to authenticated
using (
  public.is_tour_owner(tour_id)
  or exists (
    select 1
    from public.tours t
    join public.events_v2 e on e.id = event_id
    where t.id = tour_id
      and t.org_id is not null
      and e.org_id is not null
      and t.org_id = e.org_id
      and public.has_perm(auth.uid(), t.org_id, 'event.manage')
  )
);
