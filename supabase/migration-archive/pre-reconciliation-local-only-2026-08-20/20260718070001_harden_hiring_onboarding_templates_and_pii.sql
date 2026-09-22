-- Harden hiring/onboarding: drop permissive RLS, add can_view_hiring_pii,
-- employer sensitive vault, template snapshots, and onboarding_template FK.

begin;

-- -----------------------------------------------------------------------------
-- Schema repairs: onboarding_responses, candidate snapshots, job FK
-- -----------------------------------------------------------------------------
create table if not exists public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid,
  candidate_id uuid,
  user_id uuid references auth.users(id) on delete set null,
  responses jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.onboarding_responses
  add column if not exists candidate_id uuid,
  add column if not exists submitted_at timestamptz,
  add column if not exists completed_at timestamptz;

create index if not exists idx_onboarding_responses_candidate
  on public.onboarding_responses (candidate_id);

create index if not exists idx_onboarding_responses_invitation
  on public.onboarding_responses (invitation_id);

do $$
begin
  if to_regclass('public.staff_onboarding_candidates') is not null then
    alter table public.staff_onboarding_candidates
      add column if not exists template_version text,
      add column if not exists template_snapshot jsonb;
  end if;

  if to_regclass('public.staff_invitations') is not null then
    alter table public.staff_invitations
      add column if not exists template_version text,
      add column if not exists template_snapshot jsonb;
  end if;

  if to_regclass('public.staff_onboarding_templates') is not null then
    alter table public.staff_onboarding_templates
      add column if not exists version integer not null default 1;
  end if;
end $$;

-- FK: job_posting_templates.onboarding_template_id -> staff_onboarding_templates
do $$
begin
  if to_regclass('public.job_posting_templates') is not null
     and to_regclass('public.staff_onboarding_templates') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'job_posting_templates'
         and column_name = 'onboarding_template_id'
     )
     and not exists (
       select 1 from information_schema.table_constraints
       where table_schema = 'public'
         and table_name = 'job_posting_templates'
         and constraint_name = 'job_posting_templates_onboarding_template_id_fkey'
     ) then
    alter table public.job_posting_templates
      add constraint job_posting_templates_onboarding_template_id_fkey
      foreign key (onboarding_template_id)
      references public.staff_onboarding_templates(id)
      on delete set null
      not valid;
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- Employer-side sensitive vault (admin/owner reveal only)
-- -----------------------------------------------------------------------------
create table if not exists public.staff_onboarding_sensitive_vault (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null,
  employer_entity_type text not null check (employer_entity_type in ('venue', 'organization', 'artist')),
  employer_entity_id uuid not null,
  sensitive_envelope jsonb not null,
  field_summaries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (candidate_id)
);

comment on table public.staff_onboarding_sensitive_vault is
  'AES-encrypted sensitive onboarding answers. Reveal only via can_view_hiring_pii + audited API.';

do $$
begin
  if to_regclass('public.staff_onboarding_candidates') is not null
     and not exists (
       select 1 from information_schema.table_constraints
       where table_schema = 'public'
         and table_name = 'staff_onboarding_sensitive_vault'
         and constraint_name = 'staff_onboarding_sensitive_vault_candidate_id_fkey'
     ) then
    alter table public.staff_onboarding_sensitive_vault
      add constraint staff_onboarding_sensitive_vault_candidate_id_fkey
      foreign key (candidate_id)
      references public.staff_onboarding_candidates(id)
      on delete cascade
      not valid;
  end if;
end $$;

create index if not exists idx_staff_onboarding_sensitive_vault_employer
  on public.staff_onboarding_sensitive_vault (employer_entity_type, employer_entity_id);

-- -----------------------------------------------------------------------------
-- can_view_hiring_pii — narrower than can_manage_hiring (owner/admin only)
-- -----------------------------------------------------------------------------
create or replace function public.can_view_hiring_pii(
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
begin
  if p_user_id is null or p_entity_id is null or v_entity_type not in ('venue', 'organization', 'artist') then
    return false;
  end if;

  -- Direct ownership probes
  if v_entity_type = 'venue'
     and to_regclass('public.venue_profiles') is not null then
    begin
      execute 'select exists (select 1 from public.venue_profiles where id = $1 and (user_id = $2 or main_profile_id = $2))'
        into v_has_access using p_entity_id, p_user_id;
      if v_has_access then return true; end if;
    exception when others then null;
    end;
  end if;

  if v_entity_type = 'organization' then
    if p_entity_id = p_user_id then
      return true;
    end if;
    if to_regclass('public.organizer_accounts') is not null then
      begin
        execute 'select exists (select 1 from public.organizer_accounts where id = $1 and user_id = $2)'
          into v_has_access using p_entity_id, p_user_id;
        if v_has_access then return true; end if;
      exception when others then null;
      end;
    end if;
    if to_regclass('public.organizations') is not null then
      begin
        execute 'select exists (
          select 1 from public.organizations
          where id = $1 and (owner_id = $2 or user_id = $2 or created_by = $2)
        )' into v_has_access using p_entity_id, p_user_id;
        if v_has_access then return true; end if;
      exception when others then null;
      end;
    end if;
    if to_regprocedure('public.has_perm(uuid,uuid,text)') is not null then
      begin
        if public.has_perm(p_user_id, p_entity_id, 'org.manage') then
          return true;
        end if;
      exception when others then null;
      end;
    end if;
  end if;

  if v_entity_type = 'artist'
     and to_regclass('public.artist_profiles') is not null then
    begin
      execute 'select exists (
        select 1 from public.artist_profiles
        where id = $1 and (user_id = $2 or main_profile_id = $2)
      )' into v_has_access using p_entity_id, p_user_id;
      if v_has_access then return true; end if;
    exception when others then null;
    end;
  end if;

  -- Entity membership: owner/admin only (not hiring_manager / staff_manager)
  if to_regclass('public.entity_memberships') is not null then
    begin
      execute 'select exists (
        select 1 from public.entity_memberships
        where user_id = $1
          and lower(entity_type::text) = $2
          and entity_id = $3
          and lower(role::text) in (''owner'', ''admin'')
      )' into v_has_access using p_user_id, v_entity_type, p_entity_id;
      if v_has_access then return true; end if;
    exception when others then null;
    end;
  end if;

  -- Org members table
  if v_entity_type = 'organization' and to_regclass('public.org_members') is not null then
    begin
      execute 'select exists (
        select 1 from public.org_members
        where org_id = $1 and user_id = $2
          and lower(coalesce(role::text, '''')) in (''owner'', ''admin'')
      )' into v_has_access using p_entity_id, p_user_id;
      if v_has_access then return true; end if;
    exception when others then null;
    end;
  end if;

  return false;
end;
$$;

comment on function public.can_view_hiring_pii(uuid, text, uuid) is
  'True when the user is an owner/admin who may reveal hiring PII for the employer entity.';

grant execute on function public.can_view_hiring_pii(uuid, text, uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Drop permissive legacy hiring policies (OR-bypass with employer policies)
-- -----------------------------------------------------------------------------
do $$
declare
  v_policy record;
  v_tables text[] := array[
    'job_posting_templates',
    'job_applications',
    'staff_onboarding_candidates',
    'staff_onboarding_templates',
    'staff_invitations',
    'staff_documents',
    'staff_members',
    'onboarding_workflows',
    'onboarding_steps',
    'application_form_templates',
    'onboarding_responses',
    'staff_onboarding_sensitive_vault'
  ];
  v_permissive text[] := array[
    'read_all_job_postings',
    'read_all_job_apps',
    'read_all_candidates',
    'read_all_workflows',
    'read_all_steps',
    'read_all_app_forms',
    'read_all_staff',
    'insert_job_postings',
    'insert_job_apps',
    'insert_candidates',
    'update_job_postings',
    'update_job_apps',
    'update_candidates',
    'staff_onboarding_templates_auth',
    'staff_onboarding_templates_select',
    'staff_onboarding_templates_insert',
    'staff_onboarding_templates_update',
    'staff_onboarding_templates_delete'
  ];
  v_name text;
  v_table text;
begin
  foreach v_table in array v_tables loop
    if to_regclass(format('public.%I', v_table)) is null then
      continue;
    end if;

    foreach v_name in array v_permissive loop
      execute format('drop policy if exists %I on public.%I', v_name, v_table);
    end loop;

    -- Also drop any policy that is literally "authenticated can do anything"
    for v_policy in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = v_table
        and (
          qual = 'true'
          or with_check = 'true'
          or qual ilike '%auth.role()%authenticated%'
          or with_check ilike '%auth.role()%authenticated%'
        )
        and policyname not like '%employer_manage%'
        and policyname not like '%applicant%'
        and policyname not like '%worker_read%'
        and policyname not like '%pii%'
        and policyname not like '%global_template%'
        and policyname not like '%published%'
    loop
      execute format('drop policy if exists %I on public.%I', v_policy.policyname, v_table);
    end loop;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Re-assert employer-scoped + applicant + global-template policies
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
    'staff_members',
    'staff_documents'
  ];
  v_policy_name text;
begin
  foreach v_table in array v_tables loop
    if to_regclass(format('public.%I', v_table)) is null then
      continue;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = v_table
        and column_name = 'employer_entity_type'
    ) then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', v_table);

    v_policy_name := format('%s_employer_manage_hiring', v_table);
    execute format('drop policy if exists %I on public.%I', v_policy_name, v_table);
    execute format(
      'create policy %I on public.%I
       for all
       to authenticated
       using (public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id))
       with check (public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id))',
      v_policy_name,
      v_table
    );
  end loop;
end $$;

-- Published job postings: applicants can read published rows
do $$
begin
  if to_regclass('public.job_posting_templates') is not null then
    drop policy if exists job_posting_templates_public_published_read on public.job_posting_templates;
    create policy job_posting_templates_public_published_read
      on public.job_posting_templates
      for select
      to authenticated, anon
      using (status = 'published');
  end if;
end $$;

-- Applicants own applications
do $$
begin
  if to_regclass('public.job_applications') is not null then
    alter table public.job_applications enable row level security;
    drop policy if exists job_applications_applicant_read_own on public.job_applications;
    create policy job_applications_applicant_read_own
      on public.job_applications for select to authenticated
      using (applicant_id = auth.uid());

    drop policy if exists job_applications_applicant_insert_own on public.job_applications;
    create policy job_applications_applicant_insert_own
      on public.job_applications for insert to authenticated
      with check (applicant_id = auth.uid());

    drop policy if exists job_applications_applicant_update_own on public.job_applications;
    create policy job_applications_applicant_update_own
      on public.job_applications for update to authenticated
      using (applicant_id = auth.uid())
      with check (applicant_id = auth.uid());
  end if;
end $$;

-- Global onboarding templates: read-only clone sources
do $$
begin
  if to_regclass('public.staff_onboarding_templates') is not null then
    alter table public.staff_onboarding_templates enable row level security;

    drop policy if exists staff_onboarding_templates_global_select on public.staff_onboarding_templates;
    create policy staff_onboarding_templates_global_select
      on public.staff_onboarding_templates
      for select
      to authenticated
      using (
        employer_entity_id is null
        and employer_entity_type is null
      );

    drop policy if exists staff_onboarding_templates_employer_select on public.staff_onboarding_templates;
    create policy staff_onboarding_templates_employer_select
      on public.staff_onboarding_templates
      for select
      to authenticated
      using (
        employer_entity_id is not null
        and public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id)
      );

    drop policy if exists staff_onboarding_templates_employer_write on public.staff_onboarding_templates;
    create policy staff_onboarding_templates_employer_write
      on public.staff_onboarding_templates
      for all
      to authenticated
      using (
        employer_entity_id is not null
        and public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id)
      )
      with check (
        employer_entity_id is not null
        and public.can_manage_hiring(auth.uid(), employer_entity_type, employer_entity_id)
      );
  end if;
end $$;

-- Candidates: workers can read their own row
do $$
begin
  if to_regclass('public.staff_onboarding_candidates') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'staff_onboarding_candidates' and column_name = 'user_id'
     ) then
    drop policy if exists staff_onboarding_candidates_worker_read_own on public.staff_onboarding_candidates;
    create policy staff_onboarding_candidates_worker_read_own
      on public.staff_onboarding_candidates
      for select
      to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- onboarding_responses: employer manage via candidate join + own user
alter table public.onboarding_responses enable row level security;

drop policy if exists onboarding_responses_own_read on public.onboarding_responses;
create policy onboarding_responses_own_read
  on public.onboarding_responses
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists onboarding_responses_employer_manage on public.onboarding_responses;
create policy onboarding_responses_employer_manage
  on public.onboarding_responses
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.staff_onboarding_candidates c
      where c.id = onboarding_responses.candidate_id
        and public.can_manage_hiring(auth.uid(), c.employer_entity_type, c.employer_entity_id)
    )
  )
  with check (
    exists (
      select 1
      from public.staff_onboarding_candidates c
      where c.id = onboarding_responses.candidate_id
        and public.can_manage_hiring(auth.uid(), c.employer_entity_type, c.employer_entity_id)
    )
  );

-- Sensitive vault: no direct SELECT of ciphertext except PII-capable admins
alter table public.staff_onboarding_sensitive_vault enable row level security;

revoke all on public.staff_onboarding_sensitive_vault from anon, authenticated;
grant select, insert, update, delete on public.staff_onboarding_sensitive_vault to authenticated;
grant all on public.staff_onboarding_sensitive_vault to service_role;

drop policy if exists staff_onboarding_sensitive_vault_pii_admin on public.staff_onboarding_sensitive_vault;
create policy staff_onboarding_sensitive_vault_pii_admin
  on public.staff_onboarding_sensitive_vault
  for all
  to authenticated
  using (public.can_view_hiring_pii(auth.uid(), employer_entity_type, employer_entity_id))
  with check (public.can_view_hiring_pii(auth.uid(), employer_entity_type, employer_entity_id));

-- Service role full access (explicit)
drop policy if exists staff_onboarding_sensitive_vault_service on public.staff_onboarding_sensitive_vault;
create policy staff_onboarding_sensitive_vault_service
  on public.staff_onboarding_sensitive_vault
  for all
  to service_role
  using (true)
  with check (true);

commit;
