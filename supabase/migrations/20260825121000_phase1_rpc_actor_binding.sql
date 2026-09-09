-- PHASE 1 (SEC / ADM-M-051..055, LIVE-P0-01..04, LIVE-P1-01):
-- Bind user-context SECURITY DEFINER RPCs to auth.uid() and shrink their
-- definer surface. Every function here previously trusted caller-supplied
-- identity arguments, allowing cross-user account switching, account
-- discovery, artist-profile creation on behalf of others, DM impersonation,
-- and conversation injection between arbitrary users.
--
-- Additive/reversible: all functions are CREATE OR REPLACE; legacy signatures
-- are preserved as identity-checked wrappers so existing call sites keep
-- working without impersonation capability.

set client_min_messages = warning;

create extension if not exists pgcrypto;

-- ============================================================================
-- Ensure the session tables these RPCs manage exist in the ACTIVE chain
-- (previously only in migrations_backup — silent 42P01 degradation elsewhere).
-- ============================================================================
create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  active_profile_id uuid not null,
  active_account_type text not null check (active_account_type in ('general','artist','venue','admin','organization')),
  session_data jsonb default '{}'::jsonb,
  last_activity timestamptz default now() not null,
  created_at timestamptz default now() not null,
  unique(user_id)
);

create table if not exists public.account_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  profile_id uuid not null,
  account_type text not null,
  action_type text not null,
  action_details jsonb default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz default now() not null
);

alter table public.user_sessions enable row level security;
drop policy if exists user_sessions_owner_all on public.user_sessions;
create policy user_sessions_owner_all on public.user_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.account_activity_log enable row level security;
drop policy if exists account_activity_log_owner_all on public.account_activity_log;
create policy account_activity_log_owner_insert on public.account_activity_log
  for insert with check (auth.uid() = user_id);
create policy account_activity_log_owner_select on public.account_activity_log
  for select using (auth.uid() = user_id);

-- ============================================================================
-- ADM-M-051 / LIVE-P0-01: switch_active_account
-- Canonical form derives actor from auth.uid(). Legacy 3-arg signature is
-- retained as a wrapper that refuses any user_id other than the caller.
-- ============================================================================
create or replace function public.switch_active_account(
  p_target_profile_id uuid,
  p_target_account_type text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_target_account_type = 'general' then
    if p_target_profile_id is distinct from v_uid then
      raise exception 'no_access_to_general_profile';
    end if;
  else
    if not exists (
      select 1 from account_relationships
      where owner_user_id = v_uid
        and owned_profile_id = p_target_profile_id
        and account_type = p_target_account_type
        and is_active
    ) then
      raise exception 'no_access_to_account';
    end if;
  end if;

  insert into user_sessions (user_id, active_profile_id, active_account_type, last_activity)
  values (v_uid, p_target_profile_id, p_target_account_type, now())
  on conflict (user_id) do update
    set active_profile_id = excluded.active_profile_id,
        active_account_type = excluded.active_account_type,
        last_activity = excluded.last_activity;

  insert into account_activity_log (user_id, profile_id, account_type, action_type)
  values (v_uid, p_target_profile_id, p_target_account_type, 'switch_account');

  return true;
end;
$$;

-- Legacy signature: identity-bound shim. Cross-user calls now fail closed.
create or replace function public.switch_active_account(
  user_id uuid,
  profile_id uuid,
  account_type text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if user_id is distinct from auth.uid() then
    raise exception 'cannot_switch_account_for_other_user';
  end if;
  return public.switch_active_account(profile_id, account_type);
end;
$$;

-- ============================================================================
-- ADM-M-052 / LIVE-P0-02: get_user_accounts_adaptive
-- Ordinary callers may only enumerate their own accounts. Privileged
-- cross-user lookup remains available exclusively to service_role.
-- ============================================================================
create or replace function public.get_user_accounts_adaptive(
  p_target_user_id uuid
)
returns table (
  account_type text,
  profile_id uuid,
  profile_data jsonb,
  permissions jsonb,
  is_active boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_target_user_id is distinct from auth.uid()
     and coalesce(current_setting('role', true), '') <> 'service_role' then
    raise exception 'cannot_enumerate_other_user_accounts';
  end if;

  return query
    select 'general'::text as account_type,
           prof.id as profile_id,
           to_jsonb(prof) as profile_data,
           prof.account_settings as permissions,
           true as is_active
    from profiles prof
    where prof.id = p_target_user_id
    union all
    select ar.account_type,
           ar.owned_profile_id as profile_id,
           case
             when ar.account_type = 'artist' then to_jsonb(ap)
             when ar.account_type = 'venue' then to_jsonb(vp)
             else '{}'::jsonb
           end as profile_data,
           ar.permissions,
           ar.is_active
    from account_relationships ar
    left join artist_profiles ap on ar.account_type = 'artist' and ap.main_profile_id = ar.owned_profile_id
    left join venue_profiles vp on ar.account_type = 'venue' and vp.main_profile_id = ar.owned_profile_id
    where ar.owner_user_id = p_target_user_id;
end;
$$;

-- ============================================================================
-- ADM-M-053 / LIVE-P0-03: create_artist_account
-- Caller-supplied user_id is ignored; the artist account always belongs to
-- auth.uid(). The whole routine is atomic by virtue of being a single
-- function body (implicit transaction at call site).
-- ============================================================================
create or replace function public.create_artist_account(
  p_user_id uuid,
  p_artist_name text,
  p_bio text default null,
  p_genres text[] default '{}',
  p_social_links jsonb default '{}'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_artist_profile_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_user_id is not null and p_user_id is distinct from v_uid then
    raise exception 'cannot_create_account_for_other_user';
  end if;

  insert into artist_profiles (user_id, artist_name, bio, genres, social_links, main_profile_id)
  values (v_uid, p_artist_name, p_bio, p_genres, p_social_links, v_uid)
  returning id into v_artist_profile_id;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'account_relationships'
  ) then
    insert into account_relationships (owner_user_id, owner_profile_id, owned_profile_id, account_type)
    values (v_uid, v_uid, v_artist_profile_id, 'artist')
    on conflict do nothing;
  end if;

  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'account_activity_log'
  ) then
    insert into account_activity_log (user_id, profile_id, account_type, action_type, action_details)
    values (v_uid, v_artist_profile_id, 'artist', 'create_account',
            jsonb_build_object('artist_name', p_artist_name));
  end if;

  return v_artist_profile_id;
end;
$$;

-- ============================================================================
-- ADM-M-054 / LIVE-P0-04: send_dm_request
-- Sender identity always derives from auth.uid(); caller-supplied sender must
-- match or the call fails. Full reissue follows the repo convention used for
-- has_entity_permission / is_org_member hardening (body from
-- 20260719210918_messaging_account_scope with actor binding added).
-- ============================================================================
create or replace function public.send_dm_request(
  p_sender uuid,
  p_recipient uuid,
  p_content text,
  p_sender_profile_id uuid default null,
  p_sender_account_type text default 'general',
  p_recipient_profile_id uuid default null,
  p_recipient_account_type text default 'general'
)
returns table (
  conversation_id uuid,
  message_id uuid,
  trust_tier text,
  context_type text,
  context_id uuid,
  created_new boolean,
  message_created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_context_row record;
  v_conversation_id uuid;
  v_message_id uuid;
  v_now timestamptz := now();
  v_window_start timestamptz := v_now - interval '24 hours';
  v_rate record;
  v_created_new boolean := false;
  v_message_created_at timestamptz;
  v_sender_profile uuid;
  v_recipient_profile uuid;
  v_sender_type text;
  v_recipient_type text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  -- Actor binding: reject caller-controlled sender identity.
  if p_sender is distinct from v_uid then
    raise exception 'sender_must_be_caller';
  end if;

  v_sender_profile     := coalesce(p_sender_profile_id, v_uid);
  v_recipient_profile  := coalesce(p_recipient_profile_id, p_recipient);
  v_sender_type        := coalesce(nullif(trim(p_sender_account_type), ''), 'general');
  v_recipient_type     := coalesce(nullif(trim(p_recipient_account_type), ''), 'general');

  if p_recipient is null or p_sender = p_recipient then
    raise exception 'invalid_participants';
  end if;

  if coalesce(trim(p_content), '') = '' then
    raise exception 'empty_content';
  end if;

  if exists (select 1 from profiles where id = p_sender and role = 'viewer') then
    raise exception 'viewer_cannot_send';
  end if;

  select * into v_context_row
  from resolve_message_context(p_sender, p_recipient);

  select id into v_conversation_id
  from conversations
  where (
      participant_1 = p_sender
      and participant_2 = p_recipient
      and coalesce(participant_1_profile_id, participant_1) = v_sender_profile
      and coalesce(participant_2_profile_id, participant_2) = v_recipient_profile
    )
    or (
      participant_1 = p_recipient
      and participant_2 = p_sender
      and coalesce(participant_1_profile_id, participant_1) = v_recipient_profile
      and coalesce(participant_2_profile_id, participant_2) = v_sender_profile
    )
  limit 1;

  if v_conversation_id is null then
    v_created_new := true;

    if v_context_row.tier = 'request' then
      select * into v_rate
      from dm_request_rate_limits
      where sender_id = p_sender and recipient_id = p_recipient
      for update;

      if found then
        if v_rate.window_started_at < v_window_start then
          update dm_request_rate_limits
            set request_count = 1,
                window_started_at = v_now,
                updated_at = v_now
            where sender_id = p_sender and recipient_id = p_recipient;
        elsif v_rate.request_count >= 3 then
          raise exception 'rate_limited';
        else
          update dm_request_rate_limits
            set request_count = v_rate.request_count + 1,
                updated_at = v_now
            where sender_id = p_sender and recipient_id = p_recipient;
        end if;
      else
        insert into dm_request_rate_limits(
          sender_id, recipient_id, request_count, window_started_at, updated_at
        )
        values (p_sender, p_recipient, 1, v_now, v_now);
      end if;
    end if;

    insert into conversations (
      participant_1, participant_2,
      participant_1_profile_id, participant_2_profile_id,
      status, initiated_by, created_at, updated_at
    ) values (
      p_sender, p_recipient,
      v_sender_profile, v_recipient_profile,
      case when v_context_row.tier = 'direct' then 'accepted' else 'pending' end,
      p_sender, v_now, v_now
    )
    returning id into v_conversation_id;
  end if;

  insert into messages (conversation_id, sender_id, content, created_at)
  values (v_conversation_id, p_sender, p_content, v_now)
  returning id, created_at into v_message_id, v_message_created_at;

  return query select
    v_conversation_id,
    v_message_id,
    v_context_row.tier,
    v_context_row.context_type,
    v_context_row.context_id,
    v_created_new,
    v_message_created_at;
end;
$$;

-- ============================================================================
-- ADM-M-055 / LIVE-P1-01: get_or_create_conversation
-- One participant MUST be the caller; converted to SECURITY INVOKER so it no
-- longer bypasses conversations RLS at all.
-- ============================================================================
create or replace function public.get_or_create_conversation(
  user1_id uuid,
  user2_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_conversation_id uuid;
  v_user1_id uuid := user1_id;
  v_user2_id uuid := user2_id;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if v_uid not in (v_user1_id, v_user2_id) then
    raise exception 'caller_must_be_participant';
  end if;
  if v_user1_id is null or v_user2_id is null or v_user1_id = v_user2_id then
    raise exception 'invalid_participants';
  end if;

  if v_user1_id > v_user2_id then
    select v_user1_id, v_user2_id into v_user2_id, v_user1_id;
  end if;

  select id into v_conversation_id
  from conversations
  where (participant_1 = v_user1_id and participant_2 = v_user2_id)
     or (participant_1 = v_user2_id and participant_2 = v_user1_id);

  if v_conversation_id is null then
    insert into conversations (participant_1, participant_2)
    values (v_user1_id, v_user2_id)
    returning id into v_conversation_id;
  end if;

  return v_conversation_id;
end;
$$;

-- ============================================================================
-- EXECUTE surface: anon never needs any of these.
-- ============================================================================
revoke execute on function public.switch_active_account(uuid, text) from public, anon;
revoke execute on function public.switch_active_account(uuid, uuid, text) from public, anon;
revoke execute on function public.get_user_accounts_adaptive(uuid) from public, anon;
revoke execute on function public.create_artist_account(uuid, text, text, text[], jsonb) from public, anon;
revoke execute on function public.send_dm_request(uuid, uuid, text, uuid, text, uuid, text) from public, anon;
revoke execute on function public.get_or_create_conversation(uuid, uuid) from public, anon;

grant execute on function public.switch_active_account(uuid, text) to authenticated;
grant execute on function public.switch_active_account(uuid, uuid, text) to authenticated;
grant execute on function public.get_user_accounts_adaptive(uuid) to authenticated;
grant execute on function public.create_artist_account(uuid, text, text, text[], jsonb) to authenticated;
grant execute on function public.send_dm_request(uuid, uuid, text, uuid, text, uuid, text) to authenticated;
grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;

-- ROLLBACK NOTE
-- ------------
-- Prior definitions recoverable from:
--   supabase/migrations_backup/20241220000003_multi_account_system.sql (switch/get_user_accounts)
--   supabase/migrations/archive/APPLY_TO_SUPABASE_DASHBOARD.sql (create_artist_account)
--   supabase/migration-archive/pre-reconciliation-local-only-2026-08-20/20260719210918_messaging_account_scope.sql (send_dm_request)
--   supabase/migrations/20250121000001_messaging_system.sql (get_or_create_conversation)
-- Restoring them reintroduces cross-user identity trust (not recommended).
