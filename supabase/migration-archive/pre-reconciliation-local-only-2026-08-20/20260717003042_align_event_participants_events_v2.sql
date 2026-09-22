set client_min_messages = warning;

do $$
begin
  if to_regclass('public.event_participants') is not null
     and to_regclass('public.events_v2') is not null then
    alter table public.event_participants
      drop constraint if exists event_participants_event_id_fkey;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'event_participants_event_id_fkey'
        and conrelid = 'public.event_participants'::regclass
    ) then
      alter table public.event_participants
        add constraint event_participants_event_id_fkey
        foreign key (event_id)
        references public.events_v2(id)
        on delete cascade
        not valid;
    end if;
  end if;
end $$;
