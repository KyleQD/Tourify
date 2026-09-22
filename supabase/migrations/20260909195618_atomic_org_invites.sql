-- Atomic organization invite acceptance and revocation.
-- Supabase migrations are the schema source of truth for this flow.
set client_min_messages = warning;

create schema if not exists extensions;
create schema if not exists private;

alter table public.org_invites
  add column if not exists token_hash text,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references auth.users(id) on delete set null;

update public.org_invites
set token_hash = encode(extensions.digest(token, 'sha256'), 'hex')
where token_hash is null and token is not null;

alter table public.org_invites alter column token drop not null;
create unique index if not exists org_invites_token_hash_key
  on public.org_invites (token_hash) where token_hash is not null;

update public.org_invites set token = null where token_hash is not null;

create or replace function private.guard_org_invite_acceptance()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if current_setting('role', true) in ('service_role', 'supabase_auth_admin', 'postgres') then
    return new;
  end if;

  if new.org_id is distinct from old.org_id
     or new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.token is distinct from old.token
     or new.token_hash is distinct from old.token_hash
     or new.expires_at is distinct from old.expires_at
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'org_invite_immutable';
  end if;

  if old.accepted_at is not null or old.revoked_at is not null then
    raise exception 'org_invite_closed';
  end if;
  if new.revoked_at is not null
     and new.revoked_by = auth.uid()
     and new.accepted_at is null
     and new.accepted_by is null then
    return new;
  end if;
  if new.accepted_at is null or new.accepted_by is distinct from auth.uid()
     or new.revoked_at is not null or new.revoked_by is not null then
    raise exception 'org_invite_acceptance_invalid';
  end if;
  return new;
end;
$$;

drop trigger if exists org_invites_acceptance_guard on public.org_invites;
create trigger org_invites_acceptance_guard
  before update on public.org_invites
  for each row execute function private.guard_org_invite_acceptance();

drop policy if exists org_invites_accept_recipient on public.org_invites;
create policy org_invites_accept_recipient on public.org_invites
  for update to authenticated
  using (
    accepted_at is null
    and revoked_at is null
    and expires_at > now()
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    accepted_at is not null
    and accepted_by = auth.uid()
    and revoked_at is null
  );

drop policy if exists org_members_accept_invite on public.org_members;
create policy org_members_accept_invite on public.org_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.org_invites invite
      where invite.org_id = org_members.org_id
        and invite.role = org_members.role
        and invite.accepted_by = auth.uid()
        and invite.accepted_at is not null
        and invite.revoked_at is null
        and lower(invite.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  );

create or replace function public.accept_org_invite(p_token_hash text)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_invite public.org_invites%rowtype;
  v_organizer_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_token_hash is null or length(trim(p_token_hash)) <> 64 then raise exception 'invalid_token'; end if;

  select * into v_invite
  from public.org_invites
  where token_hash = lower(trim(p_token_hash))
  for update;

  if not found then raise exception 'invalid_token'; end if;
  if v_invite.accepted_at is not null then raise exception 'already_accepted'; end if;
  if v_invite.revoked_at is not null then raise exception 'revoked'; end if;
  if v_invite.expires_at <= now() then raise exception 'expired'; end if;
  if lower(v_invite.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then
    raise exception 'email_mismatch';
  end if;

  update public.org_invites
  set accepted_at = now(), accepted_by = auth.uid()
  where id = v_invite.id;

  insert into public.org_members (org_id, user_id, role, invited_by, status)
  values (v_invite.org_id, auth.uid(), v_invite.role, v_invite.created_by, 'active')
  on conflict (org_id, user_id) do nothing;

  select id into v_organizer_id
  from public.organizer_accounts
  where ops_org_id = v_invite.org_id and is_active = true
  limit 1;

  return jsonb_build_object('organizer_account_id', v_organizer_id);
end;
$$;

create or replace function public.revoke_org_invite(p_invite_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select org_id into v_org_id from public.org_invites where id = p_invite_id for update;
  if not found then raise exception 'invite_not_found'; end if;
  if not exists (
    select 1 from public.org_members
    where org_id = v_org_id and user_id = auth.uid() and role in ('owner', 'admin') and status = 'active'
  ) then raise exception 'not_authorized'; end if;

  update public.org_invites
  set revoked_at = now(), revoked_by = auth.uid()
  where id = p_invite_id and accepted_at is null and revoked_at is null;
  return found;
end;
$$;

revoke all on function public.accept_org_invite(text) from public, anon;
revoke all on function public.revoke_org_invite(uuid) from public, anon;
grant execute on function public.accept_org_invite(text) to authenticated;
grant execute on function public.revoke_org_invite(uuid) to authenticated;
