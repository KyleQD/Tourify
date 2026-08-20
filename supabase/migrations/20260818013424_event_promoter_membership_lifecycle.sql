-- Promoter applications, invitations, and membership lifecycle (additive).
-- Mutations use the server-only SECURITY INVOKER command below; client roles
-- retain read-only access governed by explicit RLS policies.

create table if not exists public.event_promoter_membership_audit_events (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.event_promotion_programs(id) on delete restrict,
  event_id uuid not null references public.events_v2(id) on delete restrict,
  application_id uuid references public.event_promoter_applications(id) on delete set null,
  membership_id uuid references public.event_promoter_memberships(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('apply', 'invite', 'approve', 'reject', 'accept_invitation', 'suspend', 'revoke')),
  previous_values jsonb not null default '{}'::jsonb,
  next_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists event_promoter_membership_audit_events_program_created_idx
  on public.event_promoter_membership_audit_events(program_id, created_at desc);
create index if not exists event_promoter_membership_audit_events_target_created_idx
  on public.event_promoter_membership_audit_events(target_user_id, created_at desc);

alter table public.event_promoter_membership_audit_events enable row level security;
revoke all on public.event_promoter_membership_audit_events from anon, authenticated;
grant select on public.event_promoter_membership_audit_events to authenticated;

drop policy if exists promoter_membership_audit_owner_read on public.event_promoter_membership_audit_events;
drop policy if exists promoter_membership_audit_organizer_read on public.event_promoter_membership_audit_events;
create policy promoter_membership_audit_owner_read on public.event_promoter_membership_audit_events
  for select to authenticated using ((select auth.uid()) = target_user_id);
create policy promoter_membership_audit_organizer_read on public.event_promoter_membership_audit_events
  for select to authenticated using (private.can_manage_event_promoter_program(event_id));

create or replace function public.transition_event_promoter_membership(
  p_actor_id uuid,
  p_action text,
  p_program_id uuid,
  p_target_user_id uuid default null,
  p_application_id uuid default null,
  p_note text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_program public.event_promotion_programs%rowtype;
  v_application public.event_promoter_applications%rowtype;
  v_membership public.event_promoter_memberships%rowtype;
  v_event_created_by uuid;
  v_target_user_id uuid := p_target_user_id;
  v_previous jsonb := '{}'::jsonb;
  v_next jsonb := '{}'::jsonb;
  v_active_members integer;
begin
  if p_actor_id is null then raise exception 'actor is required' using errcode = '22023'; end if;
  if p_action not in ('apply', 'invite', 'approve', 'reject', 'accept_invitation', 'suspend', 'revoke') then
    raise exception 'unsupported promoter membership action' using errcode = '22023';
  end if;

  select p.* into v_program
  from public.event_promotion_programs p
  where p.id = p_program_id
  for update of p;
  if v_program.id is null then raise exception 'promoter program not found' using errcode = 'P0002'; end if;
  select e.created_by into v_event_created_by
  from public.events_v2 e
  where e.id = v_program.event_id;

  if p_action in ('apply', 'invite') then
    if v_target_user_id is null then raise exception 'target user is required' using errcode = '22023'; end if;
    if v_program.status <> 'open'
      or (v_program.starts_at is not null and v_program.starts_at > now())
      or (v_program.ends_at is not null and v_program.ends_at <= now()) then
      raise exception 'promoter program is not accepting members' using errcode = '22023';
    end if;
    if p_action = 'apply' and v_program.application_mode = 'invite_only' then
      raise exception 'this promoter program is invite only' using errcode = '22023';
    end if;
    if p_action = 'apply' and v_target_user_id <> p_actor_id then
      raise exception 'users may only apply for themselves' using errcode = '42501';
    end if;
    if exists (
      select 1 from public.event_promoter_memberships
      where program_id = v_program.id and user_id = v_target_user_id and status in ('approved', 'suspended')
    ) then raise exception 'user already has a promoter membership' using errcode = '23505'; end if;

    insert into public.event_promoter_applications (
      program_id, user_id, source, status, application_message, created_at, updated_at
    ) values (
      v_program.id, v_target_user_id,
      case when p_action = 'apply' then 'application' else 'invite' end,
      case when p_action = 'apply' then 'applied' else 'invited' end,
      nullif(p_note, ''), now(), now()
    ) returning * into v_application;
    v_next := jsonb_build_object('application_status', v_application.status, 'source', v_application.source);
  elsif p_action in ('approve', 'reject', 'accept_invitation') then
    if p_application_id is null then raise exception 'application is required' using errcode = '22023'; end if;
    select * into v_application from public.event_promoter_applications
    where id = p_application_id and program_id = v_program.id for update;
    if v_application.id is null then raise exception 'promoter application not found' using errcode = 'P0002'; end if;
    v_target_user_id := v_application.user_id;
    v_previous := jsonb_build_object('application_status', v_application.status);
    if p_action = 'accept_invitation' then
      if v_application.source <> 'invite' or v_application.status <> 'invited' or v_target_user_id <> p_actor_id then
        raise exception 'invitation cannot be accepted' using errcode = '42501';
      end if;
    elsif v_application.status not in ('applied', 'invited') then
      raise exception 'application is no longer actionable' using errcode = '22023';
    end if;

    if p_action in ('approve', 'accept_invitation') then
      if v_program.status <> 'open' then raise exception 'promoter program is not open' using errcode = '22023'; end if;
      select count(*) into v_active_members from public.event_promoter_memberships
      where program_id = v_program.id and status in ('approved', 'suspended');
      if v_program.promoter_cap is not null and v_active_members >= v_program.promoter_cap then
        raise exception 'promoter cap has been reached' using errcode = '22023';
      end if;
      insert into public.event_promoter_memberships (
        program_id, user_id, application_id, status, approved_at, approved_by, updated_at
      ) values (v_program.id, v_target_user_id, v_application.id, 'approved', now(), p_actor_id, now())
      returning * into v_membership;
      update public.event_promoter_applications
      set status = 'approved', review_note = case when p_action = 'approve' then nullif(p_note, '') else review_note end,
        reviewed_by = p_actor_id, reviewed_at = now(), updated_at = now()
      where id = v_application.id returning * into v_application;
      v_next := jsonb_build_object('application_status', 'approved', 'membership_status', 'approved');
    else
      update public.event_promoter_applications
      set status = 'rejected', review_note = nullif(p_note, ''), reviewed_by = p_actor_id,
        reviewed_at = now(), updated_at = now()
      where id = v_application.id returning * into v_application;
      v_next := jsonb_build_object('application_status', 'rejected');
    end if;
  else
    if p_target_user_id is null then raise exception 'target user is required' using errcode = '22023'; end if;
    select * into v_membership from public.event_promoter_memberships
    where program_id = v_program.id and id = p_application_id and user_id = p_target_user_id for update;
    if v_membership.id is null then raise exception 'promoter membership not found' using errcode = 'P0002'; end if;
    v_previous := jsonb_build_object('membership_status', v_membership.status);
    if p_action = 'suspend' and v_membership.status = 'approved' then
      update public.event_promoter_memberships set status = 'suspended', suspended_at = now(), updated_at = now()
      where id = v_membership.id returning * into v_membership;
      v_next := jsonb_build_object('membership_status', 'suspended');
    elsif p_action = 'revoke' and v_membership.status in ('approved', 'suspended') then
      update public.event_promoter_memberships set status = 'revoked', revoked_at = now(), updated_at = now()
      where id = v_membership.id returning * into v_membership;
      v_next := jsonb_build_object('membership_status', 'revoked');
    else
      raise exception 'invalid promoter membership transition' using errcode = '22023';
    end if;
  end if;

  insert into public.event_promoter_membership_audit_events (
    program_id, event_id, application_id, membership_id, actor_user_id, target_user_id,
    action, previous_values, next_values
  ) values (
    v_program.id, v_program.event_id, v_application.id, v_membership.id, p_actor_id, v_target_user_id,
    p_action, v_previous, v_next
  );

  return jsonb_build_object(
    'program_id', v_program.id, 'event_id', v_program.event_id,
    'application_id', v_application.id, 'membership_id', v_membership.id,
    'target_user_id', v_target_user_id, 'organizer_user_id', v_event_created_by,
    'action', p_action
  );
end;
$$;

revoke all on function public.transition_event_promoter_membership(uuid, text, uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.transition_event_promoter_membership(uuid, text, uuid, uuid, uuid, text) to service_role;

comment on table public.event_promoter_membership_audit_events is 'Append-only evidence for promoter applications, invitations, approvals, and membership lifecycle transitions.';
