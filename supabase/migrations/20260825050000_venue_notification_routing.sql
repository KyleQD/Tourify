-- =============================================================================
-- VEN-254 / VEN-291 — Venue workflow subscription & routing model
-- (additive, idempotent)
--
-- Venue OPERATIONAL routing is modeled separately from human delivery
-- preferences (notification_preferences stays authoritative for channels and
-- quiet hours — VEN-294). A subscription says WHICH role/permission on the
-- venue receives WHICH workflow class and at what minimum priority.
-- =============================================================================

create table if not exists public.venue_workflow_subscriptions (
  id             uuid primary key default gen_random_uuid(),
  venue_id       uuid not null references public.venue_profiles(id) on delete cascade,
  -- Workflow classes shipped with the routing engine (VEN-254):
  workflow       text not null check (workflow in (
                   'booking_request', 'booking_transition', 'hiring_stage',
                   'shift_published', 'checkin_alert', 'document_shared'
                 )),
  -- Which canonical venue permission receives this workflow's notifications.
  target_permission text not null,
  min_priority   text not null default 'normal'
                 check (min_priority in ('low', 'normal', 'high', 'urgent')),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (venue_id, workflow)
);

create index if not exists idx_venue_workflow_subs_venue
  on public.venue_workflow_subscriptions (venue_id)
  where is_active;

alter table public.venue_workflow_subscriptions enable row level security;

drop policy if exists venue_workflow_subs_owner_all on public.venue_workflow_subscriptions;
create policy venue_workflow_subs_owner_all
  on public.venue_workflow_subscriptions
  for all
  using (
    exists (
      select 1 from public.venue_profiles vp
      where vp.id = venue_id
        and (vp.user_id = auth.uid() or vp.main_profile_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.venue_profiles vp
      where vp.id = venue_id
        and (vp.user_id = auth.uid() or vp.main_profile_id = auth.uid())
    )
  );

comment on table public.venue_workflow_subscriptions is
  'VEN-254: venue-level workflow routing. Role-targeted fanout resolves humans through canonical RBAC at send time; human channel delivery still honors notification_preferences.';

-- ── Sensible defaults for every existing venue (idempotent backfill) ─────────
insert into public.venue_workflow_subscriptions (venue_id, workflow, target_permission)
select vp.id, v.workflow, v.target_permission
from public.venue_profiles vp
cross join (values
  ('booking_request',    'manage_bookings'),
  ('booking_transition', 'manage_bookings'),
  ('hiring_stage',       'hiring_manage'),
  ('shift_published',    'scheduling_manage'),
  ('checkin_alert',      'door_check_in'),
  ('document_shared',    'manage_documents')
) as v(workflow, target_permission)
where not exists (
  select 1 from public.venue_workflow_subscriptions s
  where s.venue_id = vp.id and s.workflow = v.workflow
);
