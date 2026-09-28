-- Align tour_events.event_id with canonical events_v2 (code + tours_core migration).
alter table public.tour_events drop constraint if exists tour_events_event_id_fkey;

alter table public.tour_events
  add constraint tour_events_event_id_fkey
  foreign key (event_id) references public.events_v2(id) on delete cascade;;
