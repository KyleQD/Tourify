-- Step 3 (security linter 0024_permissive_rls_policy): replace INSERT/UPDATE/DELETE/ALL
-- policies that use bare true / open WITH CHECK with role- and data-scoped rules.

-- ---------------------------------------------------------------------------
-- 3a) Venue RBAC write policies: mirror USING into WITH CHECK (entity_rls)
-- ---------------------------------------------------------------------------
do $body$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'staff_zones') then
    execute 'drop policy if exists staff_zones_write on staff_zones';
    execute $p$
      create policy staff_zones_write on staff_zones
      for all using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'ASSIGN_EVENT_ROLES')
        or (event_id is not null and has_entity_permission(auth.uid(), 'Event', event_id, 'ASSIGN_EVENT_ROLES'))
      )
      with check (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'ASSIGN_EVENT_ROLES')
        or (event_id is not null and has_entity_permission(auth.uid(), 'Event', event_id, 'ASSIGN_EVENT_ROLES'))
      )
    $p$;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'staff_performance_metrics') then
    execute 'drop policy if exists staff_performance_metrics_write on staff_performance_metrics';
    execute $p$
      create policy staff_performance_metrics_write on staff_performance_metrics
      for all using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'ASSIGN_EVENT_ROLES')
        or (event_id is not null and has_entity_permission(auth.uid(), 'Event', event_id, 'ASSIGN_EVENT_ROLES'))
      )
      with check (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'ASSIGN_EVENT_ROLES')
        or (event_id is not null and has_entity_permission(auth.uid(), 'Event', event_id, 'ASSIGN_EVENT_ROLES'))
      )
    $p$;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'staff_training_records') then
    execute 'drop policy if exists staff_training_records_write on staff_training_records';
    execute $p$
      create policy staff_training_records_write on staff_training_records
      for all using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'MANAGE_MEMBERS')
      )
      with check (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'MANAGE_MEMBERS')
      )
    $p$;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'staff_certifications') then
    execute 'drop policy if exists staff_certifications_write on staff_certifications';
    execute $p$
      create policy staff_certifications_write on staff_certifications
      for all using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'MANAGE_MEMBERS')
      )
      with check (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'MANAGE_MEMBERS')
      )
    $p$;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'team_communications') then
    execute 'drop policy if exists team_communications_write on team_communications';
    execute $p$
      create policy team_communications_write on team_communications
      for all using (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'MANAGE_MEMBERS')
        or sender_id = auth.uid()
      )
      with check (
        has_entity_permission(auth.uid(), 'Venue', venue_id, 'MANAGE_MEMBERS')
        or sender_id = auth.uid()
      )
    $p$;
  end if;
end $body$;

-- ---------------------------------------------------------------------------
-- 3b) EPK telemetry: bounded public insert (still open read via separate policies)
-- ---------------------------------------------------------------------------
drop policy if exists "Public can insert epk telemetry" on public.epk_telemetry;
create policy "Public can insert epk telemetry"
on public.epk_telemetry
for insert
with check (
  char_length(epk_slug) between 1 and 200
  and char_length(event_type) between 1 and 128
  and jsonb_typeof(metadata) = 'object'
);

-- ---------------------------------------------------------------------------
-- 3c) Audio metadata: collaborators / uploader only (service_role bypasses RLS)
-- ---------------------------------------------------------------------------
drop policy if exists "System can create audio metadata" on public.audio_files;
create policy "Users can create audio metadata for permitted files"
on public.audio_files
for insert
with check (
  project_file_id in (
    select id from public.project_files
    where uploaded_by = auth.uid()
       or project_id in (
         select project_id from public.project_collaborators
         where user_id = auth.uid() and status = 'active'
           and coalesce((permissions->>'can_manage_files')::boolean, false) = true
       )
  )
);

-- ---------------------------------------------------------------------------
-- 3d) Hashtags: authenticated + sane name (not bare true)
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone can create hashtags" on public.hashtags;
create policy "Authenticated users can create hashtags"
on public.hashtags
for insert
to authenticated
with check (
  char_length(trim(name)) between 1 and 120
  and trim(name) = name
);

-- ---------------------------------------------------------------------------
-- 3e) Forum content_refs insert: must reference a known kind
-- ---------------------------------------------------------------------------
drop policy if exists "content_refs:create" on public.content_refs;
create policy "content_refs:create"
on public.content_refs
for insert
with check (
  auth.uid() is not null
  and exists (select 1 from public.content_kind ck where ck.id = kind)
  and (target_id is not null or (target_url is not null and char_length(target_url) between 1 and 2048))
);

-- ---------------------------------------------------------------------------
-- 3f) Staff contracts / messages (drop permissive dashboard policies)
-- ---------------------------------------------------------------------------
drop policy if exists "Enable all for authenticated users on staff_contracts" on public.staff_contracts;
drop policy if exists "Users can access their venue contracts" on public.staff_contracts;
drop policy if exists staff_contracts_auth on public.staff_contracts;

create policy staff_contracts_select on public.staff_contracts
for select using (
  (
    venue_id is not null
    and public.has_entity_permission(auth.uid(), 'Venue', venue_id::uuid, 'MANAGE_MEMBERS')
  )
  or (employee_id is not null and employee_id::text = auth.uid()::text)
  or (created_by is not null and created_by::text = auth.uid()::text)
);

create policy staff_contracts_insert on public.staff_contracts
for insert with check (
  (
    venue_id is not null
    and public.has_entity_permission(auth.uid(), 'Venue', venue_id::uuid, 'MANAGE_MEMBERS')
  )
  or (
    created_by is not null
    and created_by::text = auth.uid()::text
    and (venue_id is not null or employee_id is not null)
  )
);

create policy staff_contracts_update on public.staff_contracts
for update
using (
  (
    venue_id is not null
    and public.has_entity_permission(auth.uid(), 'Venue', venue_id::uuid, 'MANAGE_MEMBERS')
  )
  or (employee_id is not null and employee_id::text = auth.uid()::text)
  or (created_by is not null and created_by::text = auth.uid()::text)
)
with check (
  (
    venue_id is not null
    and public.has_entity_permission(auth.uid(), 'Venue', venue_id::uuid, 'MANAGE_MEMBERS')
  )
  or (created_by is not null and created_by::text = auth.uid()::text)
);

create policy staff_contracts_delete on public.staff_contracts
for delete using (
  venue_id is not null
  and public.has_entity_permission(auth.uid(), 'Venue', venue_id::uuid, 'MANAGE_MEMBERS')
);

drop policy if exists staff_messages_all on public.staff_messages;
drop policy if exists "Enable all for authenticated users on staff_messages" on public.staff_messages;
drop policy if exists "Users can access their venue messages" on public.staff_messages;

-- staff_messages shape differs by environment:
--   • Canonical: org_id + uuid[] recipients (notifications_and_staff_messages migration)
--   • Legacy:    venue_id + text[] recipients (e.g. setup-admin-tables scripts), no org_id
do $staff_msg$
declare
  v_has_org_id boolean;
  v_has_venue_id boolean;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'staff_messages'
  ) then
    return;
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_messages' and column_name = 'org_id'
  ) into v_has_org_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_messages' and column_name = 'venue_id'
  ) into v_has_venue_id;

  execute 'drop policy if exists staff_messages_select on public.staff_messages';
  execute 'drop policy if exists staff_messages_insert on public.staff_messages';
  execute 'drop policy if exists staff_messages_update on public.staff_messages';
  execute 'drop policy if exists staff_messages_delete on public.staff_messages';

  if v_has_org_id then
    execute $p$
      create policy staff_messages_select on public.staff_messages
      for select using (
        org_id is not null
        and (
          public.is_org_member(auth.uid(), org_id)
          or (sender_id is not null and sender_id::text = auth.uid()::text)
          or (
            recipients is not null
            and exists (
              select 1
              from unnest(recipients) as r(recipient)
              where recipient is not null and recipient::text = auth.uid()::text
            )
          )
        )
      )
    $p$;
    execute $p$
      create policy staff_messages_insert on public.staff_messages
      for insert with check (
        org_id is not null
        and public.is_org_member(auth.uid(), org_id)
        and sender_id is not null
        and sender_id::text = auth.uid()::text
      )
    $p$;
    execute $p$
      create policy staff_messages_update on public.staff_messages
      for update
      using (
        org_id is not null
        and (
          public.has_perm(auth.uid(), org_id, 'staff.manage')
          or (sender_id is not null and sender_id::text = auth.uid()::text)
          or (
            recipients is not null
            and exists (
              select 1
              from unnest(recipients) as r(recipient)
              where recipient is not null and recipient::text = auth.uid()::text
            )
          )
        )
      )
      with check (
        org_id is not null
        and public.is_org_member(auth.uid(), org_id)
      )
    $p$;
    execute $p$
      create policy staff_messages_delete on public.staff_messages
      for delete using (
        org_id is not null
        and public.has_perm(auth.uid(), org_id, 'staff.manage')
      )
    $p$;
  elsif v_has_venue_id then
    execute $p$
      create policy staff_messages_select on public.staff_messages
      for select using (
        venue_id in (select vp.id from public.venue_profiles vp where vp.user_id = auth.uid())
        or (sender_id is not null and sender_id::text = auth.uid()::text)
        or (
          recipients is not null
          and exists (
            select 1
            from unnest(recipients) as r(recipient)
            where recipient is not null and btrim(recipient::text) = auth.uid()::text
          )
        )
      )
    $p$;
    execute $p$
      create policy staff_messages_insert on public.staff_messages
      for insert with check (
        sender_id is not null
        and sender_id::text = auth.uid()::text
        and venue_id in (select vp.id from public.venue_profiles vp where vp.user_id = auth.uid())
      )
    $p$;
    execute $p$
      create policy staff_messages_update on public.staff_messages
      for update
      using (
        venue_id in (select vp.id from public.venue_profiles vp where vp.user_id = auth.uid())
        or (sender_id is not null and sender_id::text = auth.uid()::text)
        or (
          recipients is not null
          and exists (
            select 1
            from unnest(recipients) as r(recipient)
            where recipient is not null and btrim(recipient::text) = auth.uid()::text
          )
        )
      )
      with check (
        venue_id in (select vp.id from public.venue_profiles vp where vp.user_id = auth.uid())
        or (sender_id is not null and sender_id::text = auth.uid()::text)
      )
    $p$;
    execute $p$
      create policy staff_messages_delete on public.staff_messages
      for delete using (
        venue_id in (select vp.id from public.venue_profiles vp where vp.user_id = auth.uid())
      )
    $p$;
  else
    execute $p$
      create policy staff_messages_select on public.staff_messages
      for select using (
        auth.uid() is not null
        and (
          (sender_id is not null and sender_id::text = auth.uid()::text)
          or (
            recipients is not null
            and exists (
              select 1
              from unnest(recipients) as r(recipient)
              where recipient is not null and recipient::text = auth.uid()::text
            )
          )
        )
      )
    $p$;
    execute $p$
      create policy staff_messages_insert on public.staff_messages
      for insert with check (
        sender_id is not null
        and sender_id::text = auth.uid()::text
      )
    $p$;
    execute $p$
      create policy staff_messages_update on public.staff_messages
      for update
      using (
        auth.uid() is not null
        and (
          (sender_id is not null and sender_id::text = auth.uid()::text)
          or (
            recipients is not null
            and exists (
              select 1
              from unnest(recipients) as r(recipient)
              where recipient is not null and recipient::text = auth.uid()::text
            )
          )
        )
      )
      with check (sender_id is not null and sender_id::text = auth.uid()::text)
    $p$;
    execute $p$
      create policy staff_messages_delete on public.staff_messages
      for delete using (
        sender_id is not null and sender_id::text = auth.uid()::text
      )
    $p$;
  end if;
end $staff_msg$;

-- ---------------------------------------------------------------------------
-- 3g) Staff onboarding templates / steps (replace weak auth.uid() IS NOT NULL)
-- ---------------------------------------------------------------------------
drop policy if exists staff_onboarding_templates_auth on public.staff_onboarding_templates;
drop policy if exists staff_onboarding_steps_auth on public.staff_onboarding_steps;

create policy staff_onboarding_templates_select on public.staff_onboarding_templates
for select using (
  venue_id is null
  or public.has_entity_permission(auth.uid(), 'Venue', venue_id::uuid, 'MANAGE_MEMBERS')
);

create policy staff_onboarding_templates_insert on public.staff_onboarding_templates
for insert with check (
  created_by is not null
  and created_by::text = auth.uid()::text
  and (
    venue_id is null
    or public.has_entity_permission(auth.uid(), 'Venue', venue_id::uuid, 'MANAGE_MEMBERS')
  )
);

create policy staff_onboarding_templates_update on public.staff_onboarding_templates
for update
using (
  venue_id is null
  or public.has_entity_permission(auth.uid(), 'Venue', venue_id::uuid, 'MANAGE_MEMBERS')
)
with check (
  venue_id is null
  or public.has_entity_permission(auth.uid(), 'Venue', venue_id::uuid, 'MANAGE_MEMBERS')
);

create policy staff_onboarding_templates_delete on public.staff_onboarding_templates
for delete using (
  venue_id is not null
  and public.has_entity_permission(auth.uid(), 'Venue', venue_id::uuid, 'MANAGE_MEMBERS')
);

create policy staff_onboarding_steps_select on public.staff_onboarding_steps
for select using (
  exists (
    select 1
    from public.staff_onboarding_templates t
    where t.id = staff_onboarding_steps.template_id
      and (
        t.venue_id is null
        or public.has_entity_permission(auth.uid(), 'Venue', t.venue_id::uuid, 'MANAGE_MEMBERS')
      )
  )
);

create policy staff_onboarding_steps_insert on public.staff_onboarding_steps
for insert with check (
  exists (
    select 1
    from public.staff_onboarding_templates t
    where t.id = staff_onboarding_steps.template_id
      and (
        t.venue_id is null
        or public.has_entity_permission(auth.uid(), 'Venue', t.venue_id::uuid, 'MANAGE_MEMBERS')
      )
  )
);

create policy staff_onboarding_steps_update on public.staff_onboarding_steps
for update
using (
  exists (
    select 1
    from public.staff_onboarding_templates t
    where t.id = staff_onboarding_steps.template_id
      and (
        t.venue_id is null
        or public.has_entity_permission(auth.uid(), 'Venue', t.venue_id::uuid, 'MANAGE_MEMBERS')
      )
  )
)
with check (
  exists (
    select 1
    from public.staff_onboarding_templates t
    where t.id = staff_onboarding_steps.template_id
      and (
        t.venue_id is null
        or public.has_entity_permission(auth.uid(), 'Venue', t.venue_id::uuid, 'MANAGE_MEMBERS')
      )
  )
);

create policy staff_onboarding_steps_delete on public.staff_onboarding_steps
for delete using (
  exists (
    select 1
    from public.staff_onboarding_templates t
    where t.id = staff_onboarding_steps.template_id
      and t.venue_id is not null
      and public.has_entity_permission(auth.uid(), 'Venue', t.venue_id::uuid, 'MANAGE_MEMBERS')
  )
);

-- ---------------------------------------------------------------------------
-- 3h) Achievement progress events (prod may have permissive "system" insert)
-- ---------------------------------------------------------------------------
alter table if exists public.achievement_progress_events enable row level security;

drop policy if exists "System can create progress events" on public.achievement_progress_events;
drop policy if exists achievement_progress_events_select_own on public.achievement_progress_events;
drop policy if exists achievement_progress_events_insert_own on public.achievement_progress_events;

create policy achievement_progress_events_select_own
on public.achievement_progress_events
for select
using (user_id = auth.uid());

create policy achievement_progress_events_insert_own
on public.achievement_progress_events
for insert
with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3i) Optional / prod-only: drop permissive policies (guarded); add scoped rules
-- ---------------------------------------------------------------------------
drop policy if exists "System can insert notifications" on public.notifications;

do $body$
begin
  if to_regclass('public.notification_batches') is not null then
    execute 'drop policy if exists "System can insert batches" on public.notification_batches';
    execute 'drop policy if exists "System can manage batches" on public.notification_batches';
  end if;
  if to_regclass('public.notification_delivery_log') is not null then
    execute 'drop policy if exists "System can insert delivery logs" on public.notification_delivery_log';
    execute 'drop policy if exists "System can manage delivery logs" on public.notification_delivery_log';
  end if;
  if to_regclass('public.staff_onboarding_activities') is not null then
    execute 'drop policy if exists "Enable all for authenticated users on onboarding_activities" on public.staff_onboarding_activities';
  end if;
  if to_regclass('public.staff_onboarding_candidates') is not null then
    execute 'drop policy if exists "Enable all for authenticated users on onboarding_candidates" on public.staff_onboarding_candidates';
  end if;
  if to_regclass('public.staff_onboarding_steps') is not null then
    execute 'drop policy if exists "Enable all for authenticated users on onboarding_steps" on public.staff_onboarding_steps';
  end if;
  if to_regclass('public.staff_onboarding_templates') is not null then
    execute 'drop policy if exists "Enable all for authenticated users on onboarding_templates" on public.staff_onboarding_templates';
  end if;
  if to_regclass('public.onboarding_candidates') is not null then
    execute 'drop policy if exists "Users can access their venue data" on public.onboarding_candidates';
  end if;
end $body$;

do $body$
begin
  if to_regclass('public.betalaunch') is not null then
    execute 'drop policy if exists "Allow inserts to betalaunch" on public.betalaunch';
    execute $p$
      create policy betalaunch_insert_authenticated on public.betalaunch
      for insert
      to authenticated
      with check (auth.uid() is not null)
    $p$;
  end if;
end $body$;

do $body$
begin
  if to_regclass('public.event_collaborators') is not null then
    execute 'drop policy if exists event_collaborators_delete on public.event_collaborators';
    execute 'drop policy if exists event_collaborators_insert on public.event_collaborators';
    execute 'drop policy if exists event_collaborators_update on public.event_collaborators';
    execute 'drop policy if exists event_collaborators_select on public.event_collaborators';
    execute $p$
      create policy event_collaborators_select on public.event_collaborators
      for select
      using (user_id = auth.uid())
    $p$;
    execute $p$
      create policy event_collaborators_insert on public.event_collaborators
      for insert
      with check (user_id = auth.uid())
    $p$;
    execute $p$
      create policy event_collaborators_update on public.event_collaborators
      for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid())
    $p$;
    execute $p$
      create policy event_collaborators_delete on public.event_collaborators
      for delete
      using (user_id = auth.uid())
    $p$;
  end if;
end $body$;

do $body$
begin
  if to_regclass('public.event_page_settings') is not null
     and to_regclass('public.event_collaborators') is not null then
    execute 'drop policy if exists event_page_settings_select on public.event_page_settings';
    execute 'drop policy if exists event_page_settings_insert on public.event_page_settings';
    execute 'drop policy if exists event_page_settings_update on public.event_page_settings';
    execute $p$
      create policy event_page_settings_select on public.event_page_settings
      for select
      using (
        exists (
          select 1 from public.event_collaborators ec
          where ec.event_id = event_page_settings.event_id
            and ec.event_table = event_page_settings.event_table
            and ec.user_id = auth.uid()
            and ec.status = 'accepted'
        )
      )
    $p$;
    execute $p$
      create policy event_page_settings_insert on public.event_page_settings
      for insert
      with check (
        exists (
          select 1 from public.event_collaborators ec
          where ec.event_id = event_page_settings.event_id
            and ec.event_table = event_page_settings.event_table
            and ec.user_id = auth.uid()
            and ec.status = 'accepted'
        )
      )
    $p$;
    execute $p$
      create policy event_page_settings_update on public.event_page_settings
      for update
      using (
        exists (
          select 1 from public.event_collaborators ec
          where ec.event_id = event_page_settings.event_id
            and ec.event_table = event_page_settings.event_table
            and ec.user_id = auth.uid()
            and ec.status = 'accepted'
        )
      )
      with check (
        exists (
          select 1 from public.event_collaborators ec
          where ec.event_id = event_page_settings.event_id
            and ec.event_table = event_page_settings.event_table
            and ec.user_id = auth.uid()
            and ec.status = 'accepted'
        )
      )
    $p$;
  end if;
end $body$;
