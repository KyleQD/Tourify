set client_min_messages = warning;

alter table if exists public.map_task_assignments
  add column if not exists assigned_team_id uuid,
  add column if not exists assigned_role text,
  add column if not exists coordinate jsonb,
  add column if not exists checklist jsonb not null default '[]'::jsonb,
  add column if not exists blocker_reason text;

create index if not exists idx_map_task_assignments_team_id
  on public.map_task_assignments(assigned_team_id);

create index if not exists idx_map_task_assignments_role
  on public.map_task_assignments(assigned_role);

create index if not exists idx_map_task_assignments_coordinate
  on public.map_task_assignments using gin(coordinate);
