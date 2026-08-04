-- Backfill roster assignments so staff assigned to events/tours are visible in
-- scoped roster listings.
--
-- Context: assignments made via /api/hiring/roster/:memberId/assignment were
-- not durably queryable on drifted databases:
--   * tour_id was dropped (staff_shift_assignments had no tour_id column)
--   * employment_assignments was only updated when an event_id was passed and
--     an existing row matched — otherwise the update silently no-op'd
--
-- This migration rebuilds the missing links additively and idempotently from
-- two sources, each guarded by information_schema checks so it is safe on any
-- schema-drift state:
--
--   Part A — staff_shifts (always available): every shift assignment implies an
--            event-level roster assignment. Ensures employment_assignments rows
--            exist and are linked (staff_member_id / staff_shift_id / event_id).
--   Part B — hiring_audit_events replay (only when the audit table carries the
--            event_type / subject_id columns): restores staff_shift_assignments
--            rows and tour associations that shift stubs alone cannot rebuild.
--
-- Nothing is deleted or overwritten: updates only fill NULL columns and inserts
-- are guarded by NOT EXISTS.

begin;

-- ---------------------------------------------------------------------------
-- Part A — derive employment_assignments from staff_shifts
-- ---------------------------------------------------------------------------
do $$
declare
  shift_row record;
  member_row record;
  now_ts timestamptz := now();
begin
  if to_regclass('public.staff_shifts') is null
     or to_regclass('public.staff_members') is null
     or to_regclass('public.employment_assignments') is null then
    return;
  end if;

  for shift_row in
    select ss.id as shift_id, ss.event_id, ss.staff_member_id
    from public.staff_shifts ss
    where ss.event_id is not null
      and ss.staff_member_id is not null
  loop
    select sm.user_id, sm.venue_id, sm.role, sm.department, sm.permissions,
           sm.employer_entity_type, sm.employer_entity_id
      into member_row
      from public.staff_members sm
     where sm.id = shift_row.staff_member_id
     limit 1;

    if member_row.user_id is null
       or member_row.employer_entity_type is null
       or member_row.employer_entity_id is null then
      continue;
    end if;

    if exists (
      select 1
      from public.employment_assignments ea
      where ea.user_id = member_row.user_id
        and ea.employer_entity_type = member_row.employer_entity_type
        and ea.employer_entity_id = member_row.employer_entity_id
    ) then
      -- Link only where NULL; never overwrite an existing association.
      update public.employment_assignments ea
         set staff_member_id = coalesce(ea.staff_member_id, shift_row.staff_member_id),
             staff_shift_id = coalesce(ea.staff_shift_id, shift_row.shift_id),
             event_id = coalesce(ea.event_id, shift_row.event_id),
             updated_at = now_ts
       where ea.user_id = member_row.user_id
         and ea.employer_entity_type = member_row.employer_entity_type
         and ea.employer_entity_id = member_row.employer_entity_id
         and (
           ea.staff_member_id is null
           or ea.staff_shift_id is null
           or ea.event_id is null
         );
    else
      insert into public.employment_assignments (
        user_id, staff_member_id, staff_shift_id,
        employer_entity_type, employer_entity_id,
        venue_id, role_title, department, permissions,
        status, source, event_id,
        starts_at, created_at, updated_at
      )
      select
        member_row.user_id, shift_row.staff_member_id, shift_row.shift_id,
        member_row.employer_entity_type, member_row.employer_entity_id,
        member_row.venue_id, member_row.role,
        member_row.department, coalesce(member_row.permissions, '{}'::jsonb),
        'invited', 'roster_assignment_backfill', shift_row.event_id,
        now_ts, now_ts, now_ts
      where not exists (
        select 1 from public.employment_assignments ea
        where ea.user_id = member_row.user_id
          and ea.employer_entity_type = member_row.employer_entity_type
          and ea.employer_entity_id = member_row.employer_entity_id
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Part B — replay hiring_audit_events (only on databases where the audit table
-- carries the event_type / subject_id columns)
-- ---------------------------------------------------------------------------

-- Safely extract a uuid from audit metadata; returns null for missing or
-- malformed values instead of aborting the backfill.
create or replace function public._tmp_audit_uuid(metadata jsonb, key text)
returns uuid
language sql
immutable
as $$
  select case
    when metadata ->> key ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then (metadata ->> key)::uuid
    else null
  end
$$;

do $$
declare
  audit_row record;
  member_user_id uuid;
  now_ts timestamptz := now();
  audit_has_subject_columns boolean;
  has_ssa_tour_id boolean;
  has_ea_tour_id boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'hiring_audit_events' and column_name = 'event_type'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'hiring_audit_events' and column_name = 'subject_id'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'hiring_audit_events' and column_name = 'subject_type'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'hiring_audit_events' and column_name = 'employer_entity_type'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'hiring_audit_events' and column_name = 'employer_entity_id'
  ) into audit_has_subject_columns;

  if not audit_has_subject_columns
     or to_regclass('public.hiring_audit_events') is null
     or to_regclass('public.staff_shift_assignments') is null
     or to_regclass('public.staff_members') is null then
    return;
  end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_shift_assignments' and column_name = 'tour_id'
  ) into has_ssa_tour_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'employment_assignments' and column_name = 'tour_id'
  ) into has_ea_tour_id;

  for audit_row in
    select
      hae.employer_entity_type,
      hae.employer_entity_id,
      hae.actor_user_id,
      hae.subject_id,
      hae.created_at,
      public._tmp_audit_uuid(hae.metadata, 'event_id') as event_id,
      public._tmp_audit_uuid(hae.metadata, 'tour_id') as tour_id,
      public._tmp_audit_uuid(hae.metadata, 'shift_id') as shift_id,
      nullif(hae.metadata ->> 'zone', '') as zone
    from public.hiring_audit_events hae
    where hae.event_type = 'roster_member_assigned'
      and hae.subject_type = 'staff_member'
    order by hae.created_at asc
  loop
    if audit_row.event_id is null and audit_row.shift_id is null and audit_row.tour_id is null then
      continue;
    end if;

    -- 1) Replay into staff_shift_assignments when no equivalent row exists.
    --    (Separate static queries per drift variant: a missing tour_id column
    --     would fail at plan time even behind a runtime short-circuit.)
    declare
      ssa_exists boolean;
    begin
      if has_ssa_tour_id then
        select exists (
          select 1
          from public.staff_shift_assignments ssa
          where ssa.staff_member_id = audit_row.subject_id
            and ssa.event_id is not distinct from audit_row.event_id
            and ssa.shift_id is not distinct from audit_row.shift_id
            and ssa.tour_id is not distinct from audit_row.tour_id
            and ssa.employer_entity_type = audit_row.employer_entity_type
            and ssa.employer_entity_id = audit_row.employer_entity_id
        ) into ssa_exists;
      else
        select exists (
          select 1
          from public.staff_shift_assignments ssa
          where ssa.staff_member_id = audit_row.subject_id
            and ssa.event_id is not distinct from audit_row.event_id
            and ssa.shift_id is not distinct from audit_row.shift_id
            and ssa.employer_entity_type = audit_row.employer_entity_type
            and ssa.employer_entity_id = audit_row.employer_entity_id
        ) into ssa_exists;
      end if;

      if not ssa_exists then
        if has_ssa_tour_id then
          insert into public.staff_shift_assignments (
            staff_member_id, event_id, tour_id, shift_id, zone,
            assigned_by, employer_entity_type, employer_entity_id, notes, created_at
          ) values (
            audit_row.subject_id, audit_row.event_id, audit_row.tour_id, audit_row.shift_id, audit_row.zone,
            audit_row.actor_user_id, audit_row.employer_entity_type, audit_row.employer_entity_id,
            'Backfilled from hiring_audit_events', audit_row.created_at
          );
        else
          insert into public.staff_shift_assignments (
            staff_member_id, event_id, shift_id, zone,
            assigned_by, employer_entity_type, employer_entity_id, notes, created_at
          ) values (
            audit_row.subject_id, audit_row.event_id, audit_row.shift_id, audit_row.zone,
            audit_row.actor_user_id, audit_row.employer_entity_type, audit_row.employer_entity_id,
            'Backfilled from hiring_audit_events', audit_row.created_at
          );
        end if;
      end if;
    end;

    -- 2) Sync employment_assignments so event/tour-scoped roster listings can
    --    see the member. Updates only fill NULL columns.
    if to_regclass('public.employment_assignments') is null then
      continue;
    end if;

    select sm.user_id into member_user_id
      from public.staff_members sm
     where sm.id = audit_row.subject_id
     limit 1;

    if member_user_id is null then
      continue;
    end if;

    if has_ea_tour_id then
      update public.employment_assignments ea
         set staff_member_id = coalesce(ea.staff_member_id, audit_row.subject_id),
             event_id = coalesce(ea.event_id, audit_row.event_id),
             tour_id = coalesce(ea.tour_id, audit_row.tour_id),
             updated_at = now_ts
       where ea.user_id = member_user_id
         and ea.employer_entity_type = audit_row.employer_entity_type
         and ea.employer_entity_id = audit_row.employer_entity_id
         and (
           ea.staff_member_id is null
           or (audit_row.event_id is not null and ea.event_id is null)
           or (audit_row.tour_id is not null and ea.tour_id is null)
         );
    else
      update public.employment_assignments ea
         set staff_member_id = coalesce(ea.staff_member_id, audit_row.subject_id),
             event_id = coalesce(ea.event_id, audit_row.event_id),
             updated_at = now_ts
       where ea.user_id = member_user_id
         and ea.employer_entity_type = audit_row.employer_entity_type
         and ea.employer_entity_id = audit_row.employer_entity_id
         and (
           ea.staff_member_id is null
           or (audit_row.event_id is not null and ea.event_id is null)
         );
    end if;
  end loop;
end $$;

drop function if exists public._tmp_audit_uuid(jsonb, text);

commit;
