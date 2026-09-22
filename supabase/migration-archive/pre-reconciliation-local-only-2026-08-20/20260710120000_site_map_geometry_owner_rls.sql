set client_min_messages = warning;

-- Owner-or-editor write access for core geometry tables (mirrors layers/measurements hardening)

drop policy if exists "Collaborators can manage zones" on public.site_map_zones;
create policy "Users can manage zones for accessible site maps"
  on public.site_map_zones for all
  using (
    exists (
      select 1 from public.site_maps sm
      where sm.id = site_map_zones.site_map_id
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
      where sm.id = site_map_zones.site_map_id
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

drop policy if exists "Collaborators can manage tents" on public.glamping_tents;
create policy "Users can manage tents for accessible site maps"
  on public.glamping_tents for all
  using (
    exists (
      select 1 from public.site_maps sm
      where sm.id = glamping_tents.site_map_id
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
      where sm.id = glamping_tents.site_map_id
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

drop policy if exists "Collaborators can manage elements" on public.site_map_elements;
create policy "Users can manage elements for accessible site maps"
  on public.site_map_elements for all
  using (
    exists (
      select 1 from public.site_maps sm
      where sm.id = site_map_elements.site_map_id
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
      where sm.id = site_map_elements.site_map_id
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
