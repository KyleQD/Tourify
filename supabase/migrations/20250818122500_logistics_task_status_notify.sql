set client_min_messages = warning;

-- Notify assignee on logistics task status changes
create or replace function notify_task_status_change() returns trigger language plpgsql as $$
declare title_text text;
begin
  if new.assigned_to_user_id is null then return new; end if;
  if (old.status is distinct from new.status) then
    title_text := coalesce(new.title, 'Task update') || ' status: ' || coalesce(new.status,'');
    insert into notifications(user_id, type, title, content, metadata)
    values (
      new.assigned_to_user_id,
      'task_status_update',
      title_text,
      coalesce(new.description,''),
      jsonb_build_object('task_id', new.id, 'event_id', new.event_id, 'status', new.status)
    );
  end if;
  return new;
end$$;

drop trigger if exists trg_logistics_task_status on logistics_tasks;
create trigger trg_logistics_task_status
after update of status on logistics_tasks
for each row execute function notify_task_status_change();


