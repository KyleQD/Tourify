-- Reconcile the legacy attendance table shape before the unified guest-list
-- migration adds its polymorphic event-table constraint and upsert path.
-- Existing rows are legacy `events` attendance and retain their meaning.

set client_min_messages = warning;

alter table public.event_attendance
  add column if not exists event_table text not null default 'events';

do $$
declare
  v_constraint text;
begin
  -- The legacy table has UNIQUE (event_id, user_id). Replace it with the
  -- polymorphic key only after the compatibility column has a deterministic
  -- value for every existing row.
  for v_constraint in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.event_attendance'::regclass
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) = 'UNIQUE (event_id, user_id)'
  loop
    execute format('alter table public.event_attendance drop constraint %I', v_constraint);
  end loop;

  if not exists (
    select 1
    from pg_constraint c
    where c.conrelid = 'public.event_attendance'::regclass
      and c.conname = 'event_attendance_event_id_user_id_event_table_key'
  ) then
    alter table public.event_attendance
      add constraint event_attendance_event_id_user_id_event_table_key
      unique (event_id, user_id, event_table);
  end if;
end $$;

alter table public.event_attendance
  drop constraint if exists event_attendance_event_table_check;
alter table public.event_attendance
  add constraint event_attendance_event_table_check
  check (event_table in ('artist_events', 'events', 'events_v2')) not valid;
alter table public.event_attendance
  validate constraint event_attendance_event_table_check;

create index if not exists idx_event_attendance_event_table
  on public.event_attendance(event_id, event_table);
