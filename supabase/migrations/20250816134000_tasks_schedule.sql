set client_min_messages = warning;

-- Tasks and Schedule for Event Ops
create extension if not exists pgcrypto;

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  event_id uuid not null references events_v2(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  status text not null check (status in ('todo','doing','done','blocked')) default 'todo',
  priority text check (priority in ('low','medium','high','critical')) default 'medium',
  labels text[] default '{}',
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events_v2(id) on delete cascade,
  date date not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists schedule_items (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  title text not null,
  location text,
  notes text,
  assigned_to uuid[] default '{}'::uuid[]
);

-- Indexes
create index if not exists idx_tasks_event_due on tasks(event_id, due_at);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_sched_items_schedule_time on schedule_items(schedule_id, start_at);

-- RLS
alter table tasks enable row level security;
alter table schedules enable row level security;
alter table schedule_items enable row level security;

-- Policies: org members can read; manage requires event.manage
do $$ begin
  if to_regclass('public.tasks') is null then
    return;
  end if;

  execute 'drop policy if exists tasks_select on tasks';
  execute 'drop policy if exists tasks_insert on tasks';
  execute 'drop policy if exists tasks_update on tasks';

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='tasks' and column_name='org_id'
  ) then
    execute $rls$
      create policy tasks_select on tasks for select using (
        public.is_org_member(auth.uid(), org_id)
      )
    $rls$;
    execute $rls$
      create policy tasks_insert on tasks for insert with check (
        public.has_perm(auth.uid(), org_id, 'event.manage')
      )
    $rls$;
    execute $rls$
      create policy tasks_update on tasks for update using (
        public.has_perm(auth.uid(), org_id, 'event.manage')
      )
    $rls$;

  elsif exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='tasks' and column_name='event_id'
  ) then
    execute $rls$
      create policy tasks_select on tasks for select using (
        public.is_org_member(
          auth.uid(),
          (select e.org_id from events_v2 e where e.id = tasks.event_id limit 1)
        )
      )
    $rls$;
    execute $rls$
      create policy tasks_insert on tasks for insert with check (
        public.has_perm(
          auth.uid(),
          (select e.org_id from events_v2 e where e.id = event_id limit 1),
          'event.manage'
        )
      )
    $rls$;
    execute $rls$
      create policy tasks_update on tasks for update using (
        public.has_perm(
          auth.uid(),
          (select e.org_id from events_v2 e where e.id = tasks.event_id limit 1),
          'event.manage'
        )
      )
    $rls$;

  elsif exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='tasks' and column_name='tour_id'
  ) then
    if to_regclass('public.events_v2') is not null then
      execute $rls$
        create policy tasks_select on tasks for select using (
          public.is_org_member(
            auth.uid(),
            (select e.org_id from events_v2 e where e.id = tasks.tour_id limit 1)
          )
        )
      $rls$;
      execute $rls$
        create policy tasks_insert on tasks for insert with check (
          public.has_perm(
            auth.uid(),
            (select e.org_id from events_v2 e where e.id = tour_id limit 1),
            'event.manage'
          )
        )
      $rls$;
      execute $rls$
        create policy tasks_update on tasks for update using (
          public.has_perm(
            auth.uid(),
            (select e.org_id from events_v2 e where e.id = tasks.tour_id limit 1),
            'event.manage'
          )
        )
      $rls$;
    else
      execute 'create policy tasks_select on tasks for select using (false)';
      execute 'create policy tasks_insert on tasks for insert with check (false)';
      execute 'create policy tasks_update on tasks for update using (false)';
    end if;

  else
    execute 'create policy tasks_select on tasks for select using (false)';
    execute 'create policy tasks_insert on tasks for insert with check (false)';
    execute 'create policy tasks_update on tasks for update using (false)';
  end if;
end $$;

drop policy if exists schedules_select on schedules;
create policy schedules_select on schedules for select using (
  public.is_org_member(auth.uid(), (select org_id from events_v2 e where e.id = schedules.event_id))
);
drop policy if exists schedules_insert on schedules;
create policy schedules_insert on schedules for insert with check (
  public.has_perm(auth.uid(), (select org_id from events_v2 e where e.id = event_id), 'event.manage')
);

drop policy if exists scheditems_select on schedule_items;
create policy scheditems_select on schedule_items for select using (
  public.is_org_member(auth.uid(), (select org_id from events_v2 e join schedules s on s.id = schedule_items.schedule_id and e.id = s.event_id))
);
drop policy if exists scheditems_insert on schedule_items;
create policy scheditems_insert on schedule_items for insert with check (
  public.has_perm(auth.uid(), (select org_id from events_v2 e join schedules s on s.id = schedule_items.schedule_id and e.id = s.event_id), 'event.manage')
);

-- Triggers
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_tasks_touch on tasks;
create trigger trg_tasks_touch before update on tasks for each row execute function touch_updated_at();


