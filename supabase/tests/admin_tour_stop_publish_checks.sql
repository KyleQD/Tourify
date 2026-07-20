-- Canonical tour stop and publish checks.
-- Run after migrations in a preview environment. Every query should return
-- zero rows.

-- A tour may only link events from the same organization.
select
  te.tour_id,
  te.event_id,
  t.org_id as tour_org_id,
  e.org_id as event_org_id
from public.tour_events te
join public.tours t on t.id = te.tour_id
join public.events_v2 e on e.id = te.event_id
where t.org_id is distinct from e.org_id;

-- Canonical route positions should be unique and contiguous after a builder
-- reconciliation.
with ordered as (
  select
    te.tour_id,
    te.event_id,
    te.ordinal,
    row_number() over (
      partition by te.tour_id
      order by te.ordinal nulls last, te.created_at, te.event_id
    ) - 1 as expected_ordinal
  from public.tour_events te
)
select *
from ordered
where ordinal is null or ordinal <> expected_ordinal;

-- Active tours must satisfy the database publish invariants.
select t.id, t.name, t.start_date, t.end_date
from public.tours t
where t.status = 'active'
  and (
    btrim(coalesce(t.name, '')) = ''
    or t.start_date is null
    or t.end_date is null
    or t.end_date < t.start_date
    or not exists (
      select 1 from public.tour_events te where te.tour_id = t.id
    )
  );

select t.id as tour_id, e.id as event_id
from public.tours t
join public.tour_events te on te.tour_id = t.id
join public.events_v2 e on e.id = te.event_id
where t.status = 'active'
  and (
    e.org_id is distinct from t.org_id
    or btrim(coalesce(e.title, '')) = ''
    or e.start_at is null
    or (e.venue_id is null and btrim(coalesce(e.settings->>'venue_label', '')) = '')
  );

-- Each active tour/event pair should have one idempotent Work Mode publication.
select te.tour_id, te.event_id
from public.tour_events te
join public.tours t on t.id = te.tour_id and t.status = 'active'
left join public.work_mode_publications publication
  on publication.idempotency_key =
    'tour_publish:' || te.tour_id::text || ':' || te.event_id::text
 and publication.status = 'published'
where publication.id is null;

-- Anonymous clients may not execute either mutation command.
select 'anonymous_reconcile_access' as violation
where has_function_privilege(
  'anon',
  'public.reconcile_admin_tour_events(uuid, uuid, jsonb)',
  'execute'
);

select 'anonymous_publish_access' as violation
where has_function_privilege(
  'anon',
  'public.publish_admin_tour(uuid, uuid, uuid)',
  'execute'
);
