-- PLAN-202 / PLAN-205 — Stop editor fields + tour stop holds/options.
-- Expand-only. Never reset the database.

set client_min_messages = warning;

alter table public.tour_stops
  add column if not exists window_start text,
  add column if not exists window_end text,
  add column if not exists planning_status text not null default 'draft',
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tour_stops_planning_status_check'
  ) then
    alter table public.tour_stops
      add constraint tour_stops_planning_status_check
      check (planning_status in ('draft', 'confirmed', 'tentative', 'held', 'cancelled'));
  end if;
end $$;

create table if not exists public.tour_stop_holds (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  tour_id uuid not null references public.tours (id) on delete cascade,
  tour_stop_id uuid references public.tour_stops (id) on delete set null,
  venue_id uuid,
  venue_label text,
  proposed_date date,
  proposed_time text,
  timezone text,
  priority integer not null default 1 check (priority >= 1),
  option_number integer,
  status text not null default 'held'
    check (status in ('held', 'option', 'confirmed', 'released', 'expired', 'cancelled')),
  expires_at timestamptz,
  contact_name text,
  contact_email text,
  contact_phone text,
  competing_notes text,
  terms text,
  reminder_at timestamptz,
  confirmed_event_id uuid references public.events_v2 (id) on delete set null,
  confirmed_stop_id uuid references public.tour_stops (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tour_stop_holds_tour_status
  on public.tour_stop_holds (tour_id, status, expires_at);

create index if not exists idx_tour_stop_holds_org
  on public.tour_stop_holds (org_id, updated_at desc);

create table if not exists public.tour_stop_hold_history (
  id uuid primary key default gen_random_uuid(),
  hold_id uuid not null references public.tour_stop_holds (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  action text not null,
  from_status text,
  to_status text,
  note text,
  actor_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_tour_stop_hold_history_hold
  on public.tour_stop_hold_history (hold_id, created_at desc);

alter table public.tour_stop_holds enable row level security;
alter table public.tour_stop_holds force row level security;
alter table public.tour_stop_hold_history enable row level security;
alter table public.tour_stop_hold_history force row level security;

drop policy if exists tour_stop_holds_all on public.tour_stop_holds;
create policy tour_stop_holds_all on public.tour_stop_holds
  for all to authenticated
  using (public.is_org_member(auth.uid(), org_id))
  with check (public.is_org_member(auth.uid(), org_id));

drop policy if exists tour_stop_hold_history_all on public.tour_stop_hold_history;
create policy tour_stop_hold_history_all on public.tour_stop_hold_history
  for all to authenticated
  using (public.is_org_member(auth.uid(), org_id))
  with check (public.is_org_member(auth.uid(), org_id));

comment on table public.tour_stop_holds is
  'PLAN-205 venue holds/options for tour stops; confirmation converts via explicit command.';
