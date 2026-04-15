set client_min_messages = warning;

-- Compatibility RLS for tasks: support legacy schemas without org_id

do $$ begin
  if to_regclass('public.tasks') is null then
    return;
  end if;

  -- Drop previous policies if they exist
  execute 'drop policy if exists tasks_select on tasks';
  execute 'drop policy if exists tasks_insert on tasks';
  execute 'drop policy if exists tasks_update on tasks';

  -- Determine which column to use to derive org context
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='tasks' and column_name='org_id'
  ) then
    -- Direct org_id available
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
    -- Derive org via events_v2
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
    -- Legacy: attempt to treat tour_id as events_v2.id for org derivation
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
      -- Safe deny-all if we cannot derive org context
      execute 'create policy tasks_select on tasks for select using (false)';
      execute 'create policy tasks_insert on tasks for insert with check (false)';
      execute 'create policy tasks_update on tasks for update using (false)';
    end if;

  else
    -- Safe deny-all if no usable columns
    execute 'create policy tasks_select on tasks for select using (false)';
    execute 'create policy tasks_insert on tasks for insert with check (false)';
    execute 'create policy tasks_update on tasks for update using (false)';
  end if;
end $$;


