-- Phase 6: Convert a verified paid ticket order into exactly one immutable
-- promoter attribution and financial entitlement. All amounts below are integer
-- minor units. Tourify's native ticket Stripe Checkout currently settles USD;
-- a program in another currency is intentionally not credited without an
-- explicit FX policy and conversion record.

set client_min_messages = warning;

create unique index if not exists ticket_sale_attributions_one_per_order_idx
  on public.ticket_sale_attributions (order_id);

create index if not exists promoter_commission_ledger_originating_entry_idx
  on public.promoter_commission_ledger (originating_entry_id, entry_type, created_at desc)
  where originating_entry_id is not null;

-- This function is deliberately service-role-only. The order row lock and the
-- unique attribution/ledger keys make webhook retries and concurrent workers
-- converge on the original immutable records.
create or replace function public.finalize_event_promoter_commission(
  p_order_id uuid,
  p_payment_reference text default null
)
returns table (
  attribution_id uuid,
  ledger_entry_id uuid,
  finalized boolean,
  reason text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.ticket_sales%rowtype;
  v_existing_attribution public.ticket_sale_attributions%rowtype;
  v_existing_ledger public.promoter_commission_ledger%rowtype;
  v_shadow public.promoter_checkout_shadow_attributions%rowtype;
  v_membership public.event_promoter_memberships%rowtype;
  v_program public.event_promotion_programs%rowtype;
  v_version public.event_promotion_program_versions%rowtype;
  v_ticket_rule jsonb;
  v_sale_time timestamptz;
  v_commission_type text;
  v_commission_rate_bps integer;
  v_commission_fixed_amount_minor bigint;
  v_eligible_revenue_minor bigint;
  v_commission_minor bigint;
  v_currency text;
begin
  select sale.* into v_order
  from public.ticket_sales sale
  where sale.id = p_order_id
  for update;

  if not found then
    raise exception 'ticket order not found' using errcode = 'P0002';
  end if;
  if v_order.payment_status not in ('completed', 'paid') then
    return query select null::uuid, null::uuid, false, 'order_not_paid';
    return;
  end if;

  select attribution.* into v_existing_attribution
  from public.ticket_sale_attributions attribution
  where attribution.order_id = p_order_id;
  if found then
    select ledger.* into v_existing_ledger
    from public.promoter_commission_ledger ledger
    where ledger.attribution_id = v_existing_attribution.id
      and ledger.entry_type = 'earned'
    order by ledger.created_at
    limit 1;
    return query select v_existing_attribution.id, v_existing_ledger.id,
      true, case when v_existing_ledger.id is null then 'zero_commission' else 'already_finalized' end;
    return;
  end if;

  select shadow.* into v_shadow
  from public.promoter_checkout_shadow_attributions shadow
  where shadow.order_id = p_order_id
    and shadow.decision = 'attributed';
  if not found then
    return query select null::uuid, null::uuid, false, 'no_payable_shadow_attribution';
    return;
  end if;
  if v_shadow.event_id <> v_order.event_id or v_shadow.ticket_type_id <> v_order.ticket_type_id then
    return query select null::uuid, null::uuid, false, 'shadow_order_mismatch';
    return;
  end if;

  v_sale_time := coalesce(v_order.finalized_at, v_order.updated_at, now());

  select membership.* into v_membership
  from public.event_promoter_memberships membership
  where membership.id = v_shadow.membership_id
    and membership.program_id = v_shadow.program_id;
  if not found
    or v_membership.approved_at > v_sale_time
    or (v_membership.suspended_at is not null and v_membership.suspended_at <= v_sale_time)
    or (v_membership.revoked_at is not null and v_membership.revoked_at <= v_sale_time)
    or (v_order.buyer_user_id is not null and v_order.buyer_user_id = v_membership.user_id) then
    return query select null::uuid, null::uuid, false, 'membership_or_self_referral_ineligible';
    return;
  end if;

  select program.* into v_program
  from public.event_promotion_programs program
  where program.id = v_shadow.program_id
    and program.event_id = v_order.event_id;
  if not found
    or (v_program.starts_at is not null and v_program.starts_at > v_sale_time)
    or (v_program.ends_at is not null and v_program.ends_at <= v_sale_time)
    -- A state change recorded after the payment does not rewrite valid sale
    -- history; one recorded before payment blocks finalization.
    or (v_program.status <> 'open' and v_program.updated_at <= v_sale_time) then
    return query select null::uuid, null::uuid, false, 'program_ineligible_at_sale_time';
    return;
  end if;

  select version.* into v_version
  from public.event_promotion_program_versions version
  where version.program_id = v_program.id
    and version.effective_at <= v_sale_time
  order by version.effective_at desc, version.version_number desc
  limit 1;
  if not found then
    return query select null::uuid, null::uuid, false, 'no_effective_program_version';
    return;
  end if;

  select rule.value into v_ticket_rule
  from jsonb_array_elements(coalesce(v_version.eligible_ticket_rules, '[]'::jsonb)) as rule(value)
  where rule.value->>'ticket_type_id' = v_order.ticket_type_id::text
  limit 1;
  if v_ticket_rule is null then
    return query select null::uuid, null::uuid, false, 'ticket_type_ineligible';
    return;
  end if;

  -- Native ticket checkout currently charges USD. Do not invent a conversion
  -- when organizer terms are denominated in a different currency.
  v_currency := lower(v_version.currency);
  if v_currency <> 'usd' then
    return query select null::uuid, null::uuid, false, 'unsupported_payment_currency';
    return;
  end if;

  v_commission_type := coalesce(nullif(v_ticket_rule->>'commission_type_override', ''), v_version.commission_type);
  v_commission_rate_bps := coalesce(nullif(v_ticket_rule->>'commission_rate_bps_override', '')::integer, v_version.commission_rate_bps);
  v_commission_fixed_amount_minor := coalesce(nullif(v_ticket_rule->>'commission_fixed_amount_minor_override', '')::bigint, v_version.commission_fixed_amount_minor);
  v_eligible_revenue_minor := greatest(
    0::bigint,
    floor((coalesce(v_order.unit_price, 0) * v_order.quantity - coalesce(v_order.discount_amount, 0)) * 100)::bigint
  );

  if v_commission_type = 'percentage' then
    v_commission_minor := floor(v_eligible_revenue_minor::numeric * v_commission_rate_bps / 10000)::bigint;
  elsif v_commission_type = 'fixed_per_ticket' then
    v_commission_minor := v_commission_fixed_amount_minor * v_order.quantity;
  else
    raise exception 'unknown promoter commission type' using errcode = '22023';
  end if;
  v_commission_minor := least(greatest(v_commission_minor, 0::bigint), v_eligible_revenue_minor);

  insert into public.ticket_sale_attributions (
    order_id, ticket_type_id, event_id, program_id, program_version_id,
    membership_id, touchpoint_id, source_type, source_id, attribution_rule,
    attributed_at, eligible_revenue_minor, currency, snapshot_metadata, idempotency_key
  ) values (
    v_order.id, v_order.ticket_type_id, v_order.event_id, v_program.id, v_version.id,
    v_membership.id, v_shadow.touchpoint_id, v_shadow.source_type, v_shadow.source_id,
    v_shadow.decision_reason, v_sale_time, v_eligible_revenue_minor, v_currency,
    jsonb_build_object(
      'finalizer_version', 'phase6-v1',
      'payment_reference', coalesce(p_payment_reference, v_order.payment_reference),
      'program_version_number', v_version.version_number,
      'commission_type', v_commission_type,
      'commission_rate_bps', v_commission_rate_bps,
      'commission_fixed_amount_minor', v_commission_fixed_amount_minor,
      'quantity', v_order.quantity,
      'ticket_subtotal_minor', floor(coalesce(v_order.unit_price, 0) * v_order.quantity * 100)::bigint,
      'discount_minor', floor(coalesce(v_order.discount_amount, 0) * 100)::bigint,
      'tax_minor_excluded', floor(coalesce(v_order.tax_amount, 0) * 100)::bigint,
      'processing_fee_minor_excluded', floor(coalesce(v_order.processing_fee_amount, 0) * 100)::bigint,
      'platform_fee_minor_excluded', floor(coalesce(v_order.platform_fee_amount, 0) * 100)::bigint,
      'rounding', 'floor'
    ),
    'promoter:attribution:' || v_order.id::text
  ) on conflict (order_id) do nothing
  returning id into attribution_id;

  if attribution_id is null then
    select attribution.id into attribution_id
    from public.ticket_sale_attributions attribution
    where attribution.order_id = v_order.id;
  end if;

  if v_commission_minor = 0 then
    return query select attribution_id, null::uuid, true, 'zero_commission';
    return;
  end if;

  insert into public.promoter_commission_ledger (
    membership_id, program_id, attribution_id, entry_type, status, amount_minor,
    currency, eligible_revenue_minor, commission_type, commission_rate_bps,
    commission_fixed_amount_minor, payment_reference, idempotency_key, reason, occurred_at
  ) values (
    v_membership.id, v_program.id, attribution_id, 'earned', 'pending', v_commission_minor,
    v_currency, v_eligible_revenue_minor, v_commission_type, v_commission_rate_bps,
    v_commission_fixed_amount_minor, coalesce(p_payment_reference, v_order.payment_reference),
    'promoter:earned:' || v_order.id::text,
    'Verified ticket payment; floor rounding in integer minor units.', v_sale_time
  ) on conflict (idempotency_key) do nothing
  returning id into ledger_entry_id;

  if ledger_entry_id is null then
    select ledger.id into ledger_entry_id
    from public.promoter_commission_ledger ledger
    where ledger.idempotency_key = 'promoter:earned:' || v_order.id::text;
  end if;

  return query select attribution_id, ledger_entry_id, true, 'earned';
end;
$$;

create or replace function public.reverse_event_promoter_commission(
  p_order_id uuid,
  p_reversal_type text,
  p_cumulative_refund_minor bigint,
  p_payment_reference text default null
)
returns table (
  ledger_entry_id uuid,
  reversed_amount_minor bigint,
  reason text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order public.ticket_sales%rowtype;
  v_attribution public.ticket_sale_attributions%rowtype;
  v_earned public.promoter_commission_ledger%rowtype;
  v_total_paid_minor bigint;
  v_target_reversal_minor bigint;
  v_already_reversed_minor bigint;
  v_delta_minor bigint;
  v_key text;
begin
  if p_reversal_type not in ('refund_reversal', 'chargeback_reversal') then
    raise exception 'unsupported promoter reversal type' using errcode = '22023';
  end if;
  if p_cumulative_refund_minor is null or p_cumulative_refund_minor <= 0 then
    raise exception 'cumulative refunded amount must be positive' using errcode = '22023';
  end if;

  select sale.* into v_order
  from public.ticket_sales sale
  where sale.id = p_order_id
  for update;
  if not found then
    raise exception 'ticket order not found' using errcode = 'P0002';
  end if;

  select attribution.* into v_attribution
  from public.ticket_sale_attributions attribution
  where attribution.order_id = p_order_id;
  if not found then
    return query select null::uuid, 0::bigint, 'no_finalized_attribution';
    return;
  end if;
  select ledger.* into v_earned
  from public.promoter_commission_ledger ledger
  where ledger.attribution_id = v_attribution.id
    and ledger.entry_type = 'earned'
  order by ledger.created_at
  limit 1;
  if not found then
    return query select null::uuid, 0::bigint, 'no_earned_commission';
    return;
  end if;

  v_total_paid_minor := greatest(0::bigint, floor(coalesce(v_order.total_amount, 0) * 100)::bigint);
  if v_total_paid_minor = 0 then
    return query select null::uuid, 0::bigint, 'zero_order_total';
    return;
  end if;
  v_target_reversal_minor := floor(
    v_earned.amount_minor::numeric
      * least(p_cumulative_refund_minor, v_total_paid_minor)::numeric
      / v_total_paid_minor::numeric
  )::bigint;

  -- Reversals are cumulative across refunds and chargebacks, so a full refund
  -- after a partial refund appends only the remaining negative amount.
  select coalesce(sum(-ledger.amount_minor), 0)::bigint into v_already_reversed_minor
  from public.promoter_commission_ledger ledger
  where ledger.originating_entry_id = v_earned.id
    and ledger.entry_type in ('refund_reversal', 'chargeback_reversal');
  v_delta_minor := greatest(0::bigint, v_target_reversal_minor - v_already_reversed_minor);
  if v_delta_minor = 0 then
    return query select null::uuid, 0::bigint, 'already_reversed_to_cumulative_amount';
    return;
  end if;

  v_key := 'promoter:' || p_reversal_type || ':' || p_order_id::text || ':' || p_cumulative_refund_minor::text;
  insert into public.promoter_commission_ledger (
    membership_id, program_id, attribution_id, entry_type, status, amount_minor,
    currency, eligible_revenue_minor, commission_type, commission_rate_bps,
    commission_fixed_amount_minor, originating_entry_id, payment_reference,
    idempotency_key, reason
  ) values (
    v_earned.membership_id, v_earned.program_id, v_attribution.id, p_reversal_type,
    'pending', -v_delta_minor, v_earned.currency,
    floor(v_attribution.eligible_revenue_minor::numeric
      * least(p_cumulative_refund_minor, v_total_paid_minor)::numeric / v_total_paid_minor::numeric)::bigint,
    v_earned.commission_type, v_earned.commission_rate_bps, v_earned.commission_fixed_amount_minor,
    v_earned.id, p_payment_reference, v_key,
    'Verified payment reversal; cumulative prorated floor calculation.'
  ) on conflict (idempotency_key) do nothing
  returning id into ledger_entry_id;

  if ledger_entry_id is null then
    select ledger.id into ledger_entry_id
    from public.promoter_commission_ledger ledger
    where ledger.idempotency_key = v_key;
  end if;
  return query select ledger_entry_id, v_delta_minor, 'reversed';
end;
$$;

create or replace function public.reinstate_event_promoter_commission(
  p_order_id uuid,
  p_dispute_reference text
)
returns table (
  ledger_entry_id uuid,
  reinstated_amount_minor bigint,
  reason text
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_earned public.promoter_commission_ledger%rowtype;
  v_reversal_total bigint;
  v_key text;
begin
  if p_dispute_reference is null or length(trim(p_dispute_reference)) = 0 then
    raise exception 'dispute reference is required' using errcode = '22023';
  end if;

  select earned.* into v_earned
  from public.ticket_sale_attributions attribution
  join public.promoter_commission_ledger earned
    on earned.attribution_id = attribution.id
    and earned.entry_type = 'earned'
  where attribution.order_id = p_order_id
  order by earned.created_at
  limit 1;
  if not found then
    return query select null::uuid, 0::bigint, 'no_earned_commission';
    return;
  end if;

  select coalesce(sum(-reversal.amount_minor), 0)::bigint into v_reversal_total
  from public.promoter_commission_ledger reversal
  where reversal.originating_entry_id = v_earned.id
    and reversal.entry_type = 'chargeback_reversal'
    and reversal.payment_reference = p_dispute_reference;
  if v_reversal_total = 0 then
    return query select null::uuid, 0::bigint, 'no_chargeback_reversal_for_dispute';
    return;
  end if;

  v_key := 'promoter:dispute-reinstatement:' || p_order_id::text || ':' || p_dispute_reference;
  insert into public.promoter_commission_ledger (
    membership_id, program_id, attribution_id, entry_type, status, amount_minor,
    currency, eligible_revenue_minor, commission_type, commission_rate_bps,
    commission_fixed_amount_minor, originating_entry_id, payment_reference,
    idempotency_key, reason
  ) values (
    v_earned.membership_id, v_earned.program_id, v_earned.attribution_id,
    'dispute_reinstatement', 'pending', v_reversal_total, v_earned.currency,
    v_earned.eligible_revenue_minor, v_earned.commission_type,
    v_earned.commission_rate_bps, v_earned.commission_fixed_amount_minor,
    v_earned.id, p_dispute_reference, v_key,
    'Verified Stripe dispute closed in the merchant''s favor.'
  ) on conflict (idempotency_key) do nothing
  returning id into ledger_entry_id;

  if ledger_entry_id is null then
    select ledger.id into ledger_entry_id
    from public.promoter_commission_ledger ledger
    where ledger.idempotency_key = v_key;
  end if;
  return query select ledger_entry_id, v_reversal_total, 'reinstated';
end;
$$;

-- Finance-only reconciliation source. It is security-invoker and remains
-- service-role-only because it aggregates financial records across promoters.
create or replace function public.get_event_promoter_commission_reconciliation(p_event_id uuid)
returns table (
  event_id uuid,
  membership_id uuid,
  currency text,
  earned_minor bigint,
  reversed_minor bigint,
  net_pending_minor bigint,
  ledger_entries bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    attribution.event_id,
    ledger.membership_id,
    ledger.currency,
    coalesce(sum(ledger.amount_minor) filter (where ledger.entry_type = 'earned'), 0)::bigint as earned_minor,
    coalesce(sum(-ledger.amount_minor) filter (where ledger.entry_type in ('refund_reversal', 'chargeback_reversal')), 0)::bigint as reversed_minor,
    coalesce(sum(ledger.amount_minor) filter (where ledger.status in ('pending', 'held')), 0)::bigint as net_pending_minor,
    count(*)::bigint as ledger_entries
  from public.ticket_sale_attributions attribution
  join public.promoter_commission_ledger ledger on ledger.attribution_id = attribution.id
  where attribution.event_id = p_event_id
  group by attribution.event_id, ledger.membership_id, ledger.currency
  order by ledger.membership_id, ledger.currency;
$$;

revoke all privileges on function public.finalize_event_promoter_commission(uuid, text) from public;
revoke all privileges on function public.reverse_event_promoter_commission(uuid, text, bigint, text) from public;
revoke all privileges on function public.reinstate_event_promoter_commission(uuid, text) from public;
revoke all privileges on function public.get_event_promoter_commission_reconciliation(uuid) from public;
grant execute on function public.finalize_event_promoter_commission(uuid, text) to service_role;
grant execute on function public.reverse_event_promoter_commission(uuid, text, bigint, text) to service_role;
grant execute on function public.reinstate_event_promoter_commission(uuid, text) to service_role;
grant execute on function public.get_event_promoter_commission_reconciliation(uuid) to service_role;
