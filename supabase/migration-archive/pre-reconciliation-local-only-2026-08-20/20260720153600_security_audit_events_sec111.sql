-- SEC-111 — Immutable security audit trail (append-only).

create table if not exists public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  actor_user_id uuid,
  principal_type text not null default 'user'
    check (principal_type in ('user', 'service_job', 'system')),
  acting_org_id uuid,
  acting_profile_id uuid,
  action text not null,
  action_class text not null
    check (action_class in ('mutation', 'privileged_read', 'export', 'authz_decision')),
  target_type text,
  target_id uuid,
  correlation_id text,
  request_id text,
  result text not null
    check (result in ('success', 'denied', 'error')),
  reason text,
  ip_fingerprint text,
  user_agent_fingerprint text,
  before_diff jsonb,
  after_diff jsonb,
  module_id text,
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.security_audit_events is
  'SEC-111 append-only security audit. Updates/deletes are blocked by trigger + grants.';

create index if not exists security_audit_events_org_time_idx
  on public.security_audit_events (acting_org_id, created_at desc);
create index if not exists security_audit_events_actor_time_idx
  on public.security_audit_events (actor_user_id, created_at desc);
create index if not exists security_audit_events_target_idx
  on public.security_audit_events (target_type, target_id);
create index if not exists security_audit_events_correlation_idx
  on public.security_audit_events (correlation_id)
  where correlation_id is not null;

alter table public.security_audit_events enable row level security;
alter table public.security_audit_events force row level security;

-- Authenticated: select only with audit.view / finance.view capability via has_perm
drop policy if exists security_audit_events_select on public.security_audit_events;
create policy security_audit_events_select on public.security_audit_events
  for select to authenticated
  using (
    acting_org_id is not null
    and (
      public.has_perm(auth.uid(), acting_org_id, 'audit.view')
      or public.has_perm(auth.uid(), acting_org_id, 'finance.view')
      or public.has_perm(auth.uid(), acting_org_id, 'org.manage')
    )
  );

-- No insert/update/delete policies for authenticated — writes via SECURITY DEFINER RPC only
revoke all on public.security_audit_events from anon, authenticated;
grant select on public.security_audit_events to authenticated;
grant all on public.security_audit_events to service_role;

create or replace function public.security_audit_events_deny_mutate()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
begin
  raise exception 'security_audit_events is append-only' using errcode = '42501';
end;
$$;

drop trigger if exists security_audit_events_no_update on public.security_audit_events;
create trigger security_audit_events_no_update
  before update on public.security_audit_events
  for each row execute function public.security_audit_events_deny_mutate();

drop trigger if exists security_audit_events_no_delete on public.security_audit_events;
create trigger security_audit_events_no_delete
  before delete on public.security_audit_events
  for each row execute function public.security_audit_events_deny_mutate();

-- Restricted append path for authenticated/service (still subject to RLS insert deny for authn;
-- service_role bypasses RLS; authenticated uses this definer function)
create or replace function public.write_security_audit_event(
  p_actor_user_id uuid,
  p_principal_type text,
  p_acting_org_id uuid,
  p_acting_profile_id uuid,
  p_action text,
  p_action_class text,
  p_target_type text,
  p_target_id uuid,
  p_correlation_id text,
  p_result text,
  p_reason text,
  p_ip_fingerprint text,
  p_user_agent_fingerprint text,
  p_before_diff jsonb,
  p_after_diff jsonb,
  p_module_id text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_id uuid;
begin
  insert into public.security_audit_events (
    actor_user_id,
    principal_type,
    acting_org_id,
    acting_profile_id,
    action,
    action_class,
    target_type,
    target_id,
    correlation_id,
    result,
    reason,
    ip_fingerprint,
    user_agent_fingerprint,
    before_diff,
    after_diff,
    module_id,
    metadata
  ) values (
    p_actor_user_id,
    coalesce(nullif(p_principal_type, ''), 'user'),
    p_acting_org_id,
    p_acting_profile_id,
    p_action,
    p_action_class,
    p_target_type,
    p_target_id,
    p_correlation_id,
    p_result,
    p_reason,
    p_ip_fingerprint,
    p_user_agent_fingerprint,
    p_before_diff,
    p_after_diff,
    p_module_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.write_security_audit_event(
  uuid, text, uuid, uuid, text, text, text, uuid, text, text, text, text, text, jsonb, jsonb, text, jsonb
) from public;
grant execute on function public.write_security_audit_event(
  uuid, text, uuid, uuid, text, text, text, uuid, text, text, text, text, text, jsonb, jsonb, text, jsonb
) to authenticated, service_role;
