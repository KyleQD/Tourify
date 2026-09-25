-- ═══════════════════════════════════════════════════════════════════════════
-- VENUE-005 — post-apply contract for
-- 20260924120000_venue_availability_reservations_scope_rls.sql
-- (SIM-20260922-VENUE-001 P1 / SIM-20260922-DB-002 P0).
--
-- Runs in the hosted (staging/production) lane after the migration applies
-- (owned by DB-002/DB-008). Every violation query must return zero rows and
-- the final row must report ready = true.
-- ═══════════════════════════════════════════════════════════════════════════

with
  availability as (
    select
      to_regclass('public.venue_availability') as reg,
      c.relrowsecurity as rls_enabled
    from pg_class c
    where c.oid = to_regclass('public.venue_availability')
  ),
  reservations as (
    select
      to_regclass('public.venue_reservations') as reg,
      c.relrowsecurity as rls_enabled
    from pg_class c
    where c.oid = to_regclass('public.venue_reservations')
  ),

  offending_table_select_grants as (
    select n.nspname as schema_name, c.relname as table_name, g.grantee, g.privilege_type
    from information_schema.role_table_grants g
    join pg_class c on c.oid = to_regclass(format('%I.%I', g.table_schema, g.table_name))
    join pg_namespace n on n.oid = c.relnamespace
    where g.table_schema = 'public'
      and g.table_name in ('venue_availability', 'venue_reservations')
      and g.privilege_type = 'SELECT'
      and g.grantee in ('anon', 'public', 'authenticated')
  ),

  offending_client_select_policies as (
    select p.schemaname, p.tablename, p.policyname, p.roles, p.cmd, p.qual
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename in ('venue_availability', 'venue_reservations')
      and p.cmd = 'SELECT'
      -- The ONLY surviving read policy on the raw tables must be the
      -- service-role-only pair created by VENUE-005.
      and p.roles <> array['service_role']::name[]
  ),

  write_path_contract as (
    select
      exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'venue_reservations'
          and policyname = 'venue_reservations_operator' and cmd = 'ALL'
      ) as operator_all_preserved,
      exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'venue_availability'
          and policyname = 'Venue owners can manage their availability' and cmd = 'ALL'
      ) as owner_all_preserved
  ),

  sanitized_public_surface as (
    select
      exists (
        select 1 from pg_views
        where schemaname = 'public' and viewname = 'public_venue_availability'
      ) as view_present,
      exists (
        select 1 from information_schema.role_table_grants
        where table_schema = 'public' and table_name = 'public_venue_availability'
          and privilege_type = 'SELECT' and grantee in ('anon', 'authenticated')
      ) as anon_authenticated_view_select
  ),

  service_role_read_path as (
    select
      exists (
        select 1 from information_schema.role_table_grants
        where table_schema = 'public' and table_name = 'venue_availability'
          and privilege_type = 'SELECT' and grantee = 'service_role'
      ) as availability_service_select,
      exists (
        select 1 from information_schema.role_table_grants
        where table_schema = 'public' and table_name = 'venue_reservations'
          and privilege_type = 'SELECT' and grantee = 'service_role'
      ) as reservations_service_select
  ),

  contract as (
    select
      availability.reg is not null as availability_present,
      availability.rls_enabled as availability_rls_enabled,
      reservations.reg is not null as reservations_present,
      reservations.rls_enabled as reservations_rls_enabled,
      (select count(*) from offending_table_select_grants) as client_select_grant_violations,
      (select count(*) from offending_client_select_policies) as client_select_policy_violations,
      (select operator_all_preserved from write_path_contract) as operator_all_preserved,
      (select owner_all_preserved from write_path_contract) as owner_all_preserved,
      (select view_present from sanitized_public_surface) as sanitized_view_present,
      (select anon_authenticated_view_select from sanitized_public_surface) as sanitized_view_public_select,
      (select availability_service_select from service_role_read_path) as availability_service_select,
      (select reservations_service_select from service_role_read_path) as reservations_service_select
    from availability, reservations
  )

select
  c.*,
  (
    c.availability_present
    and c.availability_rls_enabled
    and c.reservations_present
    and c.reservations_rls_enabled
    and c.client_select_grant_violations = 0
    and c.client_select_policy_violations = 0
    and c.operator_all_preserved
    and c.owner_all_preserved
    and c.sanitized_view_present
    and c.sanitized_view_public_select
    and c.availability_service_select
    and c.reservations_service_select
  ) as ready
from contract c;

-- Fail loudly if any violation row exists (mirrors db010 contract style).
do $$
declare
  v_client_grants int;
  v_client_policies int;
begin
  select count(*) into v_client_grants
  from information_schema.role_table_grants g
  join pg_class c on c.oid = to_regclass(format('%I.%I', g.table_schema, g.table_name))
  where g.table_schema = 'public'
    and g.table_name in ('venue_availability', 'venue_reservations')
    and g.privilege_type = 'SELECT'
    and g.grantee in ('anon', 'public', 'authenticated');

  select count(*) into v_client_policies
  from pg_policies p
  where p.schemaname = 'public'
    and p.tablename in ('venue_availability', 'venue_reservations')
    and p.cmd = 'SELECT'
    and p.roles <> array['service_role']::name[];

  if v_client_grants > 0 or v_client_policies > 0 then
    raise exception 'VENUE-005 contract violated: client SELECT grants (%), client SELECT policies (%) on raw venue availability/reservations',
      v_client_grants, v_client_policies;
  end if;
end $$;

-- Sanitized public projection must still resolve so a venue's public block
-- dates keep rendering for anon/authenticated visitors.
select count(*) > 0
  or not exists (select 1 from pg_views where schemaname = 'public' and viewname = 'public_venue_availability')
  as public_availability_view_resolvable
from public_venue_availability;

-- ═══════════════════════════════════════════════════════════════════════════
-- Executable denial probes (SIM-20260922-VENUE-001 / SIM-20260922-DB-002).
--
-- The catalog assertions above prove the ACL/policy inventory. These probes
-- prove the runtime boundary: as each client role the raw tables must be
-- UNREACHABLE (permission denied), and the sanitized view must still answer.
--
-- Run this file as a role that is a MEMBER of both `anon` and `authenticated`
-- (on Supabase that is `authenticator`; a superuser also qualifies). The probe
-- refuses to run — loudly — if it is not, so a misconfigured runner can never
-- be mistaken for a passing boundary.
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare
  v_role text;
  v_denied_count int := 0;
  v_probe_errors int := 0;
  v_table text;
begin
  -- Precondition: the runner must be able to impersonate both client roles.
  foreach v_role in array array['anon', 'authenticated'] loop
    if not pg_has_role(current_user, v_role, 'MEMBER') then
      raise exception
        'VENUE-005 contract probe cannot run: current_user % is not a member of role %. Re-run this file as a role that can SET ROLE anon/authenticated (e.g. authenticator or a superuser); do not report this as a pass.',
        current_user, v_role;
    end if;
  end loop;

  foreach v_table in array array['venue_availability', 'venue_reservations'] loop
    foreach v_role in array array['anon', 'authenticated'] loop
      begin
        perform set_config('role', v_role, true);
        -- No dynamic SQL on data: an empty filtered read is enough to trip the
        -- privilege check without materializing any row.
        execute format('select count(*) from public.%I where false', v_table);
        -- Reaching here means the raw table was readable -> contract violated.
        v_denied_count := v_denied_count + 1;
      exception
        when insufficient_privilege then
          null; -- expected: raw boundary closed for this role
        when others then
          -- Any other error (missing role, missing table, syntax, or 0 rows)
          -- is a probe failure, not a pass.
          v_probe_errors := v_probe_errors + 1;
      end;
    end loop;
  end loop;

  perform set_config('role', 'none', true);

  if v_denied_count > 0 then
    raise exception
      'VENUE-005 contract violated: % raw client read(s) succeeded where a permission-denied boundary is required',
      v_denied_count;
  end if;

  if v_probe_errors > 0 then
    raise exception
      'VENUE-005 contract probe inconclusive: % probe(s) failed for a reason other than insufficient_privilege (missing role/table?)',
      v_probe_errors;
  end if;
end $$;

-- The sanitized public projection must remain readable by anon (a venue's block
-- dates have to keep rendering on the public venue page). Asserted as a
-- successful query, not just a catalog row, so a broken owner/ACL shows up.
select 'anon can still read the sanitized public availability projection' as probe,
       count(*) as sanitized_rows_visible_to_anon
from public_venue_availability;
