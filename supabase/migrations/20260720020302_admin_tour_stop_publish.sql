-- Canonical tour-stop reconciliation and transactional publish command.

alter table public.tours
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists artist_id uuid references public.profiles(id) on delete set null,
  add column if not exists cover_image_url text,
  add column if not exists crew_size integer,
  add column if not exists transportation text,
  add column if not exists accommodation text,
  add column if not exists equipment_requirements text;

drop policy if exists tours_insert_owner_or_org on public.tours;
drop policy if exists tours_update_owner_or_org on public.tours;
drop policy if exists tours_delete_owner_or_org on public.tours;

create policy tours_insert_owner_or_org on public.tours
  for insert to authenticated
  with check (
    (org_id is not null and public.has_perm(auth.uid(), org_id, 'tour.manage'))
    or (org_id is null and (created_by = auth.uid() or user_id = auth.uid()))
  );

create policy tours_update_owner_or_org on public.tours
  for update to authenticated
  using (
    (org_id is not null and public.has_perm(auth.uid(), org_id, 'tour.manage'))
    or (org_id is null and public.is_tour_owner(id))
  )
  with check (
    (org_id is not null and public.has_perm(auth.uid(), org_id, 'tour.manage'))
    or (org_id is null and public.is_tour_owner(id))
  );

create policy tours_delete_owner_or_org on public.tours
  for delete to authenticated
  using (
    (org_id is not null and public.has_perm(auth.uid(), org_id, 'tour.delete'))
    or (org_id is null and public.is_tour_owner(id))
  );

drop policy if exists tour_events_insert on public.tour_events;
drop policy if exists tour_events_update on public.tour_events;
drop policy if exists tour_events_delete on public.tour_events;

create policy tour_events_insert on public.tour_events
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.tours t
      join public.events_v2 e on e.id = tour_events.event_id
      where t.id = tour_events.tour_id
        and t.org_id is not null
        and t.org_id = e.org_id
        and (
          public.has_perm(auth.uid(), t.org_id, 'routing.manage')
          or public.has_perm(auth.uid(), t.org_id, 'tour.manage')
        )
    )
    or public.is_tour_owner(tour_id)
  );

create policy tour_events_update on public.tour_events
  for update to authenticated
  using (
    exists (
      select 1 from public.tours t
      where t.id = tour_events.tour_id
        and t.org_id is not null
        and (
          public.has_perm(auth.uid(), t.org_id, 'routing.manage')
          or public.has_perm(auth.uid(), t.org_id, 'tour.manage')
        )
    )
    or public.is_tour_owner(tour_id)
  )
  with check (
    exists (
      select 1
      from public.tours t
      join public.events_v2 e on e.id = tour_events.event_id
      where t.id = tour_events.tour_id
        and t.org_id is not null
        and t.org_id = e.org_id
        and (
          public.has_perm(auth.uid(), t.org_id, 'routing.manage')
          or public.has_perm(auth.uid(), t.org_id, 'tour.manage')
        )
    )
    or public.is_tour_owner(tour_id)
  );

create policy tour_events_delete on public.tour_events
  for delete to authenticated
  using (
    exists (
      select 1 from public.tours t
      where t.id = tour_events.tour_id
        and t.org_id is not null
        and (
          public.has_perm(auth.uid(), t.org_id, 'routing.manage')
          or public.has_perm(auth.uid(), t.org_id, 'tour.manage')
        )
    )
    or public.is_tour_owner(tour_id)
  );;
