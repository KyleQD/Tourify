-- =============================================================================
-- VEN-148 — Account-aware ticketing ownership resolution (additive, idempotent)
--
-- Defect: event_ticketing_config.ticketing_owner_id was compared directly with
-- auth.uid() in server code and RLS, so ownership only worked when the owner
-- id happened to be a human auth user id. A Venue/Artist/Organization acting
-- account as ticketing_owner could never resolve to its authoritative humans.
--
-- Contract after this migration:
--   - resolve_event_ticketing_owner_user_ids(event_id) is THE typed resolver:
--       user/admin      -> the stored id itself (human anchor)
--       organization    -> organizations.created_by + org owner/admin members
--       venue           -> venue_profiles.user_id / main_profile_id
--                          (event linked via settings.venue_profile_id or the
--                           canonical venue_identity_bridges triangle)
--       artist          -> artist_profiles.user_id
--   - event_ticketing_config_write honors resolved owners alongside explicit
--     manage_ticket_types grants and the event creator.
-- No destructive operations; safe to re-run.
-- =============================================================================

create or replace function public.resolve_event_ticketing_owner_user_ids(p_event_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with cfg as (
    select c.ticketing_owner_type, c.ticketing_owner_id
    from public.event_ticketing_config c
    where c.event_id = p_event_id
      and c.ticketing_owner_id is not null
  ),
  owner_ids as (
    -- Human anchors pass through untouched.
    select ticketing_owner_id as user_id from cfg
    where ticketing_owner_type in ('user', 'admin')

    union
    -- Organization account: creator plus owner/admin members.
    select m.user_id
    from cfg c
    join public.organizations o on o.id = c.ticketing_owner_id
    left join public.org_members m
      on m.org_id = o.id and m.role in ('owner', 'admin')
    where c.ticketing_owner_type = 'organization'
    union all
    select o.created_by from cfg c
    join public.organizations o on o.id = c.ticketing_owner_id
    where c.ticketing_owner_type = 'organization'

    union
    -- Venue account: profile owners via direct settings link…
    select vp.user_id
    from cfg c
    join public.events_v2 e on e.id = p_event_id
    join public.venue_profiles vp
      on vp.id = nullif(e.settings ->> 'venue_profile_id', '')::uuid
    where c.ticketing_owner_type = 'venue'
    union all
    select vp.main_profile_id from cfg c
    join public.events_v2 e on e.id = p_event_id
    join public.venue_profiles vp
      on vp.id = nullif(e.settings ->> 'venue_profile_id', '')::uuid
     and vp.main_profile_id is not null
    where c.ticketing_owner_type = 'venue'

    union
    -- …or through the canonical identity bridge (venues_v2 mirror).
    select vp.user_id
    from cfg c
    join public.events_v2 e on e.id = p_event_id
    join public.venue_identity_bridges b on b.venues_v2_id = e.venue_id
    join public.venue_profiles vp on vp.id = b.venue_profile_id
    where c.ticketing_owner_type = 'venue'

    union
    -- Artist account: artist_profiles.user_id (or a bare profile id).
    select ap.user_id
    from cfg c
    join public.artist_profiles ap on ap.id = c.ticketing_owner_id
    where c.ticketing_owner_type = 'artist'
    union all
    select c.ticketing_owner_id from cfg c
    where c.ticketing_owner_type = 'artist'
      and exists (select 1 from public.profiles p where p.id = c.ticketing_owner_id)
      and not exists (select 1 from public.artist_profiles ap where ap.id = c.ticketing_owner_id)
  )
  select distinct user_id from owner_ids where user_id is not null;
$$;

revoke all on function public.resolve_event_ticketing_owner_user_ids(uuid) from public, anon;
grant execute on function public.resolve_event_ticketing_owner_user_ids(uuid) to authenticated;

comment on function public.resolve_event_ticketing_owner_user_ids(uuid) is
  'VEN-148: resolves event_ticketing_config owner accounts (organization/venue/artist/user) to their authoritative human auth user ids.';

-- ── Config writes: resolved owners gain config authority (parity with server) ─
drop policy if exists event_ticketing_config_write on public.event_ticketing_config;
create policy event_ticketing_config_write on public.event_ticketing_config
  for all using (
    public.has_event_ticketing_grant(event_id, 'manage_ticket_types')
    or exists (
      select 1 from public.events_v2 e
      where e.id = event_id and e.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.resolve_event_ticketing_owner_user_ids(event_id) oid
      where oid = auth.uid()
    )
  )
  with check (
    public.has_event_ticketing_grant(event_id, 'manage_ticket_types')
    or exists (
      select 1 from public.events_v2 e
      where e.id = event_id and e.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.resolve_event_ticketing_owner_user_ids(event_id) oid
      where oid = auth.uid()
    )
  );

-- ── Verification helpers ─────────────────────────────────────────────────────
-- select * from resolve_event_ticketing_owner_user_ids('<event-with-venue-owner>');
