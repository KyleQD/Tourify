-- EVENT-104: optimistic event version for concurrent + tour-plan conflict handling (expand-only)

alter table public.events_v2
  add column if not exists event_version integer not null default 1;

comment on column public.events_v2.event_version is
  'EVENT-104 optimistic concurrency token; bumped on event updates and tour-plan stop touches.';

create index if not exists idx_events_v2_org_event_version
  on public.events_v2 (org_id, event_version);
