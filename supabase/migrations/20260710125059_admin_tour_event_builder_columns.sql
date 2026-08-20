alter table if exists public.tour_events
  add column if not exists is_primary boolean not null default false,
  add column if not exists leg_name text,
  add column if not exists market text,
  add column if not exists advance_status text not null default 'not_started',
  add column if not exists routing_notes text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if to_regclass('public.tour_events') is not null
    and not exists (
      select 1
      from pg_constraint
      where conname = 'tour_events_advance_status_check'
        and conrelid = 'public.tour_events'::regclass
    ) then
    alter table public.tour_events
      add constraint tour_events_advance_status_check
      check (advance_status in ('not_started', 'in_progress', 'ready', 'blocked', 'settled'))
      not valid;
  end if;
end;
$$;

create index if not exists idx_tour_events_event_id on public.tour_events(event_id);
create index if not exists idx_tour_events_tour_ordinal on public.tour_events(tour_id, ordinal);
create index if not exists idx_tour_events_primary on public.tour_events(event_id, is_primary);

alter table if exists public.tours
  add column if not exists settings jsonb not null default '{}',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists revenue numeric,
  add column if not exists expenses numeric;

create index if not exists idx_tours_org_status_dates
  on public.tours(org_id, status, start_date, end_date);;
