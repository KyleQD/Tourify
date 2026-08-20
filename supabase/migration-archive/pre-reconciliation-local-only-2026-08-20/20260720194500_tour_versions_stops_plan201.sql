-- PLAN-201 — Normalized tour_versions + tour_stops with plan conflict quarantine.
-- Expand-only. Never reset the database. Never invent org_id on backfill.

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- tour_versions
-- ---------------------------------------------------------------------------
create table if not exists public.tour_versions (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  version_number integer not null check (version_number >= 1),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  name text,
  description text,
  route_notes text,
  markets text[] not null default '{}'::text[],
  settings_snapshot jsonb not null default '{}'::jsonb,
  source text not null default 'plan_write'
    check (source in (
      'plan_write',
      'backfill_tour_events',
      'backfill_route_json',
      'published_snapshot'
    )),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tour_versions_tour_number unique (tour_id, version_number)
);

create index if not exists idx_tour_versions_org_tour
  on public.tour_versions (org_id, tour_id, version_number desc);

create index if not exists idx_tour_versions_status
  on public.tour_versions (org_id, status)
  where status = 'draft';

-- ---------------------------------------------------------------------------
-- tour_stops
-- ---------------------------------------------------------------------------
create table if not exists public.tour_stops (
  id uuid primary key default gen_random_uuid(),
  tour_version_id uuid not null references public.tour_versions (id) on delete cascade,
  tour_id uuid not null references public.tours (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  ordinal integer not null check (ordinal >= 0),
  stop_type text not null default 'show'
    check (stop_type in (
      'show', 'rehearsal', 'promo', 'festival', 'travel', 'rest', 'load', 'other'
    )),
  event_id uuid references public.events_v2 (id) on delete set null,
  tour_event_id uuid references public.tour_events (id) on delete set null,
  client_key text,
  name text not null,
  venue_label text,
  market text,
  leg_name text,
  local_date date,
  local_time text,
  timezone text,
  capacity integer,
  advance_status text not null default 'not_started',
  venue_id uuid,
  notes text,
  status text not null default 'active'
    check (status in ('active', 'detached', 'archived')),
  source text not null default 'plan_write'
    check (source in ('tour_events', 'route_json', 'merged', 'plan_write')),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tour_stops_version_ordinal unique (tour_version_id, ordinal)
);

create unique index if not exists idx_tour_stops_version_event
  on public.tour_stops (tour_version_id, event_id)
  where event_id is not null and status = 'active';

create index if not exists idx_tour_stops_tour_ordinal
  on public.tour_stops (tour_id, ordinal);

create index if not exists idx_tour_stops_org_version
  on public.tour_stops (org_id, tour_version_id);

-- ---------------------------------------------------------------------------
-- Pointer on tours (additive)
-- ---------------------------------------------------------------------------
alter table public.tours
  add column if not exists current_draft_version_id uuid references public.tour_versions (id) on delete set null;

create index if not exists idx_tours_current_draft_version
  on public.tours (current_draft_version_id)
  where current_draft_version_id is not null;

-- ---------------------------------------------------------------------------
-- tour_plan_quarantine — plan conflicts (not SEC-105 tenant-key quarantine)
-- ---------------------------------------------------------------------------
create table if not exists public.tour_plan_quarantine (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid references public.tours (id) on delete cascade,
  org_id uuid references public.organizations (id) on delete set null,
  conflict_type text not null
    check (conflict_type in (
      'ordinal_mismatch',
      'route_only_orphan',
      'duplicate_event',
      'missing_event',
      'unresolvable_org',
      'duplicate_ordinal'
    )),
  reason text not null,
  source_ref jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  notes text
);

create index if not exists idx_tour_plan_quarantine_open
  on public.tour_plan_quarantine (org_id, detected_at desc)
  where resolved_at is null;

create index if not exists idx_tour_plan_quarantine_tour
  on public.tour_plan_quarantine (tour_id, detected_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tour_versions enable row level security;
alter table public.tour_versions force row level security;
alter table public.tour_stops enable row level security;
alter table public.tour_stops force row level security;
alter table public.tour_plan_quarantine enable row level security;
alter table public.tour_plan_quarantine force row level security;

drop policy if exists tour_versions_select on public.tour_versions;
create policy tour_versions_select on public.tour_versions
  for select to authenticated
  using (public.is_org_member(auth.uid(), org_id));

drop policy if exists tour_versions_write on public.tour_versions;
create policy tour_versions_write on public.tour_versions
  for all to authenticated
  using (public.is_org_member(auth.uid(), org_id))
  with check (public.is_org_member(auth.uid(), org_id));

drop policy if exists tour_stops_select on public.tour_stops;
create policy tour_stops_select on public.tour_stops
  for select to authenticated
  using (public.is_org_member(auth.uid(), org_id));

drop policy if exists tour_stops_write on public.tour_stops;
create policy tour_stops_write on public.tour_stops
  for all to authenticated
  using (public.is_org_member(auth.uid(), org_id))
  with check (public.is_org_member(auth.uid(), org_id));

-- Quarantine: org members may read open conflicts for review; writes via service role / members.
drop policy if exists tour_plan_quarantine_select on public.tour_plan_quarantine;
create policy tour_plan_quarantine_select on public.tour_plan_quarantine
  for select to authenticated
  using (
    org_id is not null
    and public.is_org_member(auth.uid(), org_id)
  );

drop policy if exists tour_plan_quarantine_write on public.tour_plan_quarantine;
create policy tour_plan_quarantine_write on public.tour_plan_quarantine
  for all to authenticated
  using (
    org_id is not null
    and public.is_org_member(auth.uid(), org_id)
  )
  with check (
    org_id is not null
    and public.is_org_member(auth.uid(), org_id)
  );

comment on table public.tour_versions is
  'PLAN-201 versioned tour plan drafts/snapshots; draft head aligns with tours.plan_version.';
comment on table public.tour_stops is
  'PLAN-201 normalized stops for a tour_version; tour_events remains compatibility bridge.';
comment on table public.tour_plan_quarantine is
  'PLAN-201 unresolved route/tour_events conflicts for human review; never invent org_id.';

-- ---------------------------------------------------------------------------
-- Verification helper view
-- ---------------------------------------------------------------------------
create or replace view public.tour_plan_normalize_stats_v
with (security_invoker = true)
as
select
  t.org_id,
  count(distinct t.id) as tour_count,
  count(distinct v.id) as version_count,
  count(distinct s.id) as stop_count,
  count(distinct q.id) filter (where q.resolved_at is null) as open_quarantine_count
from public.tours t
left join public.tour_versions v on v.tour_id = t.id
left join public.tour_stops s on s.tour_id = t.id and s.status = 'active'
left join public.tour_plan_quarantine q on q.tour_id = t.id
where t.org_id is not null
group by t.org_id;

comment on view public.tour_plan_normalize_stats_v is
  'PLAN-201 verification: per-org tour/version/stop/open-quarantine counts.';
