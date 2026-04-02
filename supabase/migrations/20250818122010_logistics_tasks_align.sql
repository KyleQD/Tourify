-- Align logistics_tasks FKs and add notifications on assignment
create extension if not exists pgcrypto;

-- If legacy references exist, adjust to events_v2 and optional tours
do $$ begin
  if to_regclass('public.logistics_tasks') is not null then
    -- Ensure columns exist
    if not exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='logistics_tasks' and column_name='event_id'
    ) then
      alter table logistics_tasks add column event_id uuid;
    end if;
    if not exists (
      select 1 from information_schema.columns where table_schema='public' and table_name='logistics_tasks' and column_name='tour_id'
    ) then
      alter table logistics_tasks add column tour_id uuid;
    end if;

    -- Drop old FKs if pointing to legacy tables
    -- Note: constraint names unknown; try conditional drops
    begin
      alter table logistics_tasks drop constraint if exists logistics_tasks_event_id_fkey;
    exception when others then null; end;
    begin
      alter table logistics_tasks drop constraint if exists logistics_tasks_tour_id_fkey;
    exception when others then null; end;

    -- Add current FKs
    alter table logistics_tasks
      add constraint logistics_tasks_event_id_fkey foreign key (event_id) references events_v2(id) on delete set null;
    alter table logistics_tasks
      add constraint logistics_tasks_tour_id_fkey foreign key (tour_id) references tours(id) on delete set null;
  end if;
end $$;

-- Trigger: notify assigned user when assignment changes
create or replace function notify_task_assignment() returns trigger language plpgsql as $$
begin
  if new.assigned_to_user_id is not null and (old.assigned_to_user_id is distinct from new.assigned_to_user_id) then
    insert into notifications(user_id, type, title, content, metadata)
    values (new.assigned_to_user_id, 'task_assigned', coalesce(new.title,'Task assigned'), coalesce(new.description,''), jsonb_build_object('task_id', new.id, 'event_id', new.event_id));
  end if;
  return new;
end$$;

drop trigger if exists trg_logistics_task_assignment on logistics_tasks;
create trigger trg_logistics_task_assignment
after insert or update of assigned_to_user_id on logistics_tasks
for each row execute function notify_task_assignment();


