set client_min_messages = warning;

-- RLS fixes for schedules and schedule_items subqueries returning multiple rows

do $$ begin
  -- Only apply schedules policies if table exists
  if to_regclass('public.schedules') is not null then
    -- Schedules policies (recreate with scalar subqueries guarded by limit 1)
    execute $rls$drop policy if exists schedules_select on schedules$rls$;
    execute $rls$create policy schedules_select on schedules for select using (
      public.is_org_member(
        auth.uid(),
        (select e.org_id from events_v2 e where e.id = schedules.event_id limit 1)
      )
    )$rls$;

    execute $rls$drop policy if exists schedules_insert on schedules$rls$;
    execute $rls$create policy schedules_insert on schedules for insert with check (
      public.has_perm(
        auth.uid(),
        (select e.org_id from events_v2 e where e.id = event_id limit 1),
        'event.manage'
      )
    )$rls$;
  end if;

  -- Only apply schedule_items policies if schedule_items, schedules, and events_v2 exist
  if to_regclass('public.schedule_items') is not null
     and to_regclass('public.schedules') is not null
     and to_regclass('public.events_v2') is not null then
    -- Schedule items policies (recreate with scalar subqueries guarded by limit 1)
    execute $rls$drop policy if exists scheditems_select on schedule_items$rls$;
    execute $rls$create policy scheditems_select on schedule_items for select using (
      public.is_org_member(
        auth.uid(),
        (
          select e.org_id
          from schedules s
          join events_v2 e on e.id = s.event_id
          where s.id = schedule_items.schedule_id
          limit 1
        )
      )
    )$rls$;

    execute $rls$drop policy if exists scheditems_insert on schedule_items$rls$;
    execute $rls$create policy scheditems_insert on schedule_items for insert with check (
      public.has_perm(
        auth.uid(),
        (
          select e.org_id
          from schedules s
          join events_v2 e on e.id = s.event_id
          where s.id = schedule_items.schedule_id
          limit 1
        ),
        'event.manage'
      )
    )$rls$;
  end if;
end $$;


