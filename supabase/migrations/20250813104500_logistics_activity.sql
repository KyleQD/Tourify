-- =============================================================================
-- LOGISTICS ACTIVITY LOG
-- =============================================================================

create table if not exists logistics_activity (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references logistics_tasks(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null, -- created, updated, status_changed, equipment_attached, equipment_detached
  prev_status text,
  new_status text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_logistics_activity_task on logistics_activity(task_id);

alter table logistics_activity enable row level security;

drop policy if exists "log_act_read_linked_task" on logistics_activity;
drop policy if exists "log_act_insert_linked_task" on logistics_activity;

create policy "log_act_read_linked_task" on logistics_activity
  for select using (
    auth.role() = 'authenticated' and exists (
      select 1 from logistics_tasks t
      where t.id = logistics_activity.task_id and (
        t.created_by = auth.uid() or
        (t.event_id is not null and has_entity_permission(auth.uid(), 'Event', t.event_id, 'EDIT_EVENT_LOGISTICS')) or
        (t.tour_id is not null and has_entity_permission(auth.uid(), 'Tour', t.tour_id, 'EDIT_EVENT_LOGISTICS'))
      )
    )
  );

create policy "log_act_insert_linked_task" on logistics_activity
  for insert with check (
    auth.role() = 'authenticated' and exists (
      select 1 from logistics_tasks t
      where t.id = logistics_activity.task_id and (
        t.created_by = auth.uid() or
        (t.event_id is not null and has_entity_permission(auth.uid(), 'Event', t.event_id, 'EDIT_EVENT_LOGISTICS')) or
        (t.tour_id is not null and has_entity_permission(auth.uid(), 'Tour', t.tour_id, 'EDIT_EVENT_LOGISTICS'))
      )
    )
  );


