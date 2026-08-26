-- SEC-101: signed Admin acting-context server record and epoch/CAS boundary.
-- Expand-only. Existing public.user_sessions compatibility rows and policies
-- are intentionally untouched. No context is inferred or backfilled.

begin;

create extension if not exists pgcrypto;

create table if not exists public.admin_acting_context_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  auth_session_hash text not null,
  profile_id uuid not null references public.organizer_accounts(id) on delete restrict,
  org_id uuid not null references public.organizations(id) on delete restrict,
  epoch bigint not null,
  selected_at timestamptz not null,
  expires_at timestamptz not null,
  nonce_hash text not null,
  membership_version text not null,
  capability_version text not null,
  support_grant_id uuid,
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_acting_context_epoch_positive check (epoch > 0),
  constraint admin_acting_context_expiry_after_selection check (expires_at > selected_at),
  constraint admin_acting_context_auth_hash_shape check (auth_session_hash ~ '^[0-9a-f]{64}$'),
  constraint admin_acting_context_nonce_hash_shape check (nonce_hash ~ '^[0-9a-f]{64}$'),
  constraint admin_acting_context_revoke_reason check (
    (revoked_at is null and revoked_reason is null)
    or (revoked_at is not null and nullif(btrim(revoked_reason), '') is not null)
  ),
  unique (user_id, auth_session_hash)
);

create index if not exists admin_acting_context_active_user_idx
  on public.admin_acting_context_sessions (user_id, expires_at)
  where revoked_at is null;

create index if not exists admin_acting_context_org_idx
  on public.admin_acting_context_sessions (org_id, user_id)
  where revoked_at is null;

create table if not exists public.admin_acting_context_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  auth_session_hash text not null,
  profile_id uuid references public.organizer_accounts(id) on delete restrict,
  org_id uuid references public.organizations(id) on delete restrict,
  epoch bigint,
  action text not null check (action in (
    'selected',
    'switch_stale',
    'resolved',
    'invalid_envelope',
    'revoked',
    'expired',
    'logout'
  )),
  result text not null check (result in ('allowed', 'denied', 'invalidated')),
  reason text not null,
  correlation_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_acting_context_audit_hash_shape check (auth_session_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists admin_acting_context_audit_user_created_idx
  on public.admin_acting_context_audit (user_id, created_at desc);

create index if not exists admin_acting_context_audit_org_created_idx
  on public.admin_acting_context_audit (org_id, created_at desc)
  where org_id is not null;

alter table public.admin_acting_context_sessions enable row level security;
alter table public.admin_acting_context_sessions force row level security;
alter table public.admin_acting_context_audit enable row level security;
alter table public.admin_acting_context_audit force row level security;

-- No authenticated table policy is intentional: users access only the
-- own-session SECURITY DEFINER functions below. The signed cookie remains
-- HTTP-only and the browser cannot enumerate context or audit records.
revoke all on table public.admin_acting_context_sessions from anon, authenticated;
revoke all on table public.admin_acting_context_audit from anon, authenticated;

create or replace function public.admin_switch_acting_context(
  p_profile_id uuid,
  p_auth_session_hash text,
  p_expected_epoch bigint,
  p_expires_at timestamptz,
  p_nonce_hash text,
  p_correlation_id text default null
)
returns table (
  result_code text,
  profile_id uuid,
  org_id uuid,
  epoch bigint,
  selected_at timestamptz,
  expires_at timestamptz,
  nonce_hash text,
  membership_version text,
  capability_version text
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_role text;
  v_member_created_at timestamptz;
  v_perms text[] := array[]::text[];
  v_current public.admin_acting_context_sessions%rowtype;
  v_next_epoch bigint;
  v_selected_at timestamptz := clock_timestamp();
  v_membership_version text;
  v_capability_version text;
  v_jwt_session_id text := nullif(auth.jwt() ->> 'session_id', '');
  v_expected_auth_session_hash text;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if v_jwt_session_id is null then
    raise exception using errcode = '42501', message = 'auth_session_binding_required';
  end if;
  v_expected_auth_session_hash := encode(
    digest(concat_ws('|', v_user_id::text, v_jwt_session_id), 'sha256'),
    'hex'
  );
  if p_auth_session_hash is null
    or p_auth_session_hash <> v_expected_auth_session_hash
    or p_nonce_hash is null
    or p_nonce_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'invalid_acting_context_binding';
  end if;
  if p_expected_epoch is null or p_expected_epoch < 0 then
    raise exception using errcode = '22023', message = 'invalid_expected_epoch';
  end if;
  if p_expires_at is null
    or p_expires_at <= v_selected_at
    or p_expires_at > v_selected_at + interval '8 hours' then
    raise exception using errcode = '22023', message = 'invalid_acting_context_expiry';
  end if;

  select account.ops_org_id
  into v_org_id
  from public.organizer_accounts account
  where account.id = p_profile_id
    and account.is_active = true
    and account.ops_org_id is not null;

  if v_org_id is null then
    raise exception using errcode = '42501', message = 'organization_access_denied';
  end if;

  select member.role, member.created_at
  into v_role, v_member_created_at
  from public.org_members member
  where member.user_id = v_user_id
    and member.org_id = v_org_id;

  if v_role is null then
    raise exception using errcode = '42501', message = 'organization_access_denied';
  end if;

  select coalesce(
    (select role_permissions.perms
     from public.org_role_permissions role_permissions
     where role_permissions.role = v_role),
    array[]::text[]
  ) into v_perms;

  v_membership_version := encode(
    digest(concat_ws('|', v_user_id::text, v_org_id::text, v_role, v_member_created_at::text), 'sha256'),
    'hex'
  );
  v_capability_version := encode(
    digest(concat_ws('|', v_role, array_to_string(v_perms, ',')), 'sha256'),
    'hex'
  );

  select session.*
  into v_current
  from public.admin_acting_context_sessions session
  where session.user_id = v_user_id
    and session.auth_session_hash = p_auth_session_hash
  for update;

  if found then
    if v_current.epoch <> p_expected_epoch then
      insert into public.admin_acting_context_audit (
        user_id, auth_session_hash, profile_id, org_id, epoch,
        action, result, reason, correlation_id
      ) values (
        v_user_id, p_auth_session_hash, v_current.profile_id, v_current.org_id, v_current.epoch,
        'switch_stale', 'denied', 'expected_epoch_mismatch', p_correlation_id
      );
      return query
      select 'acting_context_stale', v_current.profile_id, v_current.org_id,
             v_current.epoch, v_current.selected_at, v_current.expires_at,
             v_current.nonce_hash, v_current.membership_version, v_current.capability_version;
      return;
    end if;
    v_next_epoch := v_current.epoch + 1;

    update public.admin_acting_context_sessions session
    set profile_id = p_profile_id,
        org_id = v_org_id,
        epoch = v_next_epoch,
        selected_at = v_selected_at,
        expires_at = p_expires_at,
        nonce_hash = p_nonce_hash,
        membership_version = v_membership_version,
        capability_version = v_capability_version,
        support_grant_id = null,
        revoked_at = null,
        revoked_reason = null,
        updated_at = v_selected_at
    where session.id = v_current.id;
  else
    if p_expected_epoch <> 0 then
      insert into public.admin_acting_context_audit (
        user_id, auth_session_hash, profile_id, org_id, epoch,
        action, result, reason, correlation_id
      ) values (
        v_user_id, p_auth_session_hash, p_profile_id, v_org_id, null,
        'switch_stale', 'denied', 'missing_context_for_expected_epoch', p_correlation_id
      );
      return query
      select 'acting_context_stale', p_profile_id, v_org_id, null::bigint,
             null::timestamptz, null::timestamptz, null::text, null::text, null::text;
      return;
    end if;
    v_next_epoch := 1;
    insert into public.admin_acting_context_sessions (
      user_id, auth_session_hash, profile_id, org_id, epoch,
      selected_at, expires_at, nonce_hash, membership_version, capability_version
    ) values (
      v_user_id, p_auth_session_hash, p_profile_id, v_org_id, v_next_epoch,
      v_selected_at, p_expires_at, p_nonce_hash, v_membership_version, v_capability_version
    );
  end if;

  insert into public.admin_acting_context_audit (
    user_id, auth_session_hash, profile_id, org_id, epoch,
    action, result, reason, correlation_id
  ) values (
    v_user_id, p_auth_session_hash, p_profile_id, v_org_id, v_next_epoch,
    'selected', 'allowed', 'explicit_account_selection', p_correlation_id
  );

  return query
  select 'ok', p_profile_id, v_org_id, v_next_epoch, v_selected_at, p_expires_at,
         p_nonce_hash, v_membership_version, v_capability_version;
end;
$$;

create or replace function public.admin_resolve_acting_context(
  p_auth_session_hash text
)
returns table (
  profile_id uuid,
  org_id uuid,
  epoch bigint,
  selected_at timestamptz,
  expires_at timestamptz,
  nonce_hash text,
  membership_role text,
  permissions text[],
  membership_version text,
  capability_version text,
  support_grant_id uuid
)
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $$
  select
    session.profile_id,
    session.org_id,
    session.epoch,
    session.selected_at,
    session.expires_at,
    session.nonce_hash,
    member.role,
    coalesce(role_permissions.perms, array[]::text[]),
    session.membership_version,
    session.capability_version,
    session.support_grant_id
  from public.admin_acting_context_sessions session
  join public.organizer_accounts account
    on account.id = session.profile_id
   and account.ops_org_id = session.org_id
   and account.is_active = true
  join public.org_members member
    on member.user_id = session.user_id
   and member.org_id = session.org_id
  left join public.org_role_permissions role_permissions
    on role_permissions.role = member.role
  where session.user_id = auth.uid()
    and session.auth_session_hash = p_auth_session_hash
    and nullif(auth.jwt() ->> 'session_id', '') is not null
    and session.auth_session_hash = encode(
      digest(concat_ws('|', auth.uid()::text, auth.jwt() ->> 'session_id'), 'sha256'),
      'hex'
    )
    and session.revoked_at is null
    and session.expires_at > clock_timestamp()
    and session.membership_version = encode(
      digest(concat_ws('|', session.user_id::text, session.org_id::text, member.role, member.created_at::text), 'sha256'),
      'hex'
    )
    and session.capability_version = encode(
      digest(concat_ws('|', member.role, array_to_string(coalesce(role_permissions.perms, array[]::text[]), ',')), 'sha256'),
      'hex'
    );
$$;

create or replace function public.admin_revoke_acting_context(
  p_auth_session_hash text,
  p_reason text,
  p_correlation_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_user_id uuid := auth.uid();
  v_context public.admin_acting_context_sessions%rowtype;
  v_jwt_session_id text := nullif(auth.jwt() ->> 'session_id', '');
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if v_jwt_session_id is null
    or p_auth_session_hash <> encode(
      digest(concat_ws('|', v_user_id::text, v_jwt_session_id), 'sha256'),
      'hex'
    ) then
    raise exception using errcode = '22023', message = 'invalid_acting_context_binding';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception using errcode = '22023', message = 'revocation_reason_required';
  end if;

  update public.admin_acting_context_sessions session
  set revoked_at = clock_timestamp(),
      revoked_reason = btrim(p_reason),
      epoch = session.epoch + 1,
      updated_at = clock_timestamp()
  where session.user_id = v_user_id
    and session.auth_session_hash = p_auth_session_hash
    and session.revoked_at is null
  returning session.* into v_context;

  if not found then return false; end if;

  insert into public.admin_acting_context_audit (
    user_id, auth_session_hash, profile_id, org_id, epoch,
    action, result, reason, correlation_id
  ) values (
    v_user_id, p_auth_session_hash, v_context.profile_id, v_context.org_id, v_context.epoch,
    case when p_reason = 'logout' then 'logout' else 'revoked' end,
    'invalidated', btrim(p_reason), p_correlation_id
  );
  return true;
end;
$$;

revoke all on function public.admin_switch_acting_context(uuid, text, bigint, timestamptz, text, text) from public, anon;
revoke all on function public.admin_resolve_acting_context(text) from public, anon;
revoke all on function public.admin_revoke_acting_context(text, text, text) from public, anon;

grant execute on function public.admin_switch_acting_context(uuid, text, bigint, timestamptz, text, text) to authenticated;
grant execute on function public.admin_resolve_acting_context(text) to authenticated;
grant execute on function public.admin_revoke_acting_context(text, text, text) to authenticated;

commit;
