-- PHASE 4 (SEC / ADM-M-012): tour_events cross-org attach fix.
--
-- 20260710032640 allowed `is_tour_owner(tour_id)` ALONE to insert/update/
-- delete tour_events rows. A solo tour owner could therefore attach ANY other
-- org's event id via a direct PostgREST call — the app layer blocks it, the
-- database did not. Every branch of every policy now additionally requires
-- that the linked event belongs to the SAME organization as the tour
-- (`t.org_id = e.org_id`), closing the bypass while preserving both the
-- owner path and the org-member `event.manage` path.
--
-- Additive + reversible: drop named policies and re-issue prior definitions.

set client_min_messages = warning;

drop policy if exists tour_events_insert on public.tour_events;
create policy tour_events_insert
on public.tour_events
for insert
to authenticated
with check (
  (
    public.is_tour_owner(tour_id)
    and exists (
      select 1
      from public.tours t
      join public.events_v2 e on e.id = event_id
      where t.id = tour_id
        and t.org_id is not null
        and t.org_id = e.org_id
    )
  )
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

drop policy if exists tour_events_update on public.tour_events;
create policy tour_events_update
on public.tour_events
for update
to authenticated
using (
  (
    public.is_tour_owner(tour_id)
    and exists (
      select 1
      from public.tours t
      join public.events_v2 e on e.id = event_id
      where t.id = tour_id
        and t.org_id is not null
        and t.org_id = e.org_id
    )
  )
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
  (
    public.is_tour_owner(tour_id)
    and exists (
      select 1
      from public.tours t
      join public.events_v2 e on e.id = event_id
      where t.id = tour_id
        and t.org_id is not null
        and t.org_id = e.org_id
    )
  )
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

drop policy if exists tour_events_delete on public.tour_events;
create policy tour_events_delete
on public.tour_events
for delete
to authenticated
using (
  (
    public.is_tour_owner(tour_id)
    and exists (
      select 1
      from public.tours t
      join public.events_v2 e on e.id = event_id
      where t.id = tour_id
        and t.org_id is not null
        and t.org_id = e.org_id
    )
  )
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

-- ============================================================================
-- Ghost-stop hygiene note (P2-10 companion): deleting an event leaves
-- tour_stops.event_id NULL with status='active' in normalized-plan
-- environments and those ghosts keep blocking readiness. Cleanup is enforced
-- at the application layer (lib/admin/tour-stop-hygiene.ts, executed through
-- executeServiceRoleJob so org/target revalidation applies) rather than as a
-- raw-SQL destructive routine here.
-- ============================================================================

-- ROLLBACK NOTE
-- ------------
-- Re-issue 20260710032640 policy bodies (restores the owner-alone bypass —
-- emergency only).
