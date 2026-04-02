-- Tighten RLS for logistics tables using entity RBAC

-- Drop permissive policies if they exist
do $$ begin
  if exists (select 1 from pg_policies where policyname = 'log_tasks_read_all_auth') then
    drop policy "log_tasks_read_all_auth" on logistics_tasks;
  end if;
  if exists (select 1 from pg_policies where policyname = 'log_tasks_write_creator_or_admin') then
    drop policy "log_tasks_write_creator_or_admin" on logistics_tasks;
  end if;
  if exists (select 1 from pg_policies where policyname = 'log_task_equipment_read_auth') then
    drop policy "log_task_equipment_read_auth" on logistics_task_equipment;
  end if;
  if exists (select 1 from pg_policies where policyname = 'log_task_equipment_write_auth') then
    drop policy "log_task_equipment_write_auth" on logistics_task_equipment;
  end if;
end $$;

drop policy if exists "log_tasks_select_rbacs" on logistics_tasks;
drop policy if exists "log_tasks_insert_rbacs" on logistics_tasks;
drop policy if exists "log_tasks_update_rbacs" on logistics_tasks;
drop policy if exists "log_tasks_delete_rbacs" on logistics_tasks;
drop policy if exists "log_task_equipment_select_rbacs" on logistics_task_equipment;
drop policy if exists "log_task_equipment_cud_rbacs" on logistics_task_equipment;

-- Helper expression: permission on event or tour
-- Usage in policies below

-- SELECT policy
create policy "log_tasks_select_rbacs"
on logistics_tasks for select
using (
  auth.role() = 'authenticated' and (
    created_by = auth.uid() or
    (event_id is not null and has_entity_permission(auth.uid(), 'Event', event_id, 'EDIT_EVENT_LOGISTICS')) or
    (tour_id is not null and has_entity_permission(auth.uid(), 'Tour', tour_id, 'EDIT_EVENT_LOGISTICS'))
  )
);

-- INSERT policy
create policy "log_tasks_insert_rbacs"
on logistics_tasks for insert
with check (
  auth.role() = 'authenticated' and (
    (coalesce(event_id is not null, false) and has_entity_permission(auth.uid(), 'Event', event_id, 'EDIT_EVENT_LOGISTICS')) or
    (coalesce(tour_id is not null, false) and has_entity_permission(auth.uid(), 'Tour', tour_id, 'EDIT_EVENT_LOGISTICS')) or
    created_by = auth.uid()
  )
);

-- UPDATE policy
create policy "log_tasks_update_rbacs"
on logistics_tasks for update
using (
  auth.role() = 'authenticated' and (
    created_by = auth.uid() or
    (event_id is not null and has_entity_permission(auth.uid(), 'Event', event_id, 'EDIT_EVENT_LOGISTICS')) or
    (tour_id is not null and has_entity_permission(auth.uid(), 'Tour', tour_id, 'EDIT_EVENT_LOGISTICS'))
  )
)
with check (
  auth.role() = 'authenticated' and (
    created_by = auth.uid() or
    (event_id is not null and has_entity_permission(auth.uid(), 'Event', event_id, 'EDIT_EVENT_LOGISTICS')) or
    (tour_id is not null and has_entity_permission(auth.uid(), 'Tour', tour_id, 'EDIT_EVENT_LOGISTICS'))
  )
);

-- DELETE policy
create policy "log_tasks_delete_rbacs"
on logistics_tasks for delete
using (
  auth.role() = 'authenticated' and (
    created_by = auth.uid() or
    (event_id is not null and has_entity_permission(auth.uid(), 'Event', event_id, 'EDIT_EVENT_LOGISTICS')) or
    (tour_id is not null and has_entity_permission(auth.uid(), 'Tour', tour_id, 'EDIT_EVENT_LOGISTICS'))
  )
);

-- Equipment link policies
create policy "log_task_equipment_select_rbacs"
on logistics_task_equipment for select
using (
  auth.role() = 'authenticated' and exists(
    select 1 from logistics_tasks t
    where t.id = logistics_task_equipment.task_id and (
      t.created_by = auth.uid() or
      (t.event_id is not null and has_entity_permission(auth.uid(), 'Event', t.event_id, 'EDIT_EVENT_LOGISTICS')) or
      (t.tour_id is not null and has_entity_permission(auth.uid(), 'Tour', t.tour_id, 'EDIT_EVENT_LOGISTICS'))
    )
  )
);

create policy "log_task_equipment_cud_rbacs"
on logistics_task_equipment for all
using (
  auth.role() = 'authenticated' and exists(
    select 1 from logistics_tasks t
    where t.id = logistics_task_equipment.task_id and (
      t.created_by = auth.uid() or
      (t.event_id is not null and has_entity_permission(auth.uid(), 'Event', t.event_id, 'EDIT_EVENT_LOGISTICS')) or
      (t.tour_id is not null and has_entity_permission(auth.uid(), 'Tour', t.tour_id, 'EDIT_EVENT_LOGISTICS'))
    )
  )
)
with check (
  auth.role() = 'authenticated' and exists(
    select 1 from logistics_tasks t
    where t.id = logistics_task_equipment.task_id and (
      t.created_by = auth.uid() or
      (t.event_id is not null and has_entity_permission(auth.uid(), 'Event', t.event_id, 'EDIT_EVENT_LOGISTICS')) or
      (t.tour_id is not null and has_entity_permission(auth.uid(), 'Tour', t.tour_id, 'EDIT_EVENT_LOGISTICS'))
    )
  )
);


