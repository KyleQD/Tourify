set client_min_messages = warning;

-- Safe, idempotent fixes for tasks/schedule schema mismatches
-- Adds missing columns if prior tables existed with different shapes
-- Ensures dependent indexes/triggers exist without errors

-- Ensure required columns on tasks
alter table if exists tasks
  add column if not exists due_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Ensure required columns on schedule_items
alter table if exists schedule_items
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz;

-- Backfill newly added timestamps if table already had rows and columns are null
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='schedule_items' and column_name='start_at') then
    update schedule_items set start_at = coalesce(start_at, now()) where start_at is null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='schedule_items' and column_name='end_at') then
    update schedule_items set end_at = coalesce(end_at, start_at + interval '1 hour') where end_at is null;
  end if;
end $$;

-- Recreate index on schedule_items if missing (depends on start_at)
do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname='public' and indexname='idx_sched_items_schedule_time'
  ) then
    create index idx_sched_items_schedule_time on schedule_items(schedule_id, start_at);
  end if;
end $$;

-- Ensure updated_at trigger function exists (idempotent)
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- Recreate tasks updated_at trigger if missing
drop trigger if exists trg_tasks_touch on tasks;
create trigger trg_tasks_touch before update on tasks for each row execute function touch_updated_at();


