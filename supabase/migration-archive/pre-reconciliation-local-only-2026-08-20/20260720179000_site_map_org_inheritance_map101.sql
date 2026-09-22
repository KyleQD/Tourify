-- MAP-101: Organization inheritance for site map discovery.
-- Authorized logistics.view|manage users can SELECT/UPDATE maps by org/tour/event.
-- Keep owner + collaborator paths. Remove global authenticated is_public SELECT
-- (public access remains share-token route via service role).

-- ---------------------------------------------------------------------------
-- Capability discovery (SELECT)
-- ---------------------------------------------------------------------------
drop policy if exists map101_logistics_select on public.site_maps;
create policy map101_logistics_select
  on public.site_maps
  for select
  to authenticated
  using (
    public.can_logistics(
      auth.uid(),
      public.resolve_logistics_org_id(org_id, event_id, tour_id),
      'logistics.view'
    )
    or public.can_logistics(
      auth.uid(),
      public.resolve_logistics_org_id(org_id, event_id, tour_id),
      'logistics.manage'
    )
  );

-- ---------------------------------------------------------------------------
-- Capability manage (INSERT/UPDATE/DELETE) — does not replace owner policy
-- ---------------------------------------------------------------------------
drop policy if exists map101_logistics_write on public.site_maps;
create policy map101_logistics_write
  on public.site_maps
  for all
  to authenticated
  using (
    public.can_logistics(
      auth.uid(),
      public.resolve_logistics_org_id(org_id, event_id, tour_id),
      'logistics.manage'
    )
  )
  with check (
    public.can_logistics(
      auth.uid(),
      public.resolve_logistics_org_id(org_id, event_id, tour_id),
      'logistics.manage'
    )
  );

-- ---------------------------------------------------------------------------
-- Tighten blanket public SELECT (token route is the external surface)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can view public site maps" on public.site_maps;

comment on policy map101_logistics_select on public.site_maps is
  'MAP-101: org logistics capability discovers maps by inheritance from org/tour/event.';

comment on policy map101_logistics_write on public.site_maps is
  'MAP-101: logistics.manage may mutate org-scoped maps (owner policy remains).';
