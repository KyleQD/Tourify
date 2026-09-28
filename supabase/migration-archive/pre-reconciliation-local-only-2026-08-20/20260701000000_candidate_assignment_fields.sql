set client_min_messages = warning;

-- Pre-roster assignment fields for onboarding candidates.
--
-- Admins can assign an intended event, manager, shift, and role to a candidate
-- from the Candidates page before onboarding completes (i.e. before a
-- staff_members / employment_assignments row is finalized). These columns hold
-- that intent and are synced into employment_assignments once available.
--
-- Also tracks when the onboarding invite notification was last sent.
--
-- Safety: additive only. FKs are added NOT VALID with existence guards so the
-- migration never fails on legacy/orphaned data or environment differences.

do $candidate_assignment_fields$
begin
  if to_regclass('public.staff_onboarding_candidates') is null then
    return;
  end if;

  alter table public.staff_onboarding_candidates
    add column if not exists assigned_manager_id uuid;

  alter table public.staff_onboarding_candidates
    add column if not exists assigned_manager_name text;

  alter table public.staff_onboarding_candidates
    add column if not exists intended_event_id uuid;

  alter table public.staff_onboarding_candidates
    add column if not exists intended_shift_id uuid;

  alter table public.staff_onboarding_candidates
    add column if not exists role_template_id uuid;

  alter table public.staff_onboarding_candidates
    add column if not exists onboarding_notification_sent_at timestamptz;

  -- FK: assigned_manager_id -> auth.users(id)
  if not exists (
    select 1
    from information_schema.key_column_usage kcu
    join information_schema.table_constraints tc
      on tc.constraint_name = kcu.constraint_name
     and tc.constraint_schema = kcu.constraint_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and kcu.table_schema = 'public'
      and kcu.table_name = 'staff_onboarding_candidates'
      and kcu.column_name = 'assigned_manager_id'
  ) then
    alter table public.staff_onboarding_candidates
      add constraint staff_onboarding_candidates_assigned_manager_id_fkey
      foreign key (assigned_manager_id)
      references auth.users(id) on delete set null
      not valid;
  end if;

  -- FK: intended_event_id -> events(id)
  if to_regclass('public.events') is not null
     and not exists (
       select 1
       from information_schema.key_column_usage kcu
       join information_schema.table_constraints tc
         on tc.constraint_name = kcu.constraint_name
        and tc.constraint_schema = kcu.constraint_schema
       where tc.constraint_type = 'FOREIGN KEY'
         and kcu.table_schema = 'public'
         and kcu.table_name = 'staff_onboarding_candidates'
         and kcu.column_name = 'intended_event_id'
     )
  then
    alter table public.staff_onboarding_candidates
      add constraint staff_onboarding_candidates_intended_event_id_fkey
      foreign key (intended_event_id)
      references public.events(id) on delete set null
      not valid;
  end if;

  -- FK: intended_shift_id -> staff_shifts(id)
  if to_regclass('public.staff_shifts') is not null
     and not exists (
       select 1
       from information_schema.key_column_usage kcu
       join information_schema.table_constraints tc
         on tc.constraint_name = kcu.constraint_name
        and tc.constraint_schema = kcu.constraint_schema
       where tc.constraint_type = 'FOREIGN KEY'
         and kcu.table_schema = 'public'
         and kcu.table_name = 'staff_onboarding_candidates'
         and kcu.column_name = 'intended_shift_id'
     )
  then
    alter table public.staff_onboarding_candidates
      add constraint staff_onboarding_candidates_intended_shift_id_fkey
      foreign key (intended_shift_id)
      references public.staff_shifts(id) on delete set null
      not valid;
  end if;

  -- FK: role_template_id -> role_templates(id)
  if to_regclass('public.role_templates') is not null
     and not exists (
       select 1
       from information_schema.key_column_usage kcu
       join information_schema.table_constraints tc
         on tc.constraint_name = kcu.constraint_name
        and tc.constraint_schema = kcu.constraint_schema
       where tc.constraint_type = 'FOREIGN KEY'
         and kcu.table_schema = 'public'
         and kcu.table_name = 'staff_onboarding_candidates'
         and kcu.column_name = 'role_template_id'
     )
  then
    alter table public.staff_onboarding_candidates
      add constraint staff_onboarding_candidates_role_template_id_fkey
      foreign key (role_template_id)
      references public.role_templates(id) on delete set null
      not valid;
  end if;
end $candidate_assignment_fields$;

create index if not exists idx_candidates_intended_event
  on public.staff_onboarding_candidates(intended_event_id);

create index if not exists idx_candidates_assigned_manager
  on public.staff_onboarding_candidates(assigned_manager_id);
