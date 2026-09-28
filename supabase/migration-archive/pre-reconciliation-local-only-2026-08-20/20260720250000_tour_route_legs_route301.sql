-- ROUTE-301 — Normalized route legs between ordered tour stops.
-- Expand-only. Never reset the database.
-- Legs regenerate deterministically from stop ordering but preserve
-- approved overrides and linked bookings per constraint.

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- tour_route_legs
-- ---------------------------------------------------------------------------
-- One row per consecutive stop pair in a tour_version.
-- from_stop/to_stop are FK-constrained → cascade delete prevents orphans.
-- Ordinal pair (tour_version_id, from_ordinal, to_ordinal) is unique.
create table if not exists public.tour_route_legs (
  id uuid primary key default gen_random_uuid(),
  tour_version_id uuid not null references public.tour_versions (id) on delete cascade,
  tour_id         uuid not null references public.tours (id) on delete cascade,
  org_id          uuid not null references public.organizations (id) on delete cascade,

  -- Stop references — cascade delete on stop removal prevents orphan legs.
  from_stop_id    uuid not null references public.tour_stops (id) on delete cascade,
  to_stop_id      uuid not null references public.tour_stops (id) on delete cascade,

  -- Ordinal pair mirrors the stop ordinals for deterministic ordering.
  from_ordinal    integer not null check (from_ordinal >= 0),
  to_ordinal      integer not null check (to_ordinal > from_ordinal),

  -- Provider-calculated or manually entered distance/duration.
  transport_mode  text not null default 'drive'
    check (transport_mode in ('drive', 'fly', 'rail', 'ferry', 'bus', 'walk', 'other')),

  -- Distance in kilometres (nullable: may not be computed yet).
  distance_km     numeric(10, 3) check (distance_km >= 0),
  -- Total estimated travel duration in minutes.
  duration_minutes integer check (duration_minutes >= 0),
  -- Buffer minutes appended to duration (load-in, customs, etc.)
  buffer_minutes  integer not null default 0 check (buffer_minutes >= 0),

  -- Provider source for calculation (null = manual or not yet computed).
  provider        text,
  provider_version text,
  calculated_at   timestamptz,

  -- Manual override: if present, manual values take precedence over provider.
  -- override_approved_by must be set when override is in effect.
  override_distance_km     numeric(10, 3) check (override_distance_km >= 0),
  override_duration_minutes integer check (override_duration_minutes >= 0),
  override_reason  text,
  override_approved_by uuid references auth.users (id) on delete set null,
  override_approved_at timestamptz,

  -- Linked transport booking (travel module bridge — ROUTE-309).
  transport_booking_id uuid,

  -- Conflict/risk flags surfaced by the route constraint engine (ROUTE-304).
  has_conflict     boolean not null default false,
  conflict_codes   text[] not null default '{}'::text[],

  -- Generation source: 'auto' = regenerated from stop order; 'manual' = user-authored.
  source           text not null default 'auto'
    check (source in ('auto', 'manual')),

  -- Immutable generation stamp: set once on auto-create, not updated on regeneration.
  generated_at    timestamptz not null default now(),

  created_by      uuid references auth.users (id) on delete set null,
  updated_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- One leg per ordered stop pair per version.
  constraint tour_route_legs_version_pair unique (tour_version_id, from_stop_id, to_stop_id),
  -- Prevent inverted or same-stop legs.
  constraint tour_route_legs_ordinals_forward check (to_ordinal > from_ordinal)
);

-- Efficient lookup by version (primary access pattern for builders/planners).
create index if not exists idx_tour_route_legs_version_ordinal
  on public.tour_route_legs (tour_version_id, from_ordinal, to_ordinal);

-- Org-scoped timeline queries.
create index if not exists idx_tour_route_legs_org_tour
  on public.tour_route_legs (org_id, tour_id, from_ordinal);

-- Conflict flag for constraint engine queries.
create index if not exists idx_tour_route_legs_conflicts
  on public.tour_route_legs (tour_version_id, has_conflict)
  where has_conflict = true;

-- Override approval audit index.
create index if not exists idx_tour_route_legs_override
  on public.tour_route_legs (tour_version_id, override_approved_by)
  where override_approved_by is not null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.tour_route_legs enable row level security;
alter table public.tour_route_legs force row level security;

drop policy if exists tour_route_legs_select on public.tour_route_legs;
create policy tour_route_legs_select on public.tour_route_legs
  for select to authenticated
  using (public.is_org_member(auth.uid(), org_id));

drop policy if exists tour_route_legs_write on public.tour_route_legs;
create policy tour_route_legs_write on public.tour_route_legs
  for all to authenticated
  using (public.is_org_member(auth.uid(), org_id))
  with check (public.is_org_member(auth.uid(), org_id));

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------
comment on table public.tour_route_legs is
  'ROUTE-301 normalized route legs between consecutive tour stops. '
  'Regenerate deterministically from stop order; approved overrides and '
  'linked bookings survive regeneration. Orphan legs prevented by FK cascade.';

comment on column public.tour_route_legs.from_stop_id is
  'FK to tour_stops(id) ON DELETE CASCADE — removing a stop removes attached legs.';
comment on column public.tour_route_legs.to_stop_id is
  'FK to tour_stops(id) ON DELETE CASCADE — removing a stop removes attached legs.';
comment on column public.tour_route_legs.override_approved_by is
  'Non-null = manual override in effect; distance/duration from override_* columns.';
comment on column public.tour_route_legs.transport_booking_id is
  'Optional foreign reference to a travel booking row (ROUTE-309 / travel module).';
