-- =============================================================================
-- LOGISTICS TASKS CORE
-- =============================================================================

-- Extension prerequisites
create extension if not exists "uuid-ossp";

-- Core table: logistics_tasks
create table if not exists logistics_tasks (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade,
  tour_id uuid references tours(id) on delete cascade,
  type text not null check (type in ('transportation','equipment','lodging','catering','communication','backline','rental')),
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','confirmed','in_progress','completed','cancelled','needs_attention')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  assigned_to_user_id uuid references auth.users(id) on delete set null,
  due_date date,
  budget numeric,
  actual_cost numeric,
  notes text,
  tags text[],
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_logistics_tasks_event on logistics_tasks(event_id);
create index if not exists idx_logistics_tasks_tour on logistics_tasks(tour_id);
create index if not exists idx_logistics_tasks_type on logistics_tasks(type);
create index if not exists idx_logistics_tasks_status on logistics_tasks(status);
create index if not exists idx_logistics_tasks_assignee on logistics_tasks(assigned_to_user_id);

-- Link table: task ↔ equipment asset
create table if not exists logistics_task_equipment (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references logistics_tasks(id) on delete cascade,
  equipment_asset_id uuid not null references equipment_assets(id) on delete cascade,
  start_time timestamptz,
  end_time timestamptz,
  quantity integer not null default 1,
  created_at timestamptz default now(),
  unique(task_id, equipment_asset_id)
);

create index if not exists idx_logistics_task_equipment_task on logistics_task_equipment(task_id);
create index if not exists idx_logistics_task_equipment_asset on logistics_task_equipment(equipment_asset_id);

-- Updated-at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_logistics_tasks_updated_at on logistics_tasks;
create trigger trg_logistics_tasks_updated_at
before update on logistics_tasks
for each row execute function set_updated_at();

-- Enable RLS
alter table logistics_tasks enable row level security;
alter table logistics_task_equipment enable row level security;

-- NOTE: Initial permissive policies to unblock development.
-- TODO: tighten with entity manager based scoping.

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'log_tasks_read_all_auth'
  ) then
    create policy "log_tasks_read_all_auth" on logistics_tasks
      for select using (auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'log_tasks_write_creator_or_admin'
  ) then
    create policy "log_tasks_write_creator_or_admin" on logistics_tasks
      for all using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'log_task_equipment_read_auth'
  ) then
    create policy "log_task_equipment_read_auth" on logistics_task_equipment
      for select using (auth.role() = 'authenticated');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where policyname = 'log_task_equipment_write_auth'
  ) then
    create policy "log_task_equipment_write_auth" on logistics_task_equipment
      for all using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated');
  end if;
end $$;


