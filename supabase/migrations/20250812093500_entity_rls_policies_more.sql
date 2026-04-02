-- =============================================================================
-- Additional RBAC-driven RLS Policies (Additive, Idempotent)
-- Depends on: has_entity_permission
-- =============================================================================

-- staff_zones
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'staff_zones') then
    execute 'alter table staff_zones enable row level security';
    begin execute 'drop policy if exists staff_zones_select on staff_zones'; exception when others then end;
    begin execute 'drop policy if exists staff_zones_write on staff_zones'; exception when others then end;

    execute $policy$
      create policy staff_zones_select on staff_zones
      for select using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'EDIT_EVENT_LOGISTICS')
        or (event_id is not null and has_entity_permission(auth.uid(), 'Event', event_id, 'EDIT_EVENT_LOGISTICS'))
      )
    $policy$;

    execute $policy$
      create policy staff_zones_write on staff_zones
      for all using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'ASSIGN_EVENT_ROLES')
        or (event_id is not null and has_entity_permission(auth.uid(), 'Event', event_id, 'ASSIGN_EVENT_ROLES'))
      ) with check (true)
    $policy$;
  end if;
end $$;

-- staff_performance_metrics
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'staff_performance_metrics') then
    execute 'alter table staff_performance_metrics enable row level security';
    begin execute 'drop policy if exists staff_performance_metrics_select on staff_performance_metrics'; exception when others then end;
    begin execute 'drop policy if exists staff_performance_metrics_write on staff_performance_metrics'; exception when others then end;

    execute $policy$
      create policy staff_performance_metrics_select on staff_performance_metrics
      for select using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'EDIT_EVENT_LOGISTICS')
        or (event_id is not null and has_entity_permission(auth.uid(), 'Event', event_id, 'EDIT_EVENT_LOGISTICS'))
      )
    $policy$;

    execute $policy$
      create policy staff_performance_metrics_write on staff_performance_metrics
      for all using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'ASSIGN_EVENT_ROLES')
        or (event_id is not null and has_entity_permission(auth.uid(), 'Event', event_id, 'ASSIGN_EVENT_ROLES'))
      ) with check (true)
    $policy$;
  end if;
end $$;

-- staff_training_records
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'staff_training_records') then
    execute 'alter table staff_training_records enable row level security';
    begin execute 'drop policy if exists staff_training_records_select on staff_training_records'; exception when others then end;
    begin execute 'drop policy if exists staff_training_records_write on staff_training_records'; exception when others then end;

    execute $policy$
      create policy staff_training_records_select on staff_training_records
      for select using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'EDIT_EVENT_LOGISTICS')
      )
    $policy$;

    execute $policy$
      create policy staff_training_records_write on staff_training_records
      for all using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'MANAGE_MEMBERS')
      ) with check (true)
    $policy$;
  end if;
end $$;

-- staff_certifications
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'staff_certifications') then
    execute 'alter table staff_certifications enable row level security';
    begin execute 'drop policy if exists staff_certifications_select on staff_certifications'; exception when others then end;
    begin execute 'drop policy if exists staff_certifications_write on staff_certifications'; exception when others then end;

    execute $policy$
      create policy staff_certifications_select on staff_certifications
      for select using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'EDIT_EVENT_LOGISTICS')
      )
    $policy$;

    execute $policy$
      create policy staff_certifications_write on staff_certifications
      for all using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'MANAGE_MEMBERS')
      ) with check (true)
    $policy$;
  end if;
end $$;

-- team_communications
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'team_communications') then
    execute 'alter table team_communications enable row level security';
    begin execute 'drop policy if exists team_communications_select on team_communications'; exception when others then end;
    begin execute 'drop policy if exists team_communications_write on team_communications'; exception when others then end;

    execute $policy$
      create policy team_communications_select on team_communications
      for select using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'EDIT_EVENT_LOGISTICS')
        or sender_id = auth.uid()
        or (auth.uid()::text = any(recipients))
      )
    $policy$;

    execute $policy$
      create policy team_communications_write on team_communications
      for all using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'MANAGE_MEMBERS')
        or sender_id = auth.uid()
      ) with check (true)
    $policy$;
  end if;
end $$;


