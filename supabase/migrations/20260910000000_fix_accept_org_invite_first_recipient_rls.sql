-- ORG-004: Fix accept_org_invite circular RLS for first-time recipients.
--
-- Additive fix: recreate public.accept_org_invite, replacing the explicit
-- ON CONFLICT (org_id, user_id) arbiter target with ON CONFLICT DO NOTHING
-- (no conflict target). No schema objects are dropped; no history is rewritten.
--
-- Why: with an explicit conflict target, PostgreSQL runs the arbiter
-- unique-check against the candidate row, which requires the SELECT policy
-- members_select (public.is_org_member(auth.uid(), org_id)) to see the row
-- being inserted. A first-time recipient is not yet a member, so
-- is_org_member() is false and the INSERT is rejected: 42501 "new row violates
-- row-level security policy for table org_members".
--
-- ON CONFLICT DO NOTHING without a conflict target does not gate the candidate
-- row on the SELECT policy; it skips a conflict on any unique constraint
-- (here the org_members primary key (org_id, user_id)). The INSERT WITH CHECK
-- policies (members_insert, org_members_accept_invite) still gate the write,
-- so authorization stays at the data boundary and no-overwrite semantics for
-- existing members are preserved.
--
-- Evidence: local live repro against supabase_db_tourify-beta (port 54322)
-- with invite pre-accepted by the recipient (the state inside the RPC):
--   plain INSERT                          -> succeeds
--   INSERT ... ON CONFLICT (org_id,user_id) DO NOTHING -> 42501 RLS failure
--   INSERT ... ON CONFLICT DO NOTHING     -> succeeds
set client_min_messages = warning;

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

  select id into v_organizer_id
  from public.organizer_accounts
  where ops_org_id = v_invite.org_id and is_active = true
  limit 1;

  return jsonb_build_object('organizer_account_id', v_organizer_id);
end;
$$;

revoke all on function public.accept_org_invite(text) from public, anon;
grant execute on function public.accept_org_invite(text) to authenticated;