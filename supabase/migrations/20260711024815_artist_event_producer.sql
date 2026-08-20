set client_min_messages = warning;

alter table public.events
  add column if not exists ticket_url text,
  add column if not exists poster_url text,
  add column if not exists producer_settings jsonb default '{}'::jsonb,
  add column if not exists promoted_event_v2_id uuid,
  add column if not exists tickets_sold integer default 0,
  add column if not exists revenue numeric(12,2) default 0;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'events_v2'
  ) then
    begin
      alter table public.events
        drop constraint if exists events_promoted_event_v2_id_fkey;
      alter table public.events
        add constraint events_promoted_event_v2_id_fkey
        foreign key (promoted_event_v2_id) references public.events_v2(id) on delete set null;
    exception when others then
      null;
    end;
  end if;
end $$;

create index if not exists idx_events_artist_id_event_date
  on public.events (artist_id, event_date);

create index if not exists idx_events_promoted_event_v2_id
  on public.events (promoted_event_v2_id)
  where promoted_event_v2_id is not null;;
