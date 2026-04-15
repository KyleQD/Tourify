set client_min_messages = warning;

-- Unified workflow threads for event/tour collaboration

create table if not exists workflow_threads (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null check (scope_type in ('event', 'tour')),
  scope_id uuid not null,
  org_id uuid,
  title text not null default 'Workflow thread',
  description text,
  status text not null default 'active' check (status in ('active', 'archived', 'closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope_type, scope_id)
);

create table if not exists workflow_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references workflow_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  permissions text[] not null default '{}',
  status text not null default 'active' check (status in ('invited', 'active', 'removed')),
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz not null default now(),
  unique (thread_id, user_id)
);

create table if not exists workflow_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references workflow_threads(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  message_type text not null default 'text' check (message_type in ('text', 'system', 'task_update', 'approval', 'file')),
  body text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references workflow_threads(id) on delete cascade,
  title text not null,
  description text,
  assignee_id uuid references auth.users(id) on delete set null,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done', 'blocked')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  due_at timestamptz,
  dependency_task_ids uuid[] not null default '{}',
  labels text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workflow_events_audit (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references workflow_threads(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_workflow_threads_scope on workflow_threads(scope_type, scope_id);
create index if not exists idx_workflow_messages_thread_created on workflow_messages(thread_id, created_at desc);
create index if not exists idx_workflow_tasks_assignee_status_due on workflow_tasks(assignee_id, status, due_at);
create index if not exists idx_workflow_participants_user on workflow_participants(user_id, status);
create index if not exists idx_workflow_audit_thread_created on workflow_events_audit(thread_id, created_at desc);

drop trigger if exists trg_workflow_threads_touch on workflow_threads;
create trigger trg_workflow_threads_touch before update on workflow_threads
for each row execute function touch_updated_at();

drop trigger if exists trg_workflow_tasks_touch on workflow_tasks;
create trigger trg_workflow_tasks_touch before update on workflow_tasks
for each row execute function touch_updated_at();

alter table workflow_threads enable row level security;
alter table workflow_participants enable row level security;
alter table workflow_messages enable row level security;
alter table workflow_tasks enable row level security;
alter table workflow_events_audit enable row level security;

drop policy if exists workflow_threads_read on workflow_threads;
create policy workflow_threads_read on workflow_threads
for select using (auth.role() = 'authenticated');

drop policy if exists workflow_threads_write on workflow_threads;
create policy workflow_threads_write on workflow_threads
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists workflow_participants_read on workflow_participants;
create policy workflow_participants_read on workflow_participants
for select using (auth.role() = 'authenticated');

drop policy if exists workflow_participants_write on workflow_participants;
create policy workflow_participants_write on workflow_participants
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists workflow_messages_read on workflow_messages;
create policy workflow_messages_read on workflow_messages
for select using (auth.role() = 'authenticated');

drop policy if exists workflow_messages_write on workflow_messages;
create policy workflow_messages_write on workflow_messages
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists workflow_tasks_read on workflow_tasks;
create policy workflow_tasks_read on workflow_tasks
for select using (auth.role() = 'authenticated');

drop policy if exists workflow_tasks_write on workflow_tasks;
create policy workflow_tasks_write on workflow_tasks
for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists workflow_audit_read on workflow_events_audit;
create policy workflow_audit_read on workflow_events_audit
for select using (auth.role() = 'authenticated');

drop policy if exists workflow_audit_write on workflow_events_audit;
create policy workflow_audit_write on workflow_events_audit
for insert with check (auth.role() = 'authenticated');
