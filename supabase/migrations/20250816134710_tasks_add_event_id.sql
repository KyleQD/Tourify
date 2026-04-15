set client_min_messages = warning;

-- Ensure tasks has event_id to derive org context reliably
do $$ begin
  if to_regclass('public.tasks') is not null then
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tasks' and column_name='event_id'
    ) then
      alter table tasks add column event_id uuid references events_v2(id) on delete cascade;
    end if;
  end if;
end $$;


