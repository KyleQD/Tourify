set client_min_messages = warning;

-- Persist Operations Logistics context on team communications so the Logistics
-- tab can filter messages by event, tour, or site map.
alter table if exists public.team_communications
  add column if not exists event_id uuid references public.events_v2(id) on delete set null,
  add column if not exists tour_id uuid references public.tours(id) on delete set null,
  add column if not exists site_map_id uuid references public.site_maps(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_team_comms_event_time
  on public.team_communications(event_id, sent_at desc)
  where event_id is not null;

create index if not exists idx_team_comms_tour_time
  on public.team_communications(tour_id, sent_at desc)
  where tour_id is not null;

create index if not exists idx_team_comms_site_map_time
  on public.team_communications(site_map_id, sent_at desc)
  where site_map_id is not null;
