set client_min_messages = warning;

-- Streamlined Tour Builder: resumable quick-start event drafts and tour-only
-- collaboration invitations. This migration is additive and preserves every
-- existing tour/event row.

create schema if not exists private;
revoke all on schema private from public, anon;

-- ---------------------------------------------------------------------------
-- Real unscheduled event drafts
-- ---------------------------------------------------------------------------

alter table public.events_v2
  alter column start_at drop not null,
  alter column end_at drop not null,
  add column if not exists quick_start_batch_id uuid,
  add column if not exists quick_start_ordinal integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.events_v2'::regclass
      and conname = 'events_v2_schedule_integrity_check'
  ) then
    alter table public.events_v2
      add constraint events_v2_schedule_integrity_check
      check (
        (
          start_at is null
          and end_at is null
          and status = 'inquiry'
        )
        or (
          start_at is not null
          and end_at is not null
          and end_at > start_at
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.events_v2'::regclass
      and conname = 'events_v2_quick_start_ordinal_check'
  ) then
    alter table public.events_v2
      add constraint events_v2_quick_start_ordinal_check
      check (
        (quick_start_batch_id is null and quick_start_ordinal is null)
        or (quick_start_batch_id is not null and quick_start_ordinal between 1 and 50)
      ) not valid;
  end if;
end;
$$;

create unique index if not exists events_v2_quick_start_batch_ordinal_key
  on public.events_v2 (quick_start_batch_id, quick_start_ordinal)
  where quick_start_batch_id is not null;

create index if not exists idx_events_v2_org_unscheduled_drafts
  on public.events_v2 (org_id, created_at desc)
  where start_at is null and status = 'inquiry';

create or replace function public.create_tour_quick_start_events(
  p_tour_id uuid,
  p_count integer,
  p_batch_id uuid
)
returns table (
  event_id uuid,
  label text,
  ordinal integer,
  created boolean
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_tour public.tours%rowtype;
  v_existing_count integer;
  v_ordinal integer;
  v_event_id uuid;
  v_label text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;
  if p_count < 1 or p_count > 50 then
    raise exception using errcode = '22023', message = 'Event count must be between 1 and 50.';
  end if;

  select * into v_tour
  from public.tours
  where id = p_tour_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'Tour not found.';
  end if;

  if not (
    v_tour.created_by = auth.uid()
    or v_tour.user_id = auth.uid()
    or (v_tour.org_id is not null and public.has_perm(auth.uid(), v_tour.org_id, 'event.manage'))
  ) then
    raise exception using errcode = '42501', message = 'Tour management access required.';
  end if;

  select count(*)::integer into v_existing_count
  from public.events_v2
  where quick_start_batch_id = p_batch_id;

  if v_existing_count > 0 then
    if v_existing_count <> p_count or exists (
      select 1
      from public.events_v2 event
      left join public.tour_events assignment
        on assignment.event_id = event.id
       and assignment.tour_id = p_tour_id
      where event.quick_start_batch_id = p_batch_id
        and (event.org_id is distinct from v_tour.org_id or assignment.id is null)
    ) then
      raise exception using errcode = '23505', message = 'Idempotency key was already used with different input.';
    end if;

    return query
      select event.id,
             coalesce(event.settings->>'quick_start_label', event.title),
             event.quick_start_ordinal,
             false
      from public.events_v2 event
      where event.quick_start_batch_id = p_batch_id
      order by event.quick_start_ordinal;
    return;
  end if;

  for v_ordinal in 1..p_count loop
    v_event_id := gen_random_uuid();
    v_label := 'Event ' || v_ordinal::text;

    insert into public.events_v2 (
      id,
      org_id,
      title,
      slug,
      status,
      start_at,
      end_at,
      created_by,
      settings,
      quick_start_batch_id,
      quick_start_ordinal
    ) values (
      v_event_id,
      v_tour.org_id,
      v_tour.name || ' — ' || v_label,
      left(regexp_replace(lower(v_tour.name), '[^a-z0-9]+', '-', 'g'), 42)
        || '-event-' || v_ordinal::text || '-' || substr(p_batch_id::text, 1, 8),
      'inquiry',
      null,
      null,
      auth.uid(),
      jsonb_build_object(
        'quick_start_placeholder', true,
        'quick_start_label', v_label,
        'quick_start_batch_id', p_batch_id,
        'public_visibility', 'private',
        'event_type', 'live',
        'ticketing_setup', 'incomplete'
      ),
      p_batch_id,
      v_ordinal
    );

    insert into public.tour_events (
      tour_id,
      event_id,
      ordinal,
      is_primary,
      advance_status
    ) values (
      p_tour_id,
      v_event_id,
      v_ordinal - 1,
      true,
      'not_started'
    );

    event_id := v_event_id;
    label := v_label;
    ordinal := v_ordinal;
    created := true;
    return next;
  end loop;

  update public.tours
  set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
        'quick_start', jsonb_build_object(
          'state', 'events_created',
          'step', 3,
          'event_count', p_count,
          'batch_id', p_batch_id,
          'updated_at', now()
        )
      ),
      updated_at = now()
  where id = p_tour_id;
end;
$$;

revoke all on function public.create_tour_quick_start_events(uuid, integer, uuid) from public, anon;
grant execute on function public.create_tour_quick_start_events(uuid, integer, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Tour-only collaboration invitations
-- ---------------------------------------------------------------------------

create table if not exists public.tour_collaboration_invitations (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete restrict,
  invited_user_id uuid references auth.users(id) on delete set null,
  invited_email text,
  invited_phone text,
  role text not null default 'admin' check (role = 'admin'),
  channel text not null check (channel in ('in_app', 'email', 'sms', 'copy')),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'sent', 'failed', 'not_requested')),
  delivery_error text,
  delivery_metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tour_collaboration_invitation_target_check check (
    (channel = 'in_app' and invited_user_id is not null)
    or (channel = 'email' and invited_email is not null)
    or (channel = 'sms' and invited_phone is not null)
    or channel = 'copy'
  )
);

create index if not exists idx_tour_collaboration_invites_tour_status
  on public.tour_collaboration_invitations (tour_id, status, created_at desc);
create index if not exists idx_tour_collaboration_invites_user_pending
  on public.tour_collaboration_invitations (invited_user_id, status)
  where invited_user_id is not null;

drop trigger if exists trg_tour_collaboration_invites_touch on public.tour_collaboration_invitations;
create trigger trg_tour_collaboration_invites_touch
  before update on public.tour_collaboration_invitations
  for each row execute function public.touch_updated_at();

alter table public.tour_collaboration_invitations enable row level security;

create or replace function private.accept_tour_collaboration_invitation(
  p_token_hash text
)
returns table (
  tour_id uuid,
  invitation_id uuid,
  already_accepted boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_invitation public.tour_collaboration_invitations%rowtype;
  v_user auth.users%rowtype;
  v_team_id uuid;
  v_member_id uuid;
  v_display_name text;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;

  select * into v_invitation
  from public.tour_collaboration_invitations invitation
  where invitation.token_hash = p_token_hash
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Invitation not found.';
  end if;

  if v_invitation.status = 'accepted' then
    if v_invitation.accepted_by = auth.uid() then
      tour_id := v_invitation.tour_id;
      invitation_id := v_invitation.id;
      already_accepted := true;
      return next;
      return;
    end if;
    raise exception using errcode = '23505', message = 'This invitation has already been claimed.';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception using errcode = '22023', message = 'This invitation is no longer available.';
  end if;
  if v_invitation.expires_at <= now() then
    raise exception using errcode = '22023', message = 'This invitation has expired.';
  end if;

  select * into v_user from auth.users where id = auth.uid();
  if v_invitation.channel = 'in_app'
     and v_invitation.invited_user_id is distinct from auth.uid() then
    raise exception using errcode = '42501', message = 'Sign in with the invited Tourify account.';
  elsif v_invitation.channel = 'email'
     and lower(coalesce(v_user.email, '')) <> lower(coalesce(v_invitation.invited_email, '')) then
    raise exception using errcode = '42501', message = 'Sign in with the email address this invitation was sent to.';
  elsif v_invitation.channel = 'sms'
     and regexp_replace(coalesce(v_user.phone, ''), '[^0-9]+', '', 'g')
       <> regexp_replace(coalesce(v_invitation.invited_phone, ''), '[^0-9]+', '', 'g') then
    raise exception using errcode = '42501', message = 'Sign in with the phone number this invitation was sent to.';
  end if;

  -- Serialize membership/team creation per tour while retaining a row lock on
  -- this invitation. The function call itself is the acceptance transaction.
  perform pg_advisory_xact_lock(hashtextextended('tour-collaboration:' || v_invitation.tour_id::text, 0));

  select team.id into v_team_id
  from public.tour_teams team
  where team.tour_id = v_invitation.tour_id
    and team.name = 'Core Production'
  order by team.created_at
  limit 1;

  if v_team_id is null then
    insert into public.tour_teams (tour_id, name, team_type, role, created_by)
    values (v_invitation.tour_id, 'Core Production', 'core', 'core', v_invitation.invited_by)
    returning id into v_team_id;
  end if;

  select member.id into v_member_id
  from public.tour_team_members member
  where member.tour_id = v_invitation.tour_id
    and member.user_id = auth.uid()
  order by member.created_at
  limit 1
  for update;

  select coalesce(
    nullif(profile.full_name, ''),
    nullif(v_user.raw_user_meta_data->>'full_name', ''),
    nullif(v_user.email, ''),
    'Tour admin'
  ) into v_display_name
  from (select 1) seed
  left join public.profiles profile on profile.id = auth.uid();

  if v_member_id is null then
    insert into public.tour_team_members (
      tour_id,
      team_id,
      user_id,
      role,
      role_in_team,
      name,
      email,
      contact_email,
      status,
      is_active,
      assigned_by,
      assigned_at
    ) values (
      v_invitation.tour_id,
      v_team_id,
      auth.uid(),
      'admin',
      'admin',
      v_display_name,
      coalesce(v_user.email, ''),
      coalesce(v_user.email, ''),
      'confirmed',
      true,
      v_invitation.invited_by,
      now()
    );
  else
    update public.tour_team_members
    set team_id = v_team_id,
        role = 'admin',
        role_in_team = 'admin',
        name = v_display_name,
        email = coalesce(v_user.email, ''),
        contact_email = coalesce(v_user.email, ''),
        status = 'confirmed',
        is_active = true,
        assigned_by = v_invitation.invited_by,
        assigned_at = now(),
        updated_at = now()
    where id = v_member_id;
  end if;

  update public.tour_collaboration_invitations
  set status = 'accepted',
      accepted_at = now(),
      accepted_by = auth.uid(),
      updated_at = now()
  where id = v_invitation.id;

  tour_id := v_invitation.tour_id;
  invitation_id := v_invitation.id;
  already_accepted := false;
  return next;
end;
$$;

revoke all on function private.accept_tour_collaboration_invitation(text) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.accept_tour_collaboration_invitation(text) to authenticated;

-- Keep the exposed RPC security-invoker. The privileged transaction lives in
-- the unexposed private schema and remains callable only by authenticated users.
create or replace function public.accept_tour_collaboration_invitation(
  p_token_hash text
)
returns table (
  tour_id uuid,
  invitation_id uuid,
  already_accepted boolean
)
language sql
security invoker
set search_path = pg_catalog
as $$
  select *
  from private.accept_tour_collaboration_invitation(p_token_hash);
$$;

revoke all on function public.accept_tour_collaboration_invitation(text) from public, anon;
grant execute on function public.accept_tour_collaboration_invitation(text) to authenticated;

create or replace function private.can_manage_tour(p_tour_id uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.tours tour
    where tour.id = p_tour_id
      and (
        tour.created_by = auth.uid()
        or tour.user_id = auth.uid()
        or (tour.org_id is not null and public.has_perm(auth.uid(), tour.org_id, 'tour.manage'))
        or exists (
          select 1
          from public.tour_team_members member
          where member.tour_id = tour.id
            and member.user_id = auth.uid()
            and member.is_active = true
            and member.status = 'confirmed'
            and lower(member.role) in ('admin', 'tour_manager', 'manager', 'owner', 'lead')
        )
      )
  );
$$;

create or replace function private.can_access_event_via_tour(p_event_id uuid, p_manage boolean default false)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.tour_events assignment
    join public.tour_team_members member on member.tour_id = assignment.tour_id
    where assignment.event_id = p_event_id
      and member.user_id = auth.uid()
      and member.is_active = true
      and member.status = 'confirmed'
      and (
        not p_manage
        or lower(member.role) in ('admin', 'tour_manager', 'manager', 'owner', 'lead')
      )
  );
$$;

create or replace function private.can_access_org_via_tour(p_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from public.tours tour
    join public.tour_team_members member on member.tour_id = tour.id
    where tour.org_id = p_org_id
      and member.user_id = auth.uid()
      and member.is_active = true
      and member.status = 'confirmed'
  );
$$;

revoke all on function private.can_manage_tour(uuid) from public, anon;
revoke all on function private.can_access_event_via_tour(uuid, boolean) from public, anon;
revoke all on function private.can_access_org_via_tour(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.can_manage_tour(uuid) to authenticated;
grant execute on function private.can_access_event_via_tour(uuid, boolean) to authenticated;
grant execute on function private.can_access_org_via_tour(uuid) to authenticated;

drop policy if exists organizer_accounts_tour_collaborator_select on public.organizer_accounts;
create policy organizer_accounts_tour_collaborator_select
  on public.organizer_accounts for select to authenticated
  using (ops_org_id is not null and private.can_access_org_via_tour(ops_org_id));

drop policy if exists tour_collaboration_invites_manage_select on public.tour_collaboration_invitations;
create policy tour_collaboration_invites_manage_select
  on public.tour_collaboration_invitations for select to authenticated
  using (private.can_manage_tour(tour_id) or invited_user_id = (select auth.uid()));

drop policy if exists tour_collaboration_invites_manage_insert on public.tour_collaboration_invitations;
create policy tour_collaboration_invites_manage_insert
  on public.tour_collaboration_invitations for insert to authenticated
  with check (invited_by = (select auth.uid()) and private.can_manage_tour(tour_id));

drop policy if exists tour_collaboration_invites_manage_update on public.tour_collaboration_invitations;
create policy tour_collaboration_invites_manage_update
  on public.tour_collaboration_invitations for update to authenticated
  using (private.can_manage_tour(tour_id))
  with check (private.can_manage_tour(tour_id));

drop policy if exists tour_collaboration_invites_manage_delete on public.tour_collaboration_invitations;
create policy tour_collaboration_invites_manage_delete
  on public.tour_collaboration_invitations for delete to authenticated
  using (private.can_manage_tour(tour_id));

revoke all on public.tour_collaboration_invitations from anon;
grant select, insert, update, delete on public.tour_collaboration_invitations to authenticated;

-- Add collaborator access without widening organization membership.
drop policy if exists events_v2_tour_collaborator_select on public.events_v2;
create policy events_v2_tour_collaborator_select
  on public.events_v2 for select to authenticated
  using (private.can_access_event_via_tour(id, false));

drop policy if exists events_v2_tour_collaborator_update on public.events_v2;
create policy events_v2_tour_collaborator_update
  on public.events_v2 for update to authenticated
  using (private.can_access_event_via_tour(id, true))
  with check (private.can_access_event_via_tour(id, true));

drop policy if exists tours_tour_collaborator_update on public.tours;
create policy tours_tour_collaborator_update
  on public.tours for update to authenticated
  using (private.can_manage_tour(id))
  with check (private.can_manage_tour(id));

drop policy if exists tours_tour_collaborator_select on public.tours;
create policy tours_tour_collaborator_select
  on public.tours for select to authenticated
  using (private.can_manage_tour(id));

drop policy if exists tour_events_tour_collaborator_select on public.tour_events;
create policy tour_events_tour_collaborator_select
  on public.tour_events for select to authenticated
  using (private.can_manage_tour(tour_id));

drop policy if exists tour_events_tour_collaborator_insert on public.tour_events;
create policy tour_events_tour_collaborator_insert
  on public.tour_events for insert to authenticated
  with check (private.can_manage_tour(tour_id));

drop policy if exists tour_events_tour_collaborator_update on public.tour_events;
create policy tour_events_tour_collaborator_update
  on public.tour_events for update to authenticated
  using (private.can_manage_tour(tour_id))
  with check (private.can_manage_tour(tour_id));

drop policy if exists tour_events_tour_collaborator_delete on public.tour_events;
create policy tour_events_tour_collaborator_delete
  on public.tour_events for delete to authenticated
  using (private.can_manage_tour(tour_id));

drop policy if exists tour_team_members_collaborator_select on public.tour_team_members;
create policy tour_team_members_collaborator_select
  on public.tour_team_members for select to authenticated
  using (user_id = (select auth.uid()) or private.can_manage_tour(tour_id));

drop policy if exists tour_team_members_collaborator_insert on public.tour_team_members;
create policy tour_team_members_collaborator_insert
  on public.tour_team_members for insert to authenticated
  with check (private.can_manage_tour(tour_id));

drop policy if exists tour_team_members_collaborator_update on public.tour_team_members;
create policy tour_team_members_collaborator_update
  on public.tour_team_members for update to authenticated
  using (private.can_manage_tour(tour_id))
  with check (private.can_manage_tour(tour_id));

drop policy if exists tour_teams_collaborator_select on public.tour_teams;
create policy tour_teams_collaborator_select
  on public.tour_teams for select to authenticated
  using (private.can_manage_tour(tour_id));

drop policy if exists tour_teams_collaborator_insert on public.tour_teams;
create policy tour_teams_collaborator_insert
  on public.tour_teams for insert to authenticated
  with check (private.can_manage_tour(tour_id));

drop policy if exists tour_teams_collaborator_update on public.tour_teams;
create policy tour_teams_collaborator_update
  on public.tour_teams for update to authenticated
  using (private.can_manage_tour(tour_id))
  with check (private.can_manage_tour(tour_id));

drop policy if exists tour_vendors_collaborator_select on public.tour_vendors;
create policy tour_vendors_collaborator_select
  on public.tour_vendors for select to authenticated
  using (private.can_manage_tour(tour_id));

drop policy if exists tour_vendors_collaborator_insert on public.tour_vendors;
create policy tour_vendors_collaborator_insert
  on public.tour_vendors for insert to authenticated
  with check (private.can_manage_tour(tour_id));

drop policy if exists tour_vendors_collaborator_update on public.tour_vendors;
create policy tour_vendors_collaborator_update
  on public.tour_vendors for update to authenticated
  using (private.can_manage_tour(tour_id))
  with check (private.can_manage_tour(tour_id));

drop policy if exists tour_artists_collaborator_select on public.tour_artists;
create policy tour_artists_collaborator_select
  on public.tour_artists for select to authenticated
  using (private.can_manage_tour(tour_id));

drop policy if exists tour_artists_collaborator_insert on public.tour_artists;
create policy tour_artists_collaborator_insert
  on public.tour_artists for insert to authenticated
  with check (private.can_manage_tour(tour_id));

drop policy if exists tour_artists_collaborator_update on public.tour_artists;
create policy tour_artists_collaborator_update
  on public.tour_artists for update to authenticated
  using (private.can_manage_tour(tour_id))
  with check (private.can_manage_tour(tour_id));

comment on table public.tour_collaboration_invitations is
  'Tour-only project administrator invitations. Raw bearer tokens are never stored.';
;
