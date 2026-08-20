-- Phase 5: explainable, non-payable checkout attribution. This preserves a
-- shadow decision per order without creating ticket_sale_attributions or ledger
-- entries; Phase 6 is the only phase allowed to create financial records.

create table if not exists public.promoter_checkout_shadow_attributions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.ticket_sales(id) on delete restrict,
  event_id uuid not null references public.events_v2(id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  buyer_user_id uuid references auth.users(id) on delete set null,
  decision text not null check (decision in ('attributed', 'none')),
  decision_reason text not null,
  program_id uuid references public.event_promotion_programs(id) on delete restrict,
  membership_id uuid references public.event_promoter_memberships(id) on delete restrict,
  source_type text check (source_type in ('promo_code', 'tracking_link', 'tourify_post', 'tourify_share')),
  source_id uuid,
  touchpoint_id uuid references public.promoter_attribution_touchpoints(id) on delete set null,
  resolved_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (
    (decision = 'attributed' and program_id is not null and membership_id is not null and source_type is not null)
    or
    (decision = 'none' and program_id is null and membership_id is null and source_type is null)
  )
);

create index if not exists promoter_checkout_shadow_attributions_event_idx
  on public.promoter_checkout_shadow_attributions (event_id, created_at desc);
create index if not exists promoter_checkout_shadow_attributions_membership_idx
  on public.promoter_checkout_shadow_attributions (membership_id, created_at desc)
  where membership_id is not null;

alter table public.promoter_checkout_shadow_attributions enable row level security;
revoke all privileges on table public.promoter_checkout_shadow_attributions from public;

create or replace function public.prevent_promoter_checkout_shadow_attribution_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'promoter checkout shadow attributions are append-only';
end;
$$;

drop trigger if exists prevent_promoter_checkout_shadow_attribution_update on public.promoter_checkout_shadow_attributions;
create trigger prevent_promoter_checkout_shadow_attribution_update
  before update or delete on public.promoter_checkout_shadow_attributions
  for each row execute function public.prevent_promoter_checkout_shadow_attribution_mutation();

create or replace function public.resolve_event_promoter_checkout_shadow_attribution(
  p_order_id uuid,
  p_anonymous_session_id text default null
)
returns table (
  id uuid,
  order_id uuid,
  decision text,
  decision_reason text,
  program_id uuid,
  membership_id uuid,
  source_type text,
  source_id uuid,
  touchpoint_id uuid,
  resolved_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_existing public.promoter_checkout_shadow_attributions%rowtype;
  v_order record;
  v_candidate record;
  v_decision text := 'none';
  v_decision_reason text := 'no_eligible_promoter_attribution';
  v_inserted public.promoter_checkout_shadow_attributions%rowtype;
begin
  select * into v_existing
  from public.promoter_checkout_shadow_attributions
  where order_id = p_order_id;
  if found then
    return query select v_existing.id, v_existing.order_id, v_existing.decision,
      v_existing.decision_reason, v_existing.program_id, v_existing.membership_id,
      v_existing.source_type, v_existing.source_id, v_existing.touchpoint_id,
      v_existing.resolved_at;
    return;
  end if;

  select sale.id, sale.event_id, sale.ticket_type_id, sale.buyer_user_id, sale.promo_code_id
  into v_order
  from public.ticket_sales sale
  where sale.id = p_order_id;
  if not found then
    raise exception 'ticket order not found' using errcode = 'P0002';
  end if;

  -- Explicit promoter-bound promo codes are always evaluated first.
  select binding.program_id, binding.membership_id, 'promo_code'::text as source_type,
    binding.promo_code_id as source_id, null::uuid as touchpoint_id, membership.user_id as promoter_user_id
  into v_candidate
  from public.promoter_promo_code_bindings binding
  join public.event_promoter_memberships membership on membership.id = binding.membership_id
  join public.event_promotion_programs program on program.id = binding.program_id
  where binding.promo_code_id = v_order.promo_code_id
    and binding.event_id = v_order.event_id
    and binding.status = 'active'
    and membership.status = 'approved'
    and program.status = 'open'
    and (program.starts_at is null or program.starts_at <= now())
    and (program.ends_at is null or program.ends_at > now())
    and (
      not exists (
        select 1 from public.event_promotion_ticket_eligibility eligibility
        where eligibility.program_id = program.id
      )
      or exists (
        select 1 from public.event_promotion_ticket_eligibility eligibility
        where eligibility.program_id = program.id and eligibility.ticket_type_id = v_order.ticket_type_id
      )
    )
  limit 1;

  -- The newest still-valid first-party touch wins when no promoter code applies.
  if not found and p_anonymous_session_id is not null then
    select touchpoint.program_id, touchpoint.membership_id,
      coalesce(social.source_type, 'tracking_link') as source_type,
      coalesce(social.source_id, touchpoint.source_id) as source_id,
      touchpoint.id as touchpoint_id, membership.user_id as promoter_user_id
    into v_candidate
    from public.promoter_attribution_touchpoints touchpoint
    join public.event_promoter_memberships membership on membership.id = touchpoint.membership_id
    join public.event_promotion_programs program on program.id = touchpoint.program_id
    left join public.promoter_social_sources social
      on social.membership_id = touchpoint.membership_id
      and social.tracking_link_id = touchpoint.source_id
    where touchpoint.event_id = v_order.event_id
      and touchpoint.anonymous_session_id = p_anonymous_session_id
      and touchpoint.expires_at > now()
      and touchpoint.source_type = 'tracking_link'
      and membership.status = 'approved'
      and program.status = 'open'
      and (program.starts_at is null or program.starts_at <= now())
      and (program.ends_at is null or program.ends_at > now())
      and (
        not exists (
          select 1 from public.event_promotion_ticket_eligibility eligibility
          where eligibility.program_id = program.id
        )
        or exists (
          select 1 from public.event_promotion_ticket_eligibility eligibility
          where eligibility.program_id = program.id and eligibility.ticket_type_id = v_order.ticket_type_id
        )
      )
    order by touchpoint.occurred_at desc
    limit 1;
  end if;

  if found then
    if v_order.buyer_user_id is not null and v_order.buyer_user_id = v_candidate.promoter_user_id then
      v_decision_reason := 'self_referral_blocked';
    else
      v_decision := 'attributed';
      v_decision_reason := case v_candidate.source_type
        when 'promo_code' then 'promoter_promo_code_precedence'
        when 'tourify_post' then 'native_post_tracking_context'
        when 'tourify_share' then 'native_share_tracking_context'
        else 'latest_valid_tracking_link_touch'
      end;
    end if;
  end if;

  insert into public.promoter_checkout_shadow_attributions (
    order_id, event_id, ticket_type_id, buyer_user_id, decision, decision_reason,
    program_id, membership_id, source_type, source_id, touchpoint_id, evidence
  ) values (
    v_order.id, v_order.event_id, v_order.ticket_type_id, v_order.buyer_user_id,
    v_decision, v_decision_reason,
    case when v_decision = 'attributed' then v_candidate.program_id else null end,
    case when v_decision = 'attributed' then v_candidate.membership_id else null end,
    case when v_decision = 'attributed' then v_candidate.source_type else null end,
    case when v_decision = 'attributed' then v_candidate.source_id else null end,
    case when v_decision = 'attributed' then v_candidate.touchpoint_id else null end,
    jsonb_build_object(
      'resolver_version', 'phase5-shadow-v1',
      'promo_code_present', v_order.promo_code_id is not null,
      'first_party_session_present', p_anonymous_session_id is not null,
      'candidate_found', found,
      'payable_commission_created', false
    )
  ) on conflict (order_id) do nothing
  returning * into v_inserted;

  if v_inserted.id is null then
    select * into v_inserted
    from public.promoter_checkout_shadow_attributions
    where order_id = p_order_id;
  end if;

  return query select v_inserted.id, v_inserted.order_id, v_inserted.decision,
    v_inserted.decision_reason, v_inserted.program_id, v_inserted.membership_id,
    v_inserted.source_type, v_inserted.source_id, v_inserted.touchpoint_id,
    v_inserted.resolved_at;
end;
$$;

revoke all privileges on function public.resolve_event_promoter_checkout_shadow_attribution(uuid, text) from public;
grant execute on function public.resolve_event_promoter_checkout_shadow_attribution(uuid, text) to service_role;
