set client_min_messages = warning;

begin;

-- Connected Worker Work Hub
--
-- Keep application, roster, assignment, and schedule state independent. Existing
-- schedule-less assignment shells are retained for audit/history, but classified
-- as legacy engagements so clients never describe roster approval as a shift.

alter table if exists public.employment_assignments
  add column if not exists job_application_id uuid,
  add column if not exists job_posting_id uuid,
  add column if not exists tour_id uuid,
  add column if not exists assignment_kind text;

do $$
begin
  if to_regclass('public.job_applications') is not null
     and not exists (
       select 1 from pg_constraint
       where conrelid = 'public.employment_assignments'::regclass
         and conname = 'employment_assignments_job_application_id_fkey'
     ) then
    alter table public.employment_assignments
      add constraint employment_assignments_job_application_id_fkey
      foreign key (job_application_id)
      references public.job_applications(id)
      on delete set null;
  end if;

  if to_regclass('public.job_posting_templates') is not null
     and not exists (
       select 1 from pg_constraint
       where conrelid = 'public.employment_assignments'::regclass
         and conname = 'employment_assignments_job_posting_id_fkey'
     ) then
    alter table public.employment_assignments
      add constraint employment_assignments_job_posting_id_fkey
      foreign key (job_posting_id)
      references public.job_posting_templates(id)
      on delete set null;
  end if;

  if to_regclass('public.tours') is not null
     and not exists (
       select 1 from pg_constraint
       where conrelid = 'public.employment_assignments'::regclass
         and conname = 'employment_assignments_tour_id_fkey'
     ) then
    alter table public.employment_assignments
      add constraint employment_assignments_tour_id_fkey
      foreign key (tour_id)
      references public.tours(id)
      on delete set null;
  end if;
end $$;

update public.employment_assignments
set assignment_kind = case
  when staff_shift_id is not null then 'shift'
  when event_id is not null or tour_id is not null then 'event'
  else 'legacy_engagement'
end
where assignment_kind is null
   or assignment_kind not in ('event', 'shift', 'legacy_engagement');

alter table if exists public.employment_assignments
  alter column assignment_kind set default 'legacy_engagement',
  alter column assignment_kind set not null,
  drop constraint if exists employment_assignments_assignment_kind_check;

alter table if exists public.employment_assignments
  add constraint employment_assignments_assignment_kind_check
  check (assignment_kind in ('event', 'shift', 'legacy_engagement'));

alter table if exists public.employment_assignments
  drop constraint if exists employment_assignments_status_check;

alter table if exists public.employment_assignments
  add constraint employment_assignments_status_check
  check (status in ('invited', 'confirmed', 'active', 'completed', 'cancelled', 'declined'));

alter table if exists public.staff_shifts
  add column if not exists deleted_at timestamptz;

alter table if exists public.staff_shifts
  drop constraint if exists staff_shifts_status_check;

alter table if exists public.staff_shifts
  add constraint staff_shifts_status_check
  check (status in ('draft', 'scheduled', 'published', 'confirmed', 'completed', 'cancelled', 'declined'));

create or replace function public.respond_to_work_assignment(
  p_assignment_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_assignment public.employment_assignments%rowtype;
  v_next_status text;
  v_shift_status text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_action not in ('accept', 'decline') then
    raise exception 'Invalid assignment response' using errcode = '22023';
  end if;

  select * into v_assignment
  from public.employment_assignments
  where id = p_assignment_id
    and user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'Assignment not found' using errcode = 'P0002';
  end if;

  v_next_status := case when p_action = 'accept' then 'confirmed' else 'declined' end;
  v_shift_status := case when p_action = 'accept' then 'confirmed' else 'declined' end;

  if v_assignment.status = v_next_status then
    return jsonb_build_object(
      'assignment_id', v_assignment.id,
      'shift_id', v_assignment.staff_shift_id,
      'status', v_next_status,
      'idempotent', true
    );
  end if;
  if v_assignment.status <> 'invited' then
    raise exception 'This assignment can no longer be updated' using errcode = '23514';
  end if;

  update public.employment_assignments
  set status = v_next_status, updated_at = now()
  where id = v_assignment.id;

  if v_assignment.staff_shift_id is not null then
    update public.staff_shifts
    set status = v_shift_status, updated_at = now()
    where id = v_assignment.staff_shift_id
      and deleted_at is null;
  end if;

  return jsonb_build_object(
    'assignment_id', v_assignment.id,
    'shift_id', v_assignment.staff_shift_id,
    'status', v_next_status,
    'idempotent', false
  );
end;
$$;

revoke all on function public.respond_to_work_assignment(uuid, text) from public;
grant execute on function public.respond_to_work_assignment(uuid, text) to authenticated;

create index if not exists employment_assignments_job_application_idx
  on public.employment_assignments (job_application_id)
  where job_application_id is not null;

create index if not exists employment_assignments_job_posting_idx
  on public.employment_assignments (job_posting_id)
  where job_posting_id is not null;

create index if not exists employment_assignments_tour_idx
  on public.employment_assignments (tour_id)
  where tour_id is not null;

with ranked_shift_links as (
  select
    id,
    row_number() over (
      partition by staff_shift_id
      order by updated_at desc nulls last, created_at desc nulls last, id
    ) as semantic_rank
  from public.employment_assignments
  where staff_shift_id is not null
)
update public.employment_assignments assignment
set staff_shift_id = null,
    assignment_kind = case
      when assignment.event_id is not null or assignment.tour_id is not null then 'event'
      else 'legacy_engagement'
    end,
    updated_at = now()
from ranked_shift_links ranked
where ranked.id = assignment.id
  and ranked.semantic_rank > 1;

create unique index if not exists employment_assignments_staff_shift_semantic_key
  on public.employment_assignments (staff_shift_id)
  where staff_shift_id is not null;

create index if not exists staff_shifts_active_worker_schedule_idx
  on public.staff_shifts (staff_member_id, shift_date, start_time)
  where deleted_at is null;

-- Repair detached assignment shells without changing their identifiers or history.
-- The deterministic ordering favors the newest applicable roster/application row.
with roster_candidates as (
  select distinct on (assignment.id)
    assignment.id as assignment_id,
    member.id as staff_member_id,
    member.position,
    member.role,
    member.department
  from public.employment_assignments assignment
  join public.staff_members member
    on member.user_id = assignment.user_id
   and (
     (
       member.employer_entity_type = assignment.employer_entity_type
       and member.employer_entity_id = assignment.employer_entity_id
     )
     or (
       assignment.employer_entity_type = 'venue'
       and member.venue_id = assignment.employer_entity_id
     )
   )
  where assignment.staff_member_id is null
  order by
    assignment.id,
    case member.status when 'active' then 0 when 'pending' then 1 else 2 end,
    member.updated_at desc nulls last,
    member.created_at desc
)
update public.employment_assignments assignment
set staff_member_id = roster.staff_member_id,
    role_title = case
      when assignment.role_title is null or lower(assignment.role_title) in ('staff', 'crew')
        then coalesce(roster.position, roster.role, assignment.role_title)
      else assignment.role_title
    end,
    position = case
      when assignment.position is null or lower(assignment.position) in ('staff', 'crew')
        then coalesce(roster.position, roster.role, assignment.position)
      else assignment.position
    end,
    department = case
      when assignment.department is null or lower(assignment.department) in ('general', 'staff')
        then coalesce(roster.department, assignment.department)
      else assignment.department
    end,
    updated_at = greatest(coalesce(assignment.updated_at, assignment.created_at, now()), now())
from roster_candidates roster
where assignment.id = roster.assignment_id;

with application_candidates as (
  select distinct on (assignment.id)
    assignment.id as assignment_id,
    candidate.id as application_id,
    candidate.job_posting_id
  from public.employment_assignments assignment
  join public.job_applications candidate
    on candidate.applicant_id = assignment.user_id
   and candidate.employer_entity_type = assignment.employer_entity_type
   and candidate.employer_entity_id = assignment.employer_entity_id
   and candidate.status in ('approved', 'accepted')
  where assignment.job_application_id is null
  order by
    assignment.id,
    candidate.applied_at desc nulls last,
    candidate.created_at desc
)
update public.employment_assignments assignment
set job_application_id = application.application_id,
    job_posting_id = coalesce(assignment.job_posting_id, application.job_posting_id),
    updated_at = greatest(coalesce(assignment.updated_at, assignment.created_at, now()), now())
from application_candidates application
where assignment.id = application.assignment_id;

create table if not exists public.workforce_channel_links (
  id uuid primary key default gen_random_uuid(),
  employer_entity_type text not null
    check (employer_entity_type in ('venue', 'organization', 'artist')),
  employer_entity_id uuid not null,
  staff_member_id uuid not null references public.staff_members(id) on delete cascade,
  coordinator_thread_id uuid not null references public.group_threads(id) on delete cascade,
  channel_kind text not null default 'coordinator'
    check (channel_kind in ('coordinator', 'team')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_member_id, channel_kind)
);

create index if not exists workforce_channel_links_employer_idx
  on public.workforce_channel_links (employer_entity_type, employer_entity_id);

create index if not exists workforce_channel_links_thread_idx
  on public.workforce_channel_links (coordinator_thread_id);

alter table public.workforce_channel_links enable row level security;

drop policy if exists workforce_channel_links_worker_read on public.workforce_channel_links;
create policy workforce_channel_links_worker_read
  on public.workforce_channel_links
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.staff_members member
      where member.id = workforce_channel_links.staff_member_id
        and member.user_id = (select auth.uid())
        and member.status in ('pending', 'active')
    )
  );

drop policy if exists workforce_channel_links_manager_manage on public.workforce_channel_links;
create policy workforce_channel_links_manager_manage
  on public.workforce_channel_links
  for all
  to authenticated
  using (
    public.can_manage_hiring(
      (select auth.uid()),
      employer_entity_type,
      employer_entity_id
    )
  )
  with check (
    public.can_manage_hiring(
      (select auth.uid()),
      employer_entity_type,
      employer_entity_id
    )
  );

grant select on public.workforce_channel_links to authenticated;
grant insert, update, delete on public.workforce_channel_links to authenticated;

comment on table public.workforce_channel_links is
  'Canonical link from an employer roster relationship to worker-visible coordinator/team group threads.';

comment on column public.employment_assignments.assignment_kind is
  'Operational scope only: event, shift, or a retained schedule-less legacy engagement. Roster approval lives in staff_members.';

create or replace function public.ensure_workforce_coordinator_channel(p_staff_member_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.staff_members%rowtype;
  v_thread_id uuid;
  v_manager_id uuid;
  v_thread_name text;
begin
  select * into v_member
  from public.staff_members
  where id = p_staff_member_id;

  if not found or v_member.user_id is null then
    return null;
  end if;

  select link.coordinator_thread_id into v_thread_id
  from public.workforce_channel_links link
  where link.staff_member_id = v_member.id
    and link.channel_kind = 'coordinator';

  if v_member.status not in ('pending', 'active') then
    if v_thread_id is not null then
      update public.thread_members
      set left_at = coalesce(left_at, now())
      where thread_id = v_thread_id
        and user_id = v_member.user_id;
    end if;
    return v_thread_id;
  end if;

  select candidate.user_id into v_manager_id
  from (
    select v_member.assigned_manager_id as user_id, 0 as priority
    union all
    select account.user_id, 1
    from public.organizer_accounts account
    where v_member.employer_entity_type = 'organization'
      and account.id = v_member.employer_entity_id
    union all
    select profile.user_id, 1
    from public.venue_profiles profile
    where v_member.employer_entity_type = 'venue'
      and profile.id = v_member.employer_entity_id
    union all
    select profile.user_id, 1
    from public.artist_profiles profile
    where v_member.employer_entity_type = 'artist'
      and profile.id = v_member.employer_entity_id
  ) candidate
  where candidate.user_id is not null
    and public.can_manage_hiring(
      candidate.user_id,
      v_member.employer_entity_type,
      v_member.employer_entity_id
    )
  order by candidate.priority
  limit 1;

  if v_thread_id is null and v_manager_id is not null then
    v_thread_name := concat_ws(
      ' · ',
      coalesce(nullif(v_member.position, ''), nullif(v_member.role, ''), 'Work'),
      'Coordinator'
    );

    insert into public.group_threads (
      name,
      description,
      thread_type,
      created_by,
      context_type,
      context_id,
      is_admin_only
    ) values (
      v_thread_name,
      'Private work coordination channel',
      'staff',
      v_manager_id,
      'workforce_roster',
      v_member.id,
      false
    )
    returning id into v_thread_id;

    insert into public.workforce_channel_links (
      employer_entity_type,
      employer_entity_id,
      staff_member_id,
      coordinator_thread_id,
      channel_kind,
      created_by
    ) values (
      v_member.employer_entity_type,
      v_member.employer_entity_id,
      v_member.id,
      v_thread_id,
      'coordinator',
      v_manager_id
    )
    on conflict (staff_member_id, channel_kind) do update
      set coordinator_thread_id = excluded.coordinator_thread_id,
          updated_at = now();
  end if;

  if v_thread_id is not null then
    if v_manager_id is not null then
      insert into public.thread_members (thread_id, user_id, role, joined_at, left_at)
      values (v_thread_id, v_manager_id, 'owner', now(), null)
      on conflict (thread_id, user_id) do update
        set role = 'owner', left_at = null;
    end if;

    if v_member.employer_entity_type = 'organization' then
      insert into public.thread_members (thread_id, user_id, role, joined_at, left_at)
      select
        v_thread_id,
        manager.user_id,
        'admin',
        now(),
        null
      from public.organizer_accounts account
      join public.org_members manager on manager.org_id = account.ops_org_id
      where account.id = v_member.employer_entity_id
        and manager.role in ('owner', 'admin', 'production')
        and manager.user_id <> v_member.user_id
      on conflict (thread_id, user_id) do update
        set role = case when public.thread_members.role = 'owner' then 'owner' else 'admin' end,
            left_at = null;
    end if;

    insert into public.thread_members (thread_id, user_id, role, joined_at, left_at)
    values (v_thread_id, v_member.user_id, 'member', now(), null)
    on conflict (thread_id, user_id) do update
      set left_at = null;
  end if;

  return v_thread_id;
end;
$$;

revoke all on function public.ensure_workforce_coordinator_channel(uuid) from public;

create or replace function public.sync_workforce_coordinator_channel_from_roster()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.ensure_workforce_coordinator_channel(new.id);
  return new;
end;
$$;

revoke all on function public.sync_workforce_coordinator_channel_from_roster() from public;

drop trigger if exists trg_staff_members_coordinator_channel on public.staff_members;
create trigger trg_staff_members_coordinator_channel
after insert or update of status, user_id, assigned_manager_id, position, role
on public.staff_members
for each row
execute function public.sync_workforce_coordinator_channel_from_roster();

do $$
declare
  v_member_id uuid;
begin
  for v_member_id in
    select member.id
    from public.staff_members member
    where member.user_id is not null
      and member.status in ('pending', 'active')
  loop
    perform public.ensure_workforce_coordinator_channel(v_member_id);
  end loop;
end $$;

create table if not exists public.work_mode_publication_audiences (
  publication_id uuid not null references public.work_mode_publications(id) on delete cascade,
  worker_user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (publication_id, worker_user_id)
);

create index if not exists work_mode_publication_audiences_worker_idx
  on public.work_mode_publication_audiences (worker_user_id, publication_id);

alter table public.work_mode_publication_audiences enable row level security;

drop policy if exists work_mode_publication_audiences_worker_read on public.work_mode_publication_audiences;
create policy work_mode_publication_audiences_worker_read
  on public.work_mode_publication_audiences for select to authenticated
  using (worker_user_id = (select auth.uid()));

drop policy if exists work_mode_publication_audiences_publisher_manage on public.work_mode_publication_audiences;
create policy work_mode_publication_audiences_publisher_manage
  on public.work_mode_publication_audiences for all to authenticated
  using (
    exists (
      select 1 from public.work_mode_publications publication
      where publication.id = work_mode_publication_audiences.publication_id
        and publication.published_by = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.work_mode_publications publication
      where publication.id = work_mode_publication_audiences.publication_id
        and publication.published_by = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.work_mode_publication_audiences to authenticated;

drop policy if exists work_mode_publications_worker_select on public.work_mode_publications;
create policy work_mode_publications_worker_select
  on public.work_mode_publications for select to authenticated
  using (
    status = 'published'
    and 'assigned_workers' = any(visible_to)
    and exists (
      select 1
      from public.employment_assignments assignment
      left join public.staff_shifts shift on shift.id = assignment.staff_shift_id
      where assignment.user_id = (select auth.uid())
        and assignment.status in ('confirmed', 'active')
        and (
          assignment.event_id is not distinct from work_mode_publications.event_id
          or shift.event_id is not distinct from work_mode_publications.event_id
          or assignment.tour_id is not distinct from work_mode_publications.tour_id
        )
    )
    and (
      not exists (
        select 1 from public.work_mode_publication_audiences audience
        where audience.publication_id = work_mode_publications.id
      )
      or exists (
        select 1 from public.work_mode_publication_audiences audience
        where audience.publication_id = work_mode_publications.id
          and audience.worker_user_id = (select auth.uid())
      )
    )
  );

-- Service-only integrity feed used by release monitoring. It intentionally
-- contains identifiers and issue codes, not worker profile or message content.
create or replace view public.work_hub_integrity_issues
with (security_invoker = true)
as
select
  'approved_application_without_roster'::text as issue_code,
  application.id as source_id,
  application.employer_entity_type,
  application.employer_entity_id,
  application.applicant_id as worker_user_id
from public.job_applications application
where application.status in ('approved', 'accepted')
  and not exists (
    select 1 from public.staff_members member
    where member.user_id = application.applicant_id
      and member.employer_entity_type = application.employer_entity_type
      and member.employer_entity_id = application.employer_entity_id
      and member.status in ('pending', 'active')
  )
union all
select
  'roster_without_coordinator_channel',
  member.id,
  member.employer_entity_type,
  member.employer_entity_id,
  member.user_id
from public.staff_members member
where member.status in ('pending', 'active')
  and member.user_id is not null
  and not exists (
    select 1 from public.workforce_channel_links link
    where link.staff_member_id = member.id
      and link.channel_kind = 'coordinator'
  )
union all
select
  'assignment_without_roster',
  assignment.id,
  assignment.employer_entity_type,
  assignment.employer_entity_id,
  assignment.user_id
from public.employment_assignments assignment
where assignment.assignment_kind in ('event', 'shift')
  and assignment.staff_member_id is null
union all
select
  'shift_without_canonical_assignment',
  shift.id,
  member.employer_entity_type,
  member.employer_entity_id,
  member.user_id
from public.staff_shifts shift
join public.staff_members member on member.id = shift.staff_member_id
where shift.deleted_at is null
  and not exists (
    select 1 from public.employment_assignments assignment
    where assignment.staff_shift_id = shift.id
  );

revoke all on public.work_hub_integrity_issues from anon, authenticated;

commit;
