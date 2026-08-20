-- Phase 10: hardening and staged rollout controls for Event Promoter Network.
-- All new records are additive. Operational telemetry deliberately excludes
-- buyer identity, payment references, IP addresses, tracking tokens, and raw
-- user-agent data.

set client_min_messages = warning;

create table if not exists public.promoter_risk_flag_events (
  id uuid primary key default gen_random_uuid(),
  risk_flag_id uuid not null references public.promoter_risk_flags(id) on delete restrict,
  action text not null check (action in ('created', 'reviewing', 'resolved', 'dismissed', 'severity_changed')),
  actor_id uuid references auth.users(id) on delete restrict,
  reason text not null check (length(trim(reason)) >= 3),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.promoter_network_operational_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete restrict,
  event_id uuid references public.events_v2(id) on delete restrict,
  event_type text not null check (event_type in (
    'tracking_redirect', 'attribution_resolved', 'attribution_unmatched',
    'commission_finalized', 'commission_reversed', 'commission_finalization_failed',
    'payout_allocated', 'payout_submitted', 'payout_paid', 'payout_failed', 'payout_retried', 'payout_cancelled', 'commission_hold_updated',
    'authorization_denied', 'reconciliation_mismatch', 'investigation_read', 'risk_flag_updated'
  )),
  outcome text not null check (outcome in ('success', 'skipped', 'failed', 'denied')),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  correlation_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (not (metadata ?& array['buyer_id', 'payment_reference', 'tracking_token', 'ip_address', 'user_agent']))
);

create index if not exists promoter_risk_flag_events_flag_created_idx
  on public.promoter_risk_flag_events(risk_flag_id, created_at desc);
create index if not exists promoter_network_operational_events_event_created_idx
  on public.promoter_network_operational_events(event_id, created_at desc)
  where event_id is not null;
create index if not exists promoter_network_operational_events_org_type_created_idx
  on public.promoter_network_operational_events(org_id, event_type, created_at desc)
  where org_id is not null;

create or replace function public.prevent_promoter_risk_flag_event_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'promoter_risk_flag_events is append-only';
end;
$$;

drop trigger if exists prevent_promoter_risk_flag_event_update on public.promoter_risk_flag_events;
create trigger prevent_promoter_risk_flag_event_update
  before update or delete on public.promoter_risk_flag_events
  for each row execute function public.prevent_promoter_risk_flag_event_mutation();

alter table public.promoter_risk_flag_events enable row level security;
alter table public.promoter_network_operational_events enable row level security;

revoke all on public.promoter_risk_flag_events, public.promoter_network_operational_events from public;

-- These sensitive records are accessed through verified server jobs only. The
-- explicit restrictive policies make the deny-by-default intent visible to the
-- database advisor even if grants are changed later by an unrelated release.
drop policy if exists promoter_risk_flags_direct_deny on public.promoter_risk_flags;
create policy promoter_risk_flags_direct_deny on public.promoter_risk_flags
  as restrictive for all to authenticated using (false) with check (false);

drop policy if exists promoter_touchpoints_direct_deny on public.promoter_attribution_touchpoints;
create policy promoter_touchpoints_direct_deny on public.promoter_attribution_touchpoints
  as restrictive for all to authenticated using (false) with check (false);

drop policy if exists promoter_shadow_attribution_direct_deny on public.promoter_checkout_shadow_attributions;
create policy promoter_shadow_attribution_direct_deny on public.promoter_checkout_shadow_attributions
  as restrictive for all to authenticated using (false) with check (false);

drop policy if exists promoter_ticket_sale_attribution_direct_deny on public.ticket_sale_attributions;
create policy promoter_ticket_sale_attribution_direct_deny on public.ticket_sale_attributions
  as restrictive for all to authenticated using (false) with check (false);

drop policy if exists promoter_payout_batches_direct_deny on public.promoter_payout_batches;
create policy promoter_payout_batches_direct_deny on public.promoter_payout_batches
  as restrictive for all to authenticated using (false) with check (false);

drop policy if exists promoter_payout_batch_events_direct_deny on public.promoter_payout_batch_events;
create policy promoter_payout_batch_events_direct_deny on public.promoter_payout_batch_events
  as restrictive for all to authenticated using (false) with check (false);

drop policy if exists promoter_commission_hold_events_direct_deny on public.promoter_commission_hold_events;
create policy promoter_commission_hold_events_direct_deny on public.promoter_commission_hold_events
  as restrictive for all to authenticated using (false) with check (false);

drop policy if exists promoter_risk_flag_events_direct_deny on public.promoter_risk_flag_events;
create policy promoter_risk_flag_events_direct_deny on public.promoter_risk_flag_events
  as restrictive for all to authenticated using (false) with check (false);

drop policy if exists promoter_network_operational_events_direct_deny on public.promoter_network_operational_events;
create policy promoter_network_operational_events_direct_deny on public.promoter_network_operational_events
  as restrictive for all to authenticated using (false) with check (false);

create or replace function public.create_event_promoter_risk_flag(
  p_event_id uuid,
  p_program_id uuid,
  p_membership_id uuid default null,
  p_attribution_id uuid default null,
  p_user_id uuid default null,
  p_risk_type text default 'manual_review',
  p_severity text default 'medium',
  p_actor_id uuid default null,
  p_reason text default 'Manual promoter risk review.',
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_flag public.promoter_risk_flags%rowtype;
begin
  if p_severity not in ('low', 'medium', 'high', 'critical') then
    raise exception 'unsupported risk severity' using errcode = '22023';
  end if;
  if nullif(trim(p_risk_type), '') is null or nullif(trim(p_reason), '') is null then
    raise exception 'risk type and reason are required' using errcode = '22023';
  end if;
  if p_details ?& array['buyer_id', 'payment_reference', 'tracking_token', 'ip_address', 'user_agent'] then
    raise exception 'risk details contain restricted data' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.event_promotion_programs program
    where program.id = p_program_id and program.event_id = p_event_id
  ) then
    raise exception 'program does not belong to event' using errcode = '22023';
  end if;
  if p_membership_id is not null and not exists (
    select 1 from public.event_promoter_memberships membership
    where membership.id = p_membership_id and membership.program_id = p_program_id
  ) then
    raise exception 'membership does not belong to program' using errcode = '22023';
  end if;
  if p_attribution_id is not null and not exists (
    select 1 from public.ticket_sale_attributions attribution
    where attribution.id = p_attribution_id
      and attribution.event_id = p_event_id
      and attribution.program_id = p_program_id
      and (p_membership_id is null or attribution.membership_id = p_membership_id)
  ) then
    raise exception 'attribution does not belong to the event/program scope' using errcode = '22023';
  end if;

  insert into public.promoter_risk_flags (
    program_id, membership_id, attribution_id, user_id, risk_type, severity, status, details
  ) values (
    p_program_id, p_membership_id, p_attribution_id, p_user_id, trim(p_risk_type), p_severity, 'open', p_details
  ) returning * into v_flag;

  insert into public.promoter_risk_flag_events (
    risk_flag_id, action, actor_id, reason, metadata
  ) values (
    v_flag.id, 'created', p_actor_id, trim(p_reason), jsonb_build_object('severity', p_severity)
  );
  return v_flag.id;
end;
$$;

create or replace function public.transition_event_promoter_risk_flag(
  p_risk_flag_id uuid,
  p_actor_id uuid,
  p_action text,
  p_reason text,
  p_severity text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_flag public.promoter_risk_flags%rowtype;
  v_status text;
begin
  if p_action not in ('reviewing', 'resolved', 'dismissed', 'severity_changed') then
    raise exception 'unsupported risk flag action' using errcode = '22023';
  end if;
  if nullif(trim(p_reason), '') is null then
    raise exception 'risk flag reason is required' using errcode = '22023';
  end if;
  if p_action = 'severity_changed' and coalesce(p_severity, '') not in ('low', 'medium', 'high', 'critical') then
    raise exception 'valid severity is required for severity_changed' using errcode = '22023';
  end if;

  select flag.* into v_flag
  from public.promoter_risk_flags flag
  where flag.id = p_risk_flag_id
  for update;
  if not found then
    raise exception 'risk flag not found' using errcode = 'P0002';
  end if;

  v_status := case p_action
    when 'reviewing' then 'reviewing'
    when 'resolved' then 'resolved'
    when 'dismissed' then 'dismissed'
    else v_flag.status
  end;

  update public.promoter_risk_flags
  set status = v_status,
      severity = coalesce(p_severity, severity),
      reviewed_by = case when p_action in ('resolved', 'dismissed') then p_actor_id else reviewed_by end,
      reviewed_at = case when p_action in ('resolved', 'dismissed') then now() else reviewed_at end,
      updated_at = now()
  where id = v_flag.id;

  insert into public.promoter_risk_flag_events (
    risk_flag_id, action, actor_id, reason, metadata
  ) values (
    v_flag.id, p_action, p_actor_id, trim(p_reason),
    jsonb_build_object('previous_status', v_flag.status, 'next_status', v_status, 'previous_severity', v_flag.severity, 'next_severity', coalesce(p_severity, v_flag.severity))
  );

  return jsonb_build_object('risk_flag_id', v_flag.id, 'status', v_status, 'severity', coalesce(p_severity, v_flag.severity));
end;
$$;

create or replace function public.get_event_promoter_rollout_readiness(p_event_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with program as (
    select id, status from public.event_promotion_programs where event_id = p_event_id
  ),
  risks as (
    select count(*) filter (where flag.severity in ('high', 'critical') and flag.status in ('open', 'reviewing'))::bigint as blocking_risks
    from public.promoter_risk_flags flag
    join program on program.id = flag.program_id
  ),
  batches as (
    select count(*) filter (where status = 'failed')::bigint as failed_batches,
      count(*) filter (where status in ('allocated', 'submitted'))::bigint as in_flight_batches
    from public.promoter_payout_batches where event_id = p_event_id
  ),
  ledger as (
    select count(*) filter (where entry_type = 'earned')::bigint as earned_entries,
      count(*) filter (where entry_type in ('refund_reversal', 'chargeback_reversal'))::bigint as reversal_entries
    from public.promoter_commission_ledger commission
    join program on program.id = commission.program_id
  ),
  flags as (
    select coalesce(jsonb_object_agg(key, enabled and coalesce(rollout_percentage, 0) > 0), '{}'::jsonb) as rows
    from public.feature_flags
    where key in (
      'event_promoter_program_enabled', 'event_promoter_applications_enabled',
      'event_promoter_attribution_capture_enabled', 'event_promoter_shadow_commissions_enabled',
      'event_promoter_payable_commissions_enabled', 'event_promoter_payouts_enabled'
    )
  )
  select jsonb_build_object(
    'event_id', p_event_id,
    'program_statuses', coalesce((select jsonb_agg(status order by status) from program), '[]'::jsonb),
    'flags', (select rows from flags),
    'blocking_risks', coalesce((select blocking_risks from risks), 0),
    'failed_batches', coalesce((select failed_batches from batches), 0),
    'in_flight_batches', coalesce((select in_flight_batches from batches), 0),
    'earned_entries', coalesce((select earned_entries from ledger), 0),
    'reversal_entries', coalesce((select reversal_entries from ledger), 0),
    'automatic_payouts_ready', false,
    'automatic_payouts_blocker', 'promoter_kyc_and_connect_readiness_not_proven'
  );
$$;

revoke all on function public.create_event_promoter_risk_flag(uuid, uuid, uuid, uuid, uuid, text, text, uuid, text, jsonb) from public;
revoke all on function public.transition_event_promoter_risk_flag(uuid, uuid, text, text, text) from public;
revoke all on function public.get_event_promoter_rollout_readiness(uuid) from public;
grant execute on function public.create_event_promoter_risk_flag(uuid, uuid, uuid, uuid, uuid, text, text, uuid, text, jsonb) to service_role;
grant execute on function public.transition_event_promoter_risk_flag(uuid, uuid, text, text, text) to service_role;
grant execute on function public.get_event_promoter_rollout_readiness(uuid) to service_role;

comment on table public.promoter_risk_flag_events is 'Append-only investigation history for promoter risk flags.';
comment on table public.promoter_network_operational_events is 'Privacy-minimized Event Promoter operational telemetry. No buyer, payment, IP, token, or user-agent data is permitted.';

-- Rollback: disable the promoter feature flags. Do not delete financial,
-- investigation, or operational history; apply forward fixes additively.
