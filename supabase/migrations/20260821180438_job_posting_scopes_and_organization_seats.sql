-- Make the destination of a workforce posting explicit and represent
-- organization memberships as SaaS-style seats with per-member capabilities.

-- migration-validation: not-null-reviewed job-posting-scope-not-null
-- The nullable column is backfilled and the target constraint is validated below;
-- the linked snapshot contains only 35 posting rows, within the 5s lock budget.
alter table public.job_posting_templates
  add column if not exists assignment_scope text,
  add column if not exists seat_role text,
  add column if not exists seat_permissions text[] not null default '{}'::text[];

update public.job_posting_templates
set assignment_scope = case
  when event_id is not null then 'event'
  when tour_id is not null then 'tour'
  else 'organization'
end
where assignment_scope is null;

alter table public.job_posting_templates
  alter column assignment_scope set default 'organization',
  alter column assignment_scope set not null;

alter table public.job_posting_templates
  drop constraint if exists job_posting_templates_assignment_scope_check,
  drop constraint if exists job_posting_templates_assignment_target_check,
  drop constraint if exists job_posting_templates_event_id_fkey,
  drop constraint if exists job_posting_templates_tour_id_fkey;

alter table public.job_posting_templates
  add constraint job_posting_templates_assignment_scope_check
    check (assignment_scope in ('organization', 'event', 'tour')) not valid,
  add constraint job_posting_templates_assignment_target_check
    check (
      (assignment_scope = 'organization' and event_id is null and tour_id is null)
      or (assignment_scope = 'event' and event_id is not null and tour_id is null)
      or (assignment_scope = 'tour' and tour_id is not null and event_id is null)
    ) not valid,
  add constraint job_posting_templates_event_id_fkey
    foreign key (event_id) references public.events_v2(id) on delete restrict not valid,
  add constraint job_posting_templates_tour_id_fkey
    foreign key (tour_id) references public.tours(id) on delete restrict not valid;

alter table public.job_posting_templates validate constraint job_posting_templates_assignment_scope_check;
alter table public.job_posting_templates validate constraint job_posting_templates_assignment_target_check;
alter table public.job_posting_templates validate constraint job_posting_templates_event_id_fkey;
alter table public.job_posting_templates validate constraint job_posting_templates_tour_id_fkey;

create index if not exists job_posting_templates_assignment_scope_idx
  on public.job_posting_templates(employer_entity_type, employer_entity_id, assignment_scope, status);

alter table public.org_members
  add column if not exists status text not null default 'active',
  add column if not exists permissions text[] not null default '{}'::text[],
  add column if not exists invited_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists seat_source text not null default 'manual',
  add column if not exists job_posting_id uuid references public.job_posting_templates(id) on delete set null,
  add column if not exists job_application_id uuid references public.job_applications(id) on delete set null;

update public.org_members
set activated_at = coalesce(activated_at, created_at),
    updated_at = coalesce(updated_at, created_at),
    status = coalesce(status, 'active')
where activated_at is null
   or updated_at is null
   or status is null;

alter table public.org_members
  drop constraint if exists org_members_status_check,
  drop constraint if exists org_members_seat_source_check,
  drop constraint if exists org_members_permissions_check;

alter table public.org_members
  add constraint org_members_status_check
    check (status in ('invited', 'active', 'revoked')) not valid,
  add constraint org_members_seat_source_check
    check (seat_source in ('manual', 'invitation', 'job_approval')) not valid,
  add constraint org_members_permissions_check
    check (
      permissions <@ array[
        'org.roles.manage', 'org.settings.manage', 'audit.view',
        'tour.view', 'tour.manage', 'tour.publish', 'tour.archive', 'tour.delete',
        'event.view', 'event.manage', 'event.publish', 'event.live_ops',
        'routing.manage', 'advance.manage', 'logistics.view', 'logistics.manage', 'logistics.sensitive',
        'workforce.view', 'workforce.manage', 'workforce.publish', 'hiring.manage',
        'vendor.view', 'vendor.manage', 'vendor.sensitive',
        'contract.view', 'contract.manage', 'contract.sign',
        'finance.view', 'finance.manage', 'finance.approve', 'finance.pay',
        'ticketing.view', 'ticketing.manage', 'ticketing.scan', 'ticketing.refund',
        'site_map.view', 'site_map.edit', 'site_map.share',
        'communications.send', 'communications.broadcast', 'content.view', 'content.manage'
      ]::text[]
    ) not valid;

alter table public.org_members validate constraint org_members_status_check;
alter table public.org_members validate constraint org_members_seat_source_check;
alter table public.org_members validate constraint org_members_permissions_check;

create index if not exists org_members_active_seats_idx
  on public.org_members(org_id, status)
  where status = 'active';

create or replace function public.is_org_member(uid uuid, oid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, extensions
as $$
  select exists(
    select 1
    from public.org_members m
    where m.org_id = oid
      and m.user_id = uid
      and m.status = 'active'
  )
$$;

create or replace function public.has_perm(uid uuid, oid uuid, perm text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  member_role text;
  role_permissions text[];
  member_permissions text[];
begin
  select m.role, m.permissions
  into member_role, member_permissions
  from public.org_members m
  where m.org_id = oid
    and m.user_id = uid
    and m.status = 'active';

  if member_role is null then return false; end if;

  select rp.perms
  into role_permissions
  from public.org_role_permissions rp
  where rp.role = member_role;

  return perm = any(coalesce(role_permissions, '{}'::text[]))
    or perm = any(coalesce(member_permissions, '{}'::text[]));
end
$$;

alter table public.employment_assignments
  drop constraint if exists employment_assignments_assignment_kind_check;

alter table public.employment_assignments
  add constraint employment_assignments_assignment_kind_check
  check (assignment_kind in ('organization', 'event', 'shift', 'tour', 'legacy_engagement')) not valid;

alter table public.employment_assignments
  validate constraint employment_assignments_assignment_kind_check;

create unique index if not exists employment_assignments_active_organization_key
  on public.employment_assignments(employer_entity_type, employer_entity_id, user_id)
  where assignment_kind = 'organization'
    and status in ('invited', 'confirmed', 'active');
