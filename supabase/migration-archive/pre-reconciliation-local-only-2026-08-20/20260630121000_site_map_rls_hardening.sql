set client_min_messages = warning;

drop policy if exists "Users can manage layers for accessible site maps" on public.map_layers;
create policy "Users can manage layers for accessible site maps"
  on public.map_layers for all
  using (
    exists (
      select 1 from public.site_maps sm
      where sm.id = map_layers.site_map_id
      and (
        sm.created_by = auth.uid()
        or exists (
          select 1 from public.site_map_collaborators smc
          where smc.site_map_id = sm.id
          and smc.user_id = auth.uid()
          and smc.is_active = true
          and smc.can_edit = true
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.site_maps sm
      where sm.id = map_layers.site_map_id
      and (
        sm.created_by = auth.uid()
        or exists (
          select 1 from public.site_map_collaborators smc
          where smc.site_map_id = sm.id
          and smc.user_id = auth.uid()
          and smc.is_active = true
          and smc.can_edit = true
        )
      )
    )
  );

drop policy if exists "Users can manage measurements for accessible site maps" on public.map_measurements;
create policy "Users can manage measurements for accessible site maps"
  on public.map_measurements for all
  using (
    exists (
      select 1 from public.site_maps sm
      where sm.id = map_measurements.site_map_id
      and (
        sm.created_by = auth.uid()
        or exists (
          select 1 from public.site_map_collaborators smc
          where smc.site_map_id = sm.id
          and smc.user_id = auth.uid()
          and smc.is_active = true
          and smc.can_edit = true
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.site_maps sm
      where sm.id = map_measurements.site_map_id
      and (
        sm.created_by = auth.uid()
        or exists (
          select 1 from public.site_map_collaborators smc
          where smc.site_map_id = sm.id
          and smc.user_id = auth.uid()
          and smc.is_active = true
          and smc.can_edit = true
        )
      )
    )
  );

drop policy if exists "Users can manage issues for accessible site maps" on public.map_issues;
create policy "Users can manage issues for accessible site maps"
  on public.map_issues for all
  using (
    exists (
      select 1 from public.site_maps sm
      where sm.id = map_issues.site_map_id
      and (
        sm.created_by = auth.uid()
        or exists (
          select 1 from public.site_map_collaborators smc
          where smc.site_map_id = sm.id
          and smc.user_id = auth.uid()
          and smc.is_active = true
          and smc.can_edit = true
        )
      )
    )
  )
  with check (
    exists (
      select 1 from public.site_maps sm
      where sm.id = map_issues.site_map_id
      and (
        sm.created_by = auth.uid()
        or exists (
          select 1 from public.site_map_collaborators smc
          where smc.site_map_id = sm.id
          and smc.user_id = auth.uid()
          and smc.is_active = true
          and smc.can_edit = true
        )
      )
    )
  );

drop policy if exists "Users can manage task assignments for accessible site maps" on public.map_task_assignments;

create policy "Users can insert task assignments for accessible site maps"
  on public.map_task_assignments for insert
  with check (
    exists (
      select 1 from public.site_maps sm
      where sm.id = map_task_assignments.site_map_id
      and (
        sm.created_by = auth.uid()
        or exists (
          select 1 from public.site_map_collaborators smc
          where smc.site_map_id = sm.id
          and smc.user_id = auth.uid()
          and smc.is_active = true
          and smc.can_edit = true
        )
      )
    )
  );

create policy "Users can update task assignments for accessible site maps"
  on public.map_task_assignments for update
  using (
    assigned_user_id = auth.uid()
    or exists (
      select 1 from public.site_maps sm
      where sm.id = map_task_assignments.site_map_id
      and (
        sm.created_by = auth.uid()
        or exists (
          select 1 from public.site_map_collaborators smc
          where smc.site_map_id = sm.id
          and smc.user_id = auth.uid()
          and smc.is_active = true
          and smc.can_edit = true
        )
      )
    )
  )
  with check (
    assigned_user_id = auth.uid()
    or exists (
      select 1 from public.site_maps sm
      where sm.id = map_task_assignments.site_map_id
      and (
        sm.created_by = auth.uid()
        or exists (
          select 1 from public.site_map_collaborators smc
          where smc.site_map_id = sm.id
          and smc.user_id = auth.uid()
          and smc.is_active = true
          and smc.can_edit = true
        )
      )
    )
  );

create policy "Users can delete task assignments for accessible site maps"
  on public.map_task_assignments for delete
  using (
    exists (
      select 1 from public.site_maps sm
      where sm.id = map_task_assignments.site_map_id
      and (
        sm.created_by = auth.uid()
        or exists (
          select 1 from public.site_map_collaborators smc
          where smc.site_map_id = sm.id
          and smc.user_id = auth.uid()
          and smc.is_active = true
          and smc.can_edit = true
        )
      )
    )
  );
