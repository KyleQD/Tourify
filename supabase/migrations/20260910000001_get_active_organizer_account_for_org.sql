-- ORG-005 / HF-ORG-005: first-time invitees resolve a non-public org's active
-- organizer account after accepting an invite.
--
-- Owner decision (HF-ORG-005): OPTION A — narrow SECURITY DEFINER read helper.
-- accept_org_invite is security invoker, so its inline SELECT on
-- public.organizer_accounts runs under the caller's RLS. A brand-new member
-- has no SELECT policy that exposes a non-public (is_public = false) org's
-- organizer_accounts row (organizer_accounts_public_select only exposes
-- is_public = true), so the returned organizer_account_id was NULL.
--
-- This additive migration:
--   1. Adds public.get_active_organizer_account_for_org(p_org_id uuid) — a
--      narrow SECURITY DEFINER read (STABLE, set search_path = pg_catalog,
--      public, mirroring the accept_org_invite/guard precedent) that first
--      verifies public.is_org_member(auth.uid(), p_org_id) is true and only
--      then resolves the org's single active organizer account. Because the
--      membership check is transaction-visible, a first-time recipient who
--      just inserted their org_members row in the same transaction passes.
--   2. Recreates public.accept_org_invite — byte-identical to the ORG-004
--      version except the inline organizer_accounts SELECT is replaced with a
--      call to the helper. security invoker, ON CONFLICT DO NOTHING, all
--      exception codes, and the exact grants are preserved.
--
-- No policies, tables, or other objects are touched (CP-051 additive).
set client_min_messages = warning;

create or replace function public.get_active_organizer_account_for_org(p_org_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_organizer_id uuid;
begin
  if public.is_org_member(auth.uid(), p_org_id) is not true then
    return null;
  end if;

  select id into v_organizer_id
  from public.organizer_accounts
  where ops_org_id = p_org_id and is_active = true
  limit 1;

  return v_organizer_id;
end;
$$;

revoke all on function public.get_active_organizer_account_for_org(uuid) from public, anon;
grant execute on function public.get_active_organizer_account_for_org(uuid) to authenticated;

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
  on conflict do nothing;

  v_organizer_id := public.get_active_organizer_account_for_org(v_invite.org_id);

  return jsonb_build_object('organizer_account_id', v_organizer_id);
end;
$$;

revoke all on function public.accept_org_invite(text) from public, anon;
grant execute on function public.accept_org_invite(text) to authenticated;