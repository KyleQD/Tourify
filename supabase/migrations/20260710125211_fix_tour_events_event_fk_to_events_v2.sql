-- Align tour_events.event_id with canonical events_v2.
-- Live Demo DB still had the legacy FK pointing at public.events, which blocked
-- AdminTourEventOperationsService.createEvent / createTour assignment fanout.

alter table public.tour_events drop constraint if exists tour_events_event_id_fkey;

alter table public.tour_events
  add constraint tour_events_event_id_fkey
  foreign key (event_id) references public.events_v2(id) on delete cascade;
