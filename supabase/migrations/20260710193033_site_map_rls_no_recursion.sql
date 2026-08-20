set client_min_messages = warning;

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
grant usage on schema private to postgres, service_role;

create or replace function private.user_owns_site_map(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.site_maps sm
    where sm.id = p_id
      and sm.created_by = auth.uid()
  );
$$;

create or replace function private.user_is_site_map_collaborator(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.site_map_collaborators smc
    where smc.site_map_id = p_id
      and smc.user_id = auth.uid()
      and smc.is_active = true
  );
$$;

create or replace function private.user_can_manage_site_map_collaborators(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.site_maps sm
    where sm.id = p_id
      and sm.created_by = auth.uid()
  )
  or exists (
    select 1
    from public.site_map_collaborators smc
    where smc.site_map_id = p_id
      and smc.user_id = auth.uid()
      and smc.is_active = true
      and smc.can_edit = true
  );
$$;

revoke all on function private.user_owns_site_map(uuid) from public;
revoke all on function private.user_is_site_map_collaborator(uuid) from public;
revoke all on function private.user_can_manage_site_map_collaborators(uuid) from public;
grant execute on function private.user_owns_site_map(uuid) to authenticated, service_role;
grant execute on function private.user_is_site_map_collaborator(uuid) to authenticated, service_role;
grant execute on function private.user_can_manage_site_map_collaborators(uuid) to authenticated, service_role;

drop policy if exists "Users can view public site maps" on public.site_maps;
drop policy if exists "Users can manage their own site maps" on public.site_maps;
drop policy if exists "Collaborators can view site maps" on public.site_maps;

create policy "Users can manage their own site maps"
  on public.site_maps
  for all
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

create policy "Users can view public site maps"
  on public.site_maps
  for select
  using (is_public = true);

create policy "Collaborators can view site maps"
  on public.site_maps
  for select
  using (private.user_is_site_map_collaborator(id));

drop policy if exists "Users can view collaborators for accessible site maps" on public.site_map_collaborators;
drop policy if exists "Users can view collaborators for their site maps" on public.site_map_collaborators;
drop policy if exists "Collaborators can manage collaborators" on public.site_map_collaborators;
drop policy if exists "Site map owners can manage collaborators" on public.site_map_collaborators;
drop policy if exists "Owners and editors can manage collaborators" on public.site_map_collaborators;

create policy "Users can view collaborators for their site maps"
  on public.site_map_collaborators
  for select
  using (
    auth.uid() = user_id
    or private.user_owns_site_map(site_map_id)
  );

create policy "Owners and editors can manage collaborators"
  on public.site_map_collaborators
  for all
  using (private.user_can_manage_site_map_collaborators(site_map_id))
  with check (private.user_can_manage_site_map_collaborators(site_map_id));;
