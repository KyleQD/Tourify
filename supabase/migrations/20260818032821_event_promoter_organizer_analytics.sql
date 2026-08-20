-- Phase 8: organizer-owned promoter analytics. The public RPC receives one
-- event ID, but authorization is rechecked inside a non-exposed definer
-- function before any attribution or financial data is read.

set client_min_messages = warning;

create or replace function private.get_event_promoter_organizer_analytics(p_event_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth, private
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null or not private.can_manage_event_promoter_program(p_event_id) then
    raise exception 'event promoter analytics access denied' using errcode = '42501';
  end if;

  with program as (
    select p.id, p.event_id, p.status, p.currency
    from public.event_promotion_programs p
    where p.event_id = p_event_id
  ),
  applications as (
    select
      count(*)::bigint as applicants,
      count(*) filter (where status = 'approved')::bigint as approved_applications,
      count(*) filter (where status in ('rejected', 'withdrawn', 'expired'))::bigint as declined_applications
    from public.event_promoter_applications
    where program_id in (select id from program)
  ),
  memberships as (
    select membership.*
    from public.event_promoter_memberships membership
    where membership.program_id in (select id from program)
  ),
  attribution_totals as (
    select
      attribution.membership_id,
      count(*)::bigint as attributed_sales,
      coalesce(sum(sale.quantity), 0)::bigint as tickets_sold,
      coalesce(sum(attribution.eligible_revenue_minor), 0)::bigint as eligible_revenue_minor
    from public.ticket_sale_attributions attribution
    join public.ticket_sales sale on sale.id = attribution.order_id
    where attribution.event_id = p_event_id
    group by attribution.membership_id
  ),
  click_totals as (
    select touchpoint.membership_id, count(*)::bigint as clicks
    from public.promoter_attribution_touchpoints touchpoint
    where touchpoint.event_id = p_event_id
    group by touchpoint.membership_id
  ),
  ledger_totals as (
    select
      ledger.membership_id,
      ledger.currency,
      coalesce(sum(ledger.amount_minor) filter (where ledger.entry_type = 'earned'), 0)::bigint as earned_minor,
      coalesce(sum(-ledger.amount_minor) filter (where ledger.entry_type in ('refund_reversal', 'chargeback_reversal')), 0)::bigint as reversed_minor,
      coalesce(sum(ledger.amount_minor) filter (where ledger.status = 'pending'), 0)::bigint as pending_minor,
      coalesce(sum(ledger.amount_minor) filter (where ledger.status = 'available'), 0)::bigint as available_minor,
      coalesce(sum(ledger.amount_minor) filter (where ledger.status = 'paid'), 0)::bigint as paid_minor,
      coalesce(sum(ledger.amount_minor), 0)::bigint as net_minor
    from public.promoter_commission_ledger ledger
    join public.ticket_sale_attributions attribution on attribution.id = ledger.attribution_id
    where attribution.event_id = p_event_id
    group by ledger.membership_id, ledger.currency
  ),
  attribution_financial_totals as (
    select
      ledger.attribution_id,
      coalesce(sum(ledger.amount_minor) filter (where ledger.entry_type = 'earned'), 0)::bigint as earned_minor,
      coalesce(sum(-ledger.amount_minor) filter (where ledger.entry_type in ('refund_reversal', 'chargeback_reversal')), 0)::bigint as reversed_minor
    from public.promoter_commission_ledger ledger
    join public.ticket_sale_attributions attribution on attribution.id = ledger.attribution_id
    where attribution.event_id = p_event_id
    group by ledger.attribution_id
  ),
  promoter_rankings as (
    select jsonb_agg(row order by net_minor desc, attributed_sales desc, membership_id) as rows
    from (
      select
        membership.id as membership_id,
        coalesce(ledger.currency, program.currency, 'usd') as currency,
        coalesce(clicks.clicks, 0)::bigint as clicks,
        coalesce(attribution.attributed_sales, 0)::bigint as attributed_sales,
        coalesce(attribution.tickets_sold, 0)::bigint as tickets_sold,
        coalesce(attribution.eligible_revenue_minor, 0)::bigint as eligible_revenue_minor,
        coalesce(ledger.earned_minor, 0)::bigint as earned_minor,
        coalesce(ledger.reversed_minor, 0)::bigint as reversed_minor,
        coalesce(ledger.net_minor, 0)::bigint as net_minor,
        jsonb_build_object(
          'membership_id', membership.id,
          'membership_status', membership.status,
          'promoter_user_id', membership.user_id,
          'currency', coalesce(ledger.currency, program.currency, 'usd'),
          'clicks', coalesce(clicks.clicks, 0),
          'attributed_sales', coalesce(attribution.attributed_sales, 0),
          'tickets_sold', coalesce(attribution.tickets_sold, 0),
          'eligible_revenue_minor', coalesce(attribution.eligible_revenue_minor, 0),
          'earned_minor', coalesce(ledger.earned_minor, 0),
          'reversed_minor', coalesce(ledger.reversed_minor, 0),
          'net_commission_minor', coalesce(ledger.net_minor, 0),
          'conversion_rate', case when coalesce(clicks.clicks, 0) = 0 then 0 else round(coalesce(attribution.attributed_sales, 0)::numeric / clicks.clicks, 4) end
        ) as row
      from memberships membership
      join program on true
      left join attribution_totals attribution on attribution.membership_id = membership.id
      left join click_totals clicks on clicks.membership_id = membership.id
      left join ledger_totals ledger on ledger.membership_id = membership.id
    ) ranking_rows
  ),
  source_performance as (
    select jsonb_agg(jsonb_build_object(
      'source_type', source_type,
      'clicks', clicks,
      'attributed_sales', attributed_sales,
      'eligible_revenue_minor', eligible_revenue_minor
    ) order by source_type) as rows
    from (
      select
        source_type,
        sum(clicks)::bigint as clicks,
        sum(attributed_sales)::bigint as attributed_sales,
        sum(eligible_revenue_minor)::bigint as eligible_revenue_minor
      from (
        select source_type, count(*)::bigint as clicks, 0::bigint as attributed_sales, 0::bigint as eligible_revenue_minor
        from public.promoter_attribution_touchpoints
        where event_id = p_event_id
        group by source_type
        union all
        select source_type, 0::bigint, count(*)::bigint, coalesce(sum(eligible_revenue_minor), 0)::bigint
        from public.ticket_sale_attributions
        where event_id = p_event_id
        group by source_type
      ) source_rows
      group by source_type
    ) grouped_sources
  ),
  ticket_type_performance as (
    select jsonb_agg(jsonb_build_object(
      'ticket_type_id', ticket_type_id,
      'ticket_type_name', ticket_type_name,
      'attributed_sales', attributed_sales,
      'tickets_sold', tickets_sold,
      'eligible_revenue_minor', eligible_revenue_minor,
      'earned_minor', earned_minor,
      'reversed_minor', reversed_minor
    ) order by eligible_revenue_minor desc, ticket_type_name) as rows
    from (
      select
        attribution.ticket_type_id,
        coalesce(ticket_type.name, 'Ticket type') as ticket_type_name,
        count(*)::bigint as attributed_sales,
        coalesce(sum(sale.quantity), 0)::bigint as tickets_sold,
        coalesce(sum(attribution.eligible_revenue_minor), 0)::bigint as eligible_revenue_minor,
        coalesce(sum(financial.earned_minor), 0)::bigint as earned_minor,
        coalesce(sum(financial.reversed_minor), 0)::bigint as reversed_minor
      from public.ticket_sale_attributions attribution
      join public.ticket_sales sale on sale.id = attribution.order_id
      left join public.ticket_types ticket_type on ticket_type.id = attribution.ticket_type_id
      left join attribution_financial_totals financial on financial.attribution_id = attribution.id
      where attribution.event_id = p_event_id
      group by attribution.ticket_type_id, ticket_type.name
    ) ticket_rows
  ),
  financial_totals as (
    select jsonb_agg(jsonb_build_object(
      'currency', currency,
      'earned_minor', earned_minor,
      'reversed_minor', reversed_minor,
      'pending_minor', pending_minor,
      'available_minor', available_minor,
      'paid_minor', paid_minor,
      'net_commission_minor', net_minor
    ) order by currency) as rows
    from (
      select
        currency,
        sum(earned_minor)::bigint as earned_minor,
        sum(reversed_minor)::bigint as reversed_minor,
        sum(pending_minor)::bigint as pending_minor,
        sum(available_minor)::bigint as available_minor,
        sum(paid_minor)::bigint as paid_minor,
        sum(net_minor)::bigint as net_minor
      from ledger_totals
      group by currency
    ) financial_rows
  ),
  recent_ledger as (
    select jsonb_agg(row order by occurred_at desc, entry_id desc) as rows
    from (
      select
        ledger.id as entry_id,
        ledger.occurred_at,
        jsonb_build_object(
          'id', ledger.id,
          'membership_id', ledger.membership_id,
          'entry_type', ledger.entry_type,
          'status', ledger.status,
          'amount_minor', ledger.amount_minor,
          'currency', ledger.currency,
          'ticket_type_id', attribution.ticket_type_id,
          'source_type', attribution.source_type,
          'occurred_at', ledger.occurred_at,
          'reason', ledger.reason
        ) as row
      from public.promoter_commission_ledger ledger
      join public.ticket_sale_attributions attribution on attribution.id = ledger.attribution_id
      where attribution.event_id = p_event_id
      order by ledger.occurred_at desc, ledger.id desc
      limit 100
    ) entries
  ),
  tour_context as (
    select tour.id, tour.name
    from public.tour_events tour_event
    join public.tours tour on tour.id = tour_event.tour_id
    where tour_event.event_id = p_event_id
    limit 1
  ),
  managed_tour_events as (
    select stop.id
    from tour_context context
    join public.tour_events stop_link on stop_link.tour_id = context.id
    join public.events_v2 stop on stop.id = stop_link.event_id
    where private.can_manage_event_promoter_program(stop.id)
  ),
  tour_aggregate as (
    select jsonb_build_object(
      'tour_id', context.id,
      'tour_name', context.name,
      'managed_events', (select count(*) from managed_tour_events),
      'attributed_sales', coalesce((
        select count(*) from public.ticket_sale_attributions attribution
        where attribution.event_id in (select id from managed_tour_events)
      ), 0),
      'eligible_revenue_minor', coalesce((
        select sum(attribution.eligible_revenue_minor) from public.ticket_sale_attributions attribution
        where attribution.event_id in (select id from managed_tour_events)
      ), 0),
      'net_commission_minor', coalesce((
        select sum(ledger.amount_minor)
        from public.promoter_commission_ledger ledger
        join public.ticket_sale_attributions attribution on attribution.id = ledger.attribution_id
        where attribution.event_id in (select id from managed_tour_events)
      ), 0)
    ) as row
    from tour_context context
  )
  select jsonb_build_object(
    'event_id', p_event_id,
    'program', coalesce((select jsonb_build_object('id', id, 'status', status, 'currency', currency) from program limit 1), '{}'::jsonb),
    'summary', jsonb_build_object(
      'applicants', coalesce((select applicants from applications), 0),
      'approved_applications', coalesce((select approved_applications from applications), 0),
      'approval_rate', case when coalesce((select applicants from applications), 0) = 0 then 0 else round((select approved_applications from applications)::numeric / (select applicants from applications), 4) end,
      'active_promoters', coalesce((select count(*) from memberships where status = 'approved'), 0),
      'attributed_sales', coalesce((select sum(attributed_sales) from attribution_totals), 0),
      'tickets_sold', coalesce((select sum(tickets_sold) from attribution_totals), 0),
      'eligible_revenue_minor', coalesce((select sum(eligible_revenue_minor) from attribution_totals), 0),
      'financial_by_currency', coalesce((select rows from financial_totals), '[]'::jsonb)
    ),
    'promoter_rankings', coalesce((select rows from promoter_rankings), '[]'::jsonb),
    'source_performance', coalesce((select rows from source_performance), '[]'::jsonb),
    'ticket_type_performance', coalesce((select rows from ticket_type_performance), '[]'::jsonb),
    'ledger_entries', coalesce((select rows from recent_ledger), '[]'::jsonb),
    'tour_aggregate', coalesce((select row from tour_aggregate), null)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.get_event_promoter_organizer_analytics(p_event_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public, private
as $$
  select private.get_event_promoter_organizer_analytics(p_event_id);
$$;

revoke all privileges on function private.get_event_promoter_organizer_analytics(uuid) from public;
revoke all privileges on function public.get_event_promoter_organizer_analytics(uuid) from public;
grant execute on function private.get_event_promoter_organizer_analytics(uuid) to authenticated;
grant execute on function public.get_event_promoter_organizer_analytics(uuid) to authenticated;
