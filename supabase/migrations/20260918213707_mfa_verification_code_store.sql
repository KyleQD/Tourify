-- Durable MFA verification-code storage.
--
-- Verification codes are bcrypt-hashed before they reach Postgres. All access
-- is restricted to the server-side service role, while RLS remains enabled as
-- defense in depth for this table in the exposed public schema.
set client_min_messages = warning;

create extension if not exists pgcrypto;

create table if not exists public.mfa_verification_codes (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('sms_setup', 'sms_login')),
  code_hash text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 3),
  last_attempt_at timestamptz,
  consumed_at timestamptz,
  revoked_at timestamptz,
  constraint mfa_verification_codes_challenge_id_length
    check (char_length(challenge_id) between 1 and 255),
  constraint mfa_verification_codes_bcrypt_hash
    check (code_hash ~ '^\$2[aby]\$12\$[./A-Za-z0-9]{53}$'),
  constraint mfa_verification_codes_expiry_after_issue
    check (expires_at > issued_at),
  constraint mfa_verification_codes_terminal_state
    check (consumed_at is null or revoked_at is null)
);

create index if not exists mfa_verification_codes_challenge_lookup_idx
  on public.mfa_verification_codes (challenge_id, user_id, issued_at desc);

create index if not exists mfa_verification_codes_issue_window_idx
  on public.mfa_verification_codes (user_id, kind, issued_at desc);

alter table public.mfa_verification_codes enable row level security;

revoke all on table public.mfa_verification_codes from public, anon, authenticated;
grant select, insert, update, delete on table public.mfa_verification_codes to service_role;

create or replace function public.issue_mfa_verification_code(
  p_challenge_id text,
  p_user_id uuid,
  p_kind text,
  p_code_hash text,
  p_issued_at timestamptz,
  p_expires_at timestamptz,
  p_max_issues integer default 3,
  p_issue_window_seconds integer default 900,
  p_resend_cooldown_seconds integer default 30
)
returns table (accepted boolean, retry_at timestamptz)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_issue_count integer;
  v_first_issued_at timestamptz;
  v_last_issued_at timestamptz;
begin
  if p_user_id is null
     or p_kind not in ('sms_setup', 'sms_login')
     or p_challenge_id is null
     or char_length(p_challenge_id) not between 1 and 255
     or p_code_hash !~ '^\$2[aby]\$12\$[./A-Za-z0-9]{53}$'
     or p_issued_at is null
     or p_expires_at <= p_issued_at
     or p_max_issues < 1
     or p_issue_window_seconds < 1
     or p_resend_cooldown_seconds < 0 then
    raise exception 'invalid_mfa_verification_code_issue';
  end if;

  -- Serialize rate-limit decisions for a user + challenge kind so parallel
  -- server instances cannot both pass the same issue window.
  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || p_kind, 0)
  );

  select count(*), min(issued_at), max(issued_at)
  into v_issue_count, v_first_issued_at, v_last_issued_at
  from public.mfa_verification_codes
  where user_id = p_user_id
    and kind = p_kind
    and issued_at > p_issued_at - make_interval(secs => p_issue_window_seconds);

  if v_last_issued_at is not null
     and v_last_issued_at + make_interval(secs => p_resend_cooldown_seconds) > p_issued_at then
    return query select false, v_last_issued_at + make_interval(secs => p_resend_cooldown_seconds);
    return;
  end if;

  if v_issue_count >= p_max_issues then
    return query select false, v_first_issued_at + make_interval(secs => p_issue_window_seconds);
    return;
  end if;

  insert into public.mfa_verification_codes (
    challenge_id,
    user_id,
    kind,
    code_hash,
    issued_at,
    expires_at
  ) values (
    p_challenge_id,
    p_user_id,
    p_kind,
    p_code_hash,
    p_issued_at,
    p_expires_at
  );

  return query select true, null::timestamptz;
end;
$$;

create or replace function public.begin_mfa_verification_attempt(
  p_challenge_id text,
  p_user_id uuid,
  p_attempted_at timestamptz
)
returns table (
  code_id uuid,
  status text,
  code_hash text,
  attempt_number integer,
  attempts_remaining integer
)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_code public.mfa_verification_codes%rowtype;
begin
  select *
  into v_code
  from public.mfa_verification_codes
  where challenge_id = p_challenge_id
    and user_id = p_user_id
  order by issued_at desc, id desc
  limit 1
  for update;

  if not found or v_code.revoked_at is not null then
    return query select null::uuid, 'not_found'::text, null::text, 0, 0;
    return;
  end if;

  if v_code.consumed_at is not null then
    return query select v_code.id, 'replayed'::text, null::text, v_code.attempts, 0;
    return;
  end if;

  if p_attempted_at >= v_code.expires_at then
    return query select v_code.id, 'expired'::text, null::text, v_code.attempts, 0;
    return;
  end if;

  if v_code.attempts >= 3 then
    return query select v_code.id, 'locked'::text, null::text, v_code.attempts, 0;
    return;
  end if;

  update public.mfa_verification_codes
  set attempts = attempts + 1,
      last_attempt_at = p_attempted_at
  where id = v_code.id
  returning attempts into v_code.attempts;

  return query
  select
    v_code.id,
    'ready'::text,
    v_code.code_hash,
    v_code.attempts,
    greatest(0, 3 - v_code.attempts);
end;
$$;

create or replace function public.finish_mfa_verification_attempt(
  p_code_id uuid,
  p_user_id uuid,
  p_attempt_number integer,
  p_matches boolean,
  p_completed_at timestamptz
)
returns table (status text, attempts_remaining integer)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_code public.mfa_verification_codes%rowtype;
begin
  select *
  into v_code
  from public.mfa_verification_codes
  where id = p_code_id
    and user_id = p_user_id
  for update;

  if not found or v_code.revoked_at is not null then
    return query select 'not_found'::text, 0;
    return;
  end if;

  if v_code.consumed_at is not null then
    return query select 'replayed'::text, 0;
    return;
  end if;

  if p_completed_at >= v_code.expires_at then
    return query select 'expired'::text, 0;
    return;
  end if;

  -- A later parallel attempt supersedes this one. Only the latest claimed
  -- attempt may consume the code, which guarantees single-use semantics.
  if v_code.attempts <> p_attempt_number then
    return query select
      case when v_code.attempts >= 3 then 'locked' else 'invalid' end,
      greatest(0, 3 - v_code.attempts);
    return;
  end if;

  if not p_matches then
    return query select
      case when v_code.attempts >= 3 then 'locked' else 'invalid' end,
      greatest(0, 3 - v_code.attempts);
    return;
  end if;

  update public.mfa_verification_codes
  set consumed_at = p_completed_at
  where id = v_code.id
    and consumed_at is null;

  if not found then
    return query select 'replayed'::text, 0;
    return;
  end if;

  return query select 'valid'::text, greatest(0, 3 - v_code.attempts);
end;
$$;

create or replace function public.revoke_mfa_verification_code(
  p_challenge_id text,
  p_user_id uuid,
  p_revoked_at timestamptz
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  update public.mfa_verification_codes
  set revoked_at = p_revoked_at
  where challenge_id = p_challenge_id
    and user_id = p_user_id
    and consumed_at is null
    and revoked_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.cleanup_expired_mfa_verification_codes(
  p_now timestamptz,
  p_issue_window_seconds integer default 900
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_count integer;
begin
  -- Retain every row for at least the issue window so cleanup cannot erase
  -- rate-limit history. Successful consumptions remain as replay evidence.
  delete from public.mfa_verification_codes
  where expires_at <= p_now
    and consumed_at is null
    and issued_at <= p_now - make_interval(secs => p_issue_window_seconds);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.issue_mfa_verification_code(text, uuid, text, text, timestamptz, timestamptz, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.begin_mfa_verification_attempt(text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.finish_mfa_verification_attempt(uuid, uuid, integer, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.revoke_mfa_verification_code(text, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.cleanup_expired_mfa_verification_codes(timestamptz, integer) from public, anon, authenticated;

grant execute on function public.issue_mfa_verification_code(text, uuid, text, text, timestamptz, timestamptz, integer, integer, integer) to service_role;
grant execute on function public.begin_mfa_verification_attempt(text, uuid, timestamptz) to service_role;
grant execute on function public.finish_mfa_verification_attempt(uuid, uuid, integer, boolean, timestamptz) to service_role;
grant execute on function public.revoke_mfa_verification_code(text, uuid, timestamptz) to service_role;
grant execute on function public.cleanup_expired_mfa_verification_codes(timestamptz, integer) to service_role;
