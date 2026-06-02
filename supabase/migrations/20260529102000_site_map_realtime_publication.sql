set client_min_messages = warning;

do $$
begin
  begin
    alter publication supabase_realtime add table public.site_map_activity_log;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.map_task_assignments;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end
$$;

alter table if exists public.site_map_activity_log replica identity full;
alter table if exists public.map_task_assignments replica identity full;
