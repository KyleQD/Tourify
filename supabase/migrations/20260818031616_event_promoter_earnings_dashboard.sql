-- Phase 7: a promoter-owned read model. The public RPC exposes only
-- server-derived aggregates/assets and never accepts a membership or user ID.
-- The private definer function is intentionally non-exposed; it derives the
-- owner solely from auth.uid() and bypasses raw financial table access safely.

set client_min_messages = warning;

create or replace function private.get_my_event_promoter_earnings_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $$
  with memberships as (
    select
      membership.id as membership_id,
      membership.status as membership_status,
      membership.approved_at,
      membership.suspended_at,
      membership.revoked_at,
      program.id as program_id,
      program.event_id,
      program.status as program_status,
      program.commission_type,
      program.commission_rate_bps,
      program.commission_fixed_amount_minor,
      program.currency,
      program.attribution_window_days,
      event.title as event_title,
      event.start_at as event_starts_at
    from public.event_promoter_memberships membership
    join public.event_promotion_programs program on program.id = membership.program_id
    join public.events_v2 event on event.id = program.event_id
    where membership.user_id = auth.uid()
  ),
  attribution_totals as (
    select
      attribution.membership_id,
      count(*)::bigint as attributed_sales,
      coalesce(sum(attribution.eligible_revenue_minor), 0)::bigint as eligible_revenue_minor,
      coalesce(sum(sale.quantity), 0)::bigint as tickets_sold
    from public.ticket_sale_attributions attribution
    join public.ticket_sales sale on sale.id = attribution.order_id
    join memberships membership on membership.membership_id = attribution.membership_id
    group by attribution.membership_id
  ),
  click_totals as (
    select
      touchpoint.membership_id,
      count(*)::bigint as clicks,
      count(distinct touchpoint.anonymous_session_id) filter (where touchpoint.anonymous_session_id is not null)::bigint as unique_sessions
    from public.promoter_attribution_touchpoints touchpoint
    join memberships membership on membership.membership_id = touchpoint.membership_id
    group by touchpoint.membership_id
  ),
  ledger_totals as (
    select
      ledger.membership_id,
      ledger.currency,
      coalesce(sum(ledger.amount_minor) filter (where ledger.entry_type = 'earned'), 0)::bigint as earned_minor,
      coalesce(sum(ledger.amount_minor) filter (where ledger.entry_type = 'dispute_reinstatement'), 0)::bigint as reinstated_minor,
      coalesce(sum(-ledger.amount_minor) filter (where ledger.entry_type in ('refund_reversal', 'chargeback_reversal')), 0)::bigint as reversed_minor,
      coalesce(sum(ledger.amount_minor) filter (where ledger.status = 'pending'), 0)::bigint as pending_minor,
      coalesce(sum(ledger.amount_minor) filter (where ledger.status = 'available'), 0)::bigint as available_minor,
      coalesce(sum(ledger.amount_minor) filter (where ledger.status = 'paid'), 0)::bigint as paid_minor,
      coalesce(sum(ledger.amount_minor) filter (where ledger.status = 'held'), 0)::bigint as held_minor,
      coalesce(sum(ledger.amount_minor), 0)::bigint as net_minor
    from public.promoter_commission_ledger ledger
    join memberships membership on membership.membership_id = ledger.membership_id
    group by ledger.membership_id, ledger.currency
  ),
  payout_totals as (
    select
      allocation.membership_id,
      count(*)::bigint as payout_allocations,
      coalesce(sum(allocation.amount_minor) filter (where allocation.status = 'paid'), 0)::bigint as paid_out_minor,
      coalesce(sum(allocation.amount_minor) filter (where allocation.status in ('pending', 'allocated')), 0)::bigint as in_flight_payout_minor
    from public.promoter_payout_allocations allocation
    join memberships membership on membership.membership_id = allocation.membership_id
    group by allocation.membership_id
  ),
  assets as (
    select
      membership.membership_id,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', link.id,
          'label', link.label,
          'status', link.status,
          'destination_path', link.destination_path,
          'expires_at', link.expires_at,
          'created_at', link.created_at
        ) order by link.created_at desc)
        from public.promoter_tracking_links link
        where link.membership_id = membership.membership_id
      ), '[]'::jsonb) as tracking_links,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', binding.id,
          'code', code.code,
          'status', binding.status,
          'created_at', binding.created_at
        ) order by binding.created_at desc)
        from public.promoter_promo_code_bindings binding
        join public.promo_codes code on code.id = binding.promo_code_id
        where binding.membership_id = membership.membership_id
      ), '[]'::jsonb) as promo_codes,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', source.id,
          'source_type', source.source_type,
          'source_id', source.source_id,
          'created_at', source.created_at
        ) order by source.created_at desc)
        from public.promoter_social_sources source
        where source.membership_id = membership.membership_id
      ), '[]'::jsonb) as social_sources
    from memberships membership
  ),
  source_performance as (
    select
      membership.membership_id,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'source_type', source_type,
          'clicks', clicks,
          'attributed_sales', attributed_sales,
          'eligible_revenue_minor', eligible_revenue_minor
        ) order by source_type)
        from (
          select
            source_type,
            sum(clicks)::bigint as clicks,
            sum(attributed_sales)::bigint as attributed_sales,
            sum(eligible_revenue_minor)::bigint as eligible_revenue_minor
          from (
          select
            source_type,
            count(*)::bigint as clicks,
            0::bigint as attributed_sales,
            0::bigint as eligible_revenue_minor
          from public.promoter_attribution_touchpoints touchpoint
          where touchpoint.membership_id = membership.membership_id
          group by source_type
          union all
          select
            attribution.source_type,
            0::bigint as clicks,
            count(*)::bigint as attributed_sales,
            coalesce(sum(attribution.eligible_revenue_minor), 0)::bigint as eligible_revenue_minor
          from public.ticket_sale_attributions attribution
          where attribution.membership_id = membership.membership_id
          group by attribution.source_type
          ) source_rows
          group by source_type
        ) grouped_sources
      ), '[]'::jsonb) as rows
    from memberships membership
  ),
  program_rows as (
    select jsonb_build_object(
      'membership_id', membership.membership_id,
      'membership_status', membership.membership_status,
      'program_id', membership.program_id,
      'program_status', membership.program_status,
      'event_id', membership.event_id,
      'event_title', membership.event_title,
      'event_starts_at', membership.event_starts_at,
      'commission_type', membership.commission_type,
      'commission_rate_bps', membership.commission_rate_bps,
      'commission_fixed_amount_minor', membership.commission_fixed_amount_minor,
      'currency', membership.currency,
      'attribution_window_days', membership.attribution_window_days,
      'clicks', coalesce(clicks.clicks, 0),
      'unique_sessions', coalesce(clicks.unique_sessions, 0),
      'attributed_sales', coalesce(attribution.attributed_sales, 0),
      'tickets_sold', coalesce(attribution.tickets_sold, 0),
      'eligible_revenue_minor', coalesce(attribution.eligible_revenue_minor, 0),
      'conversion_rate', case when coalesce(clicks.clicks, 0) = 0 then 0 else round(coalesce(attribution.attributed_sales, 0)::numeric / clicks.clicks, 4) end,
      'earned_minor', coalesce(ledger.earned_minor, 0),
      'reinstated_minor', coalesce(ledger.reinstated_minor, 0),
      'reversed_minor', coalesce(ledger.reversed_minor, 0),
      'pending_minor', coalesce(ledger.pending_minor, 0),
      'available_minor', coalesce(ledger.available_minor, 0),
      'paid_minor', coalesce(ledger.paid_minor, 0),
      'held_minor', coalesce(ledger.held_minor, 0),
      'net_commission_minor', coalesce(ledger.net_minor, 0),
      'payout_allocations', coalesce(payout.payout_allocations, 0),
      'paid_out_minor', coalesce(payout.paid_out_minor, 0),
      'in_flight_payout_minor', coalesce(payout.in_flight_payout_minor, 0),
      'assets', jsonb_build_object(
        'tracking_links', assets.tracking_links,
        'promo_codes', assets.promo_codes,
        'social_sources', assets.social_sources
      ),
      'source_performance', sources.rows
    ) as row,
    membership.event_starts_at
    from memberships membership
    left join attribution_totals attribution on attribution.membership_id = membership.membership_id
    left join click_totals clicks on clicks.membership_id = membership.membership_id
    left join ledger_totals ledger on ledger.membership_id = membership.membership_id and ledger.currency = membership.currency
    left join payout_totals payout on payout.membership_id = membership.membership_id
    join assets on assets.membership_id = membership.membership_id
    join source_performance sources on sources.membership_id = membership.membership_id
  ),
  earnings_by_currency as (
    select jsonb_agg(jsonb_build_object(
      'currency', currency,
      'earned_minor', earned_minor,
      'reinstated_minor', reinstated_minor,
      'reversed_minor', reversed_minor,
      'pending_minor', pending_minor,
      'available_minor', available_minor,
      'paid_minor', paid_minor,
      'held_minor', held_minor,
      'net_commission_minor', net_minor
    ) order by currency) as rows
    from (
      select
        currency,
        sum(earned_minor)::bigint as earned_minor,
        sum(reinstated_minor)::bigint as reinstated_minor,
        sum(reversed_minor)::bigint as reversed_minor,
        sum(pending_minor)::bigint as pending_minor,
        sum(available_minor)::bigint as available_minor,
        sum(paid_minor)::bigint as paid_minor,
        sum(held_minor)::bigint as held_minor,
        sum(net_minor)::bigint as net_minor
      from ledger_totals
      group by currency
    ) totals
  ),
  latest_ledger as (
    select jsonb_agg(row order by occurred_at desc, ledger_id desc) as rows
    from (
      select
        ledger.id as ledger_id,
        ledger.occurred_at,
        jsonb_build_object(
          'id', ledger.id,
          'membership_id', ledger.membership_id,
          'program_id', ledger.program_id,
          'event_id', attribution.event_id,
          'entry_type', ledger.entry_type,
          'status', ledger.status,
          'amount_minor', ledger.amount_minor,
          'currency', ledger.currency,
          'eligible_revenue_minor', ledger.eligible_revenue_minor,
          'payment_reference_present', ledger.payment_reference is not null,
          'reason', ledger.reason,
          'occurred_at', ledger.occurred_at
        ) as row
      from public.promoter_commission_ledger ledger
      join public.ticket_sale_attributions attribution on attribution.id = ledger.attribution_id
      join memberships membership on membership.membership_id = ledger.membership_id
      order by ledger.occurred_at desc, ledger.id desc
      limit 100
    ) entries
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'program_count', (select count(*) from memberships),
      'clicks', coalesce((select sum(clicks) from click_totals), 0),
      'unique_sessions', coalesce((select sum(unique_sessions) from click_totals), 0),
      'attributed_sales', coalesce((select sum(attributed_sales) from attribution_totals), 0),
      'tickets_sold', coalesce((select sum(tickets_sold) from attribution_totals), 0),
      'eligible_revenue_minor', coalesce((select sum(eligible_revenue_minor) from attribution_totals), 0),
      'earnings_by_currency', coalesce((select rows from earnings_by_currency), '[]'::jsonb)
    ),
    'programs', coalesce((select jsonb_agg(row order by event_starts_at nulls last) from program_rows), '[]'::jsonb),
    'ledger_entries', coalesce((select rows from latest_ledger), '[]'::jsonb)
  );
$$;

create or replace function public.get_my_event_promoter_earnings_dashboard()
returns jsonb
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.get_my_event_promoter_earnings_dashboard();
$$;

revoke all privileges on function private.get_my_event_promoter_earnings_dashboard() from public;
revoke all privileges on function public.get_my_event_promoter_earnings_dashboard() from public;
grant execute on function private.get_my_event_promoter_earnings_dashboard() to authenticated;
grant execute on function public.get_my_event_promoter_earnings_dashboard() to authenticated;
