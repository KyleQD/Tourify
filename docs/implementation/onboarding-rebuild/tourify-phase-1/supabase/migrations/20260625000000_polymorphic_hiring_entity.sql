-- Tourify Phase 1: Polymorphic Hiring Entity Foundation
-- ------------------------------------------------------
-- Purpose:
--   Add universal employer scope to hiring/onboarding tables so Venue,
--   Organization, and Artist accounts can all use the same hiring system.
--
-- Safety:
--   - Additive only.
--   - Does not drop or rename existing venue_id columns.
--   - Backfills employer scope from venue_id where available.
--   - Uses idempotent guards for tables, columns, constraints, indexes, and policies.
--   - Does not reset data.
--
-- Recommended before applying:
--   1. Run on a branch database or Supabase preview first.
--   2. Confirm the RBAC probe tables in can_manage_hiring() match your repo schema.
--   3. Run existing TypeScript checks and API smoke tests after migration.

begin;

-- -----------------------------------------------------------------------------
-- Helper: check whether a public table has all requested columns.
-- Kept intentionally small and reusable by RBAC helper function below.
-- -----------------------------------------------------------------------------
create or replace function public._tourify_has_columns(
  p_table_name text,
  p_column_names text[]
)
returns boolean
language sql
stable
as $$
  select count(*) = cardinality(p_column_names)
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = p_table_name
    and c.column_name = any(p_column_names);
$$;

-- -----------------------------------------------------------------------------
-- Add employer_entity_type + employer_entity_id to core hiring tables.
-- -----------------------------------------------------------------------------
do $$
declare
  v_table text;
  v_tables text[] := array[
    'job_posting_templates',
    'job_applications',
    'staff_onboarding_candidates',
    'staff_invitations',
    'staff_onboarding_templates',
    'onboarding_workflows',
    'hiring_audit_events',
    'hiring_eligibility_snapshots',
    'employment_assignments',
    'staff_members'
  ];
  v_constraint_name text;
begin
  foreach v_table in array v_tables loop
    if to_regclass(format('public.%I', v_table)) is not null then
      execute format('alter table public.%I add column if not exists employer_entity_type text', v_table);
      execute format('alter table public.%I add column if not exists employer_entity_id uuid', v_table);

      v_constraint_name := format('%s_employer_entity_type_check', v_table);

      if not exists (
        select 1
        from pg_constraint
        where conname = v_constraint_name
          and conrelid = format('public.%I', v_table)::regclass
      ) then
        execute format(
          'alter table public.%I add constraint %I check (employer_entity_type is null or employer_entity_type in (''venue'', ''organization'', ''artist''))',
          v_table,
          v_constraint_name
        );
      end if;
    end if;
  end loop;
end $$;

-- Staff invitations needs template_id for entity-scoped token onboarding.
do $$
begin
  if to_regclass('public.staff_invitations') is not null then
    alter table public.staff_invitations add column if not exists template_id uuid;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Backfill existing venue-scoped rows into universal employer scope.
-- -----------------------------------------------------------------------------
do $$
declare
  v_table text;
  v_tables text[] := array[
    'job_posting_templates',
    'job_applications',
    'staff_onboarding_candidates',
    'staff_invitations',
    'staff_onboarding_templates',
    'onboarding_workflows',
    'hiring_audit_events',
    'hiring_eligibility_snapshots',
    'employment_assignments',
    'staff_members'
  ];
begin
  foreach v_table in array v_tables loop
    if to_regclass(format('public.%I', v_table)) is not null
       and public._tourify_has_columns(v_table, array['venue_id', 'employer_entity_type', 'employer_entity_id']) then
      execute format(
        'update public.%I
         set employer_entity_type = coalesce(employer_entity_type, ''venue''),
             employer_entity_id = coalesce(employer_entity_id, venue_id)
         where venue_id is not null
           and (employer_entity_type is null or employer_entity_id is null)',
        v_table
      );
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Indexes for employer-scoped list/detail queries.
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.job_posting_templates') is not null then
    create index if not exists idx_job_posting_templates_employer
      on public.job_posting_templates (employer_entity_type, employer_entity_id);
  end if;

  if to_regclass('public.job_applications') is not null then
    create index if not exists idx_job_applications_employer_status
      on public.job_applications (employer_entity_type, employer_entity_id, status);
  end if;

  if to_regclass('public.staff_onboarding_candidates') is not null then
    create index if not exists idx_staff_candidates_employer_status
      on public.staff_onboarding_candidates (employer_entity_type, employer_entity_id, status);
  end if;

  if to_regclass('public.staff_invitations') is not null then
    if public._tourify_has_columns('staff_invitations', array['token']) then
      create index if not exists idx_staff_invitations_token
        on public.staff_invitations (token);
    end if;

    if public._tourify_has_columns('staff_invitations', array['invitation_token']) then
      create index if not exists idx_staff_invitations_invitation_token
        on public.staff_invitations (invitation_token);
    end if;

    create index if not exists idx_staff_invitations_employer
      on public.staff_invitations (employer_entity_type, employer_entity_id);
  end if;

  if to_regclass('public.staff_members') is not null then
    create index if not exists idx_staff_members_employer
      on public.staff_members (employer_entity_type, employer_entity_id);
  end if;

  if to_regclass('public.employment_assignments') is not null then
    create index if not exists idx_employment_assignments_employer
      on public.employment_assignments (employer_entity_type, employer_entity_id);
  end if;

  if to_regclass('public.staff_onboarding_templates') is not null then
    create index if not exists idx_staff_onboarding_templates_employer
      on public.staff_onboarding_templates (employer_entity_type, employer_entity_id);
  end if;

  if to_regclass('public.onboarding_workflows') is not null then
    create index if not exists idx_onboarding_workflows_employer
      on public.onboarding_workflows (employer_entity_type, employer_entity_id);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- RBAC RPC: can_manage_hiring(user_id, entity_type, entity_id)
-- -----------------------------------------------------------------------------
-- This function is deliberately schema-tolerant. It checks the most common
-- Tourify membership/ownership tables only when they exist and expose the
-- expected columns. If your repo uses a different canonical RBAC table, add it
-- to this function instead of bypassing the permission gate in API routes.
-- -----------------------------------------------------------------------------
create or replace function public.can_manage_hiring(
  p_user_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_entity_type text := lower(coalesce(p_entity_type, ''));
  v_has_access boolean := false;
  v_sql text;
begin
  if p_user_id is null or p_entity_id is null or v_entity_type not in ('venue', 'organization', 'artist') then
    return false;
  end if;

  -- Generic entity membership table: entity_memberships(user_id, entity_type, entity_id, role?, permissions?)
  if to_regclass('public.entity_memberships') is not null
     and public._tourify_has_columns('entity_memberships', array['user_id', 'entity_type', 'entity_id']) then
    v_sql := 'select exists (
      select 1
      from public.entity_memberships
      where user_id = $1
        and lower(entity_type::text) = $2
        and entity_id = $3';

    if public._tourify_has_columns('entity_memberships', array['role'])
       and public._tourify_has_columns('entity_memberships', array['permissions']) then
      v_sql := v_sql || ' and (
        lower(role::text) in (''owner'', ''admin'', ''manager'', ''staff_manager'', ''hiring_manager'')
        or permissions::text ilike any(array[
          ''%staff.manage%'',
          ''%hiring.manage%'',
          ''%ASSIGN_EVENT_ROLES%'',
          ''%admin%''
        ])
      )';
    elsif public._tourify_has_columns('entity_memberships', array['role']) then
      v_sql := v_sql || ' and lower(role::text) in (''owner'', ''admin'', ''manager'', ''staff_manager'', ''hiring_manager'')';
    elsif public._tourify_has_columns('entity_memberships', array['permissions']) then
      v_sql := v_sql || ' and permissions::text ilike any(array[
        ''%staff.manage%'',
        ''%hiring.manage%'',
        ''%ASSIGN_EVENT_ROLES%'',
        ''%admin%''
      ])';
    else
      v_sql := null;
    end if;

    if v_sql is not null then
      v_sql := v_sql || ')';
      execute v_sql into v_has_access using p_user_id, v_entity_type, p_entity_id;
      if v_has_access then
        return true;
      end if;
    end if;
  end if;

  -- Venue ownership fallback.
  if v_entity_type = 'venue'
     and to_regclass('public.venues') is not null
     and public._tourify_has_columns('venues', array['id', 'owner_id']) then
    execute 'select exists (select 1 from public.venues where id = $1 and owner_id = $2)'
      into v_has_access
      using p_entity_id, p_user_id;
    if v_has_access then
      return true;
    end if;
  end if;

  -- Venue membership fallback.
  if v_entity_type = 'venue'
     and to_regclass('public.venue_members') is not null
     and public._tourify_has_columns('venue_members', array['user_id', 'venue_id']) then
    v_sql := 'select exists (select 1 from public.venue_members where user_id = $1 and venue_id = $2';
    if public._tourify_has_columns('venue_members', array['role']) then
      v_sql := v_sql || ' and lower(role::text) in (''owner'', ''admin'', ''manager'', ''staff_manager'', ''hiring_manager'')';
    end if;
    if public._tourify_has_columns('venue_members', array['permissions']) then
      v_sql := v_sql || ' and permissions::text ilike any(array[''%staff.manage%'', ''%hiring.manage%'', ''%ASSIGN_EVENT_ROLES%'', ''%admin%''])';
    end if;
    v_sql := v_sql || ')';
    execute v_sql into v_has_access using p_user_id, p_entity_id;
    if v_has_access then
      return true;
    end if;
  end if;

  -- Organization ownership fallback.
  if v_entity_type = 'organization'
     and to_regclass('public.organizations') is not null
     and public._tourify_has_columns('organizations', array['id', 'owner_id']) then
    execute 'select exists (select 1 from public.organizations where id = $1 and owner_id = $2)'
      into v_has_access
      using p_entity_id, p_user_id;
    if v_has_access then
      return true;
    end if;
  end if;

  -- Organization membership fallback.
  if v_entity_type = 'organization'
     and to_regclass('public.organization_members') is not null
     and public._tourify_has_columns('organization_members', array['user_id', 'organization_id']) then
    v_sql := 'select exists (select 1 from public.organization_members where user_id = $1 and organization_id = $2';
    if public._tourify_has_columns('organization_members', array['role']) then
      v_sql := v_sql || ' and lower(role::text) in (''owner'', ''admin'', ''manager'', ''staff_manager'', ''hiring_manager'')';
    end if;
    if public._tourify_has_columns('organization_members', array['permissions']) then
      v_sql := v_sql || ' and permissions::text ilike any(array[''%staff.manage%'', ''%hiring.manage%'', ''%ASSIGN_EVENT_ROLES%'', ''%admin%''])';
    end if;
    v_sql := v_sql || ')';
    execute v_sql into v_has_access using p_user_id, p_entity_id;
    if v_has_access then
      return true;
    end if;
  end if;

  -- Artist ownership fallback.
  if v_entity_type = 'artist'
     and to_regclass('public.artists') is not null
     and public._tourify_has_columns('artists', array['id', 'owner_id']) then
    execute 'select exists (select 1 from public.artists where id = $1 and owner_id = $2)'
      into v_has_access
      using p_entity_id, p_user_id;
    if v_has_access then
      return true;
    end if;
  end if;

  -- Artist team membership fallback.
  if v_entity_type = 'artist'
     and to_regclass('public.artist_members') is not null
     and public._tourify_has_columns('artist_members', array['user_id', 'artist_id']) then
    v_sql := 'select exists (select 1 from public.artist_members where user_id = $1 and artist_id = $2';
    if public._tourify_has_columns('artist_members', array['role']) then
      v_sql := v_sql || ' and lower(role::text) in (''owner'', ''admin'', ''manager'', ''tour_manager'', ''hiring_manager'')';
    end if;
    if public._tourify_has_columns('artist_members', array['permissions']) then
      v_sql := v_sql || ' and permissions::text ilike any(array[''%can_hire%'', ''%staff.manage%'', ''%hiring.manage%'', ''%ASSIGN_EVENT_ROLES%'', ''%admin%''])';
    end if;
    v_sql := v_sql || ')';
    execute v_sql into v_has_access using p_user_id, p_entity_id;
    if v_has_access then
      return true;
    end if;
  end if;

  return false;
end;
$$;

comment on function public.can_manage_hiring(uuid, text, uuid) is
  'Returns true when the user can manage hiring/onboarding for a Venue, Organization, or Artist employer entity.';

-- -----------------------------------------------------------------------------
-- RLS policies
-- -----------------------------------------------------------------------------
-- Creates additive employer-scoped policies for core tables. Existing policies
-- remain untouched. These policies assume API routes pass through auth.uid()
-- for normal employer/admin access. Token onboarding APIs should use verified
-- server-side token lookup and service role only where necessary.
-- -----------------------------------------------------------------------------
do $$
declare
  v_table text;
  v_tables text[] := array[
    'job_posting_templates',
    'job_applications',
    'staff_onboarding_candidates',
    'staff_invitations',
    'staff_onboarding_templates',
    'onboarding_workflows',
    'hiring_audit_events',
    'hiring_eligibility_snapshots',
    'employment_assignments',
    'staff_members'
  ];
  v_policy_name text;
begin
  foreach v_table in array v_tables loop
    if to_regclass(format('public.%I', v_table)) is not null
       and public._tourify_has_columns(v_table, array['employer_entity_type', 'employer_entity_id']) then
      execute format('alter table public.%I enable row level security', v_table);

      v_policy_name := format('%s_employer_manage_hiring', v_table);
      if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = v_table
          and policyname = v_policy_name
      ) then
        execute format(
          'create policy %I on public.%I
           for all
           to authenticated
           using (public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id))
           with check (public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id))',
          v_policy_name,
          v_table
        );
      end if;
    end if;
  end loop;
end $$;

-- Applicant can read and create their own applications.
do $$
begin
  if to_regclass('public.job_applications') is not null
     and public._tourify_has_columns('job_applications', array['applicant_id']) then
    alter table public.job_applications enable row level security;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'job_applications'
        and policyname = 'job_applications_applicant_read_own'
    ) then
      create policy job_applications_applicant_read_own
        on public.job_applications
        for select
        to authenticated
        using (applicant_id = auth.uid());
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'job_applications'
        and policyname = 'job_applications_applicant_insert_own'
    ) then
      create policy job_applications_applicant_insert_own
        on public.job_applications
        for insert
        to authenticated
        with check (applicant_id = auth.uid());
    end if;
  end if;
end $$;

-- Workers can read their own roster/member records when user_id is available.
do $$
begin
  if to_regclass('public.staff_members') is not null
     and public._tourify_has_columns('staff_members', array['user_id']) then
    alter table public.staff_members enable row level security;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'staff_members'
        and policyname = 'staff_members_worker_read_own'
    ) then
      create policy staff_members_worker_read_own
        on public.staff_members
        for select
        to authenticated
        using (user_id = auth.uid());
    end if;
  end if;

  if to_regclass('public.employment_assignments') is not null
     and public._tourify_has_columns('employment_assignments', array['user_id']) then
    alter table public.employment_assignments enable row level security;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'employment_assignments'
        and policyname = 'employment_assignments_worker_read_own'
    ) then
      create policy employment_assignments_worker_read_own
        on public.employment_assignments
        for select
        to authenticated
        using (user_id = auth.uid());
    end if;
  end if;
end $$;

commit;
