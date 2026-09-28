set client_min_messages = warning;

alter table if exists public.map_task_assignments
  add column if not exists title text,
  add column if not exists due_date timestamptz,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists event_task_id uuid references public.tasks(id) on delete set null;

alter table if exists public.map_task_assignments
  alter column element_id drop not null;

alter table if exists public.map_task_assignments
  alter column element_type set default 'element';

update public.map_task_assignments
set title = coalesce(title, task_type, 'Site Map Task')
where title is null;

create index if not exists idx_map_task_assignments_event_task_id
  on public.map_task_assignments(event_task_id);

create index if not exists idx_map_task_assignments_due_date
  on public.map_task_assignments(due_date);
