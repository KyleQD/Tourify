-- Replace blanket authenticated ticketing access with event/org capabilities.

begin;

alter table public.ticket_types enable row level security;
alter table public.ticket_sales enable row level security;
alter table public.ticket_campaigns enable row level security;
alter table public.promo_codes enable row level security;
alter table public.ticket_shares enable row level security;
alter table public.ticket_referrals enable row level security;
alter table public.ticket_analytics enable row level security;
alter table public.social_media_performance enable row level security;
alter table public.ticket_analytics_events enable row level security;

alter table public.ticket_shares
  add column if not exists share_text text;

alter table public.ticket_shares
  drop constraint if exists ticket_shares_platform_check;
alter table public.ticket_shares
  add constraint ticket_shares_platform_check
  check (platform in (
    'facebook','twitter','instagram','linkedin','tiktok','email','sms',
    'whatsapp','telegram','copy_link','feed','message','other'
  ));

-- ---------------------------------------------------------------------------
-- Ticket types
-- ---------------------------------------------------------------------------
drop policy if exists ticket_types_all on public.ticket_types;
drop policy if exists ticket_types_select on public.ticket_types;
drop policy if exists ticket_types_insert on public.ticket_types;
drop policy if exists ticket_types_update on public.ticket_types;
drop policy if exists ticket_types_delete on public.ticket_types;

create policy ticket_types_select on public.ticket_types
  for select to authenticated
  using (
    (is_active and coalesce(visibility, 'public') = 'public')
    or exists (
      select 1
      from public.events_v2 e
      where e.id = ticket_types.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.view')
          or public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
          or public.has_perm(auth.uid(), e.org_id, 'ticketing.refund')
        )
    )
  );

create policy ticket_types_insert on public.ticket_types
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.events_v2 e
      where e.id = ticket_types.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
          or exists (
            select 1 from public.event_ticketing_grants g
            where g.event_id = e.id
              and g.user_id = auth.uid()
              and g.permission = 'manage_ticket_types'
          )
        )
    )
  );

create policy ticket_types_update on public.ticket_types
  for update to authenticated
  using (
    exists (
      select 1
      from public.events_v2 e
      where e.id = ticket_types.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
          or exists (
            select 1 from public.event_ticketing_grants g
            where g.event_id = e.id
              and g.user_id = auth.uid()
              and g.permission = 'manage_ticket_types'
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.events_v2 e
      where e.id = ticket_types.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
          or exists (
            select 1 from public.event_ticketing_grants g
            where g.event_id = e.id
              and g.user_id = auth.uid()
              and g.permission = 'manage_ticket_types'
          )
        )
    )
  );

create policy ticket_types_delete on public.ticket_types
  for delete to authenticated
  using (
    exists (
      select 1
      from public.events_v2 e
      where e.id = ticket_types.event_id
        and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
    )
  );

-- ---------------------------------------------------------------------------
-- Sales/orders: buyers retain access to their own rows; organization access is
-- capability-based. Clients may only create pending orders for themselves.
-- ---------------------------------------------------------------------------
drop policy if exists ticket_sales_all on public.ticket_sales;
drop policy if exists ticket_sales_select on public.ticket_sales;
drop policy if exists ticket_sales_insert on public.ticket_sales;
drop policy if exists ticket_sales_update on public.ticket_sales;
drop policy if exists ticket_sales_delete on public.ticket_sales;

create policy ticket_sales_select on public.ticket_sales
  for select to authenticated
  using (
    buyer_user_id = auth.uid()
    or exists (
      select 1
      from public.events_v2 e
      where e.id = ticket_sales.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.view')
          or public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
          or public.has_perm(auth.uid(), e.org_id, 'ticketing.refund')
          or exists (
            select 1 from public.event_ticketing_grants g
            where g.event_id = e.id
              and g.user_id = auth.uid()
              and g.permission in ('view_overview', 'view_attendees', 'operate_box_office')
          )
        )
    )
  );

create policy ticket_sales_insert on public.ticket_sales
  for insert to authenticated
  with check (
    (
      buyer_user_id = auth.uid()
      and payment_status = 'pending'
      and exists (
        select 1 from public.ticket_types tt
        where tt.id = ticket_sales.ticket_type_id
          and tt.event_id = ticket_sales.event_id
          and tt.is_active
      )
    )
    or exists (
      select 1
      from public.events_v2 e
      where e.id = ticket_sales.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
          or exists (
            select 1 from public.event_ticketing_grants g
            where g.event_id = e.id
              and g.user_id = auth.uid()
              and g.permission = 'operate_box_office'
          )
        )
    )
  );

create policy ticket_sales_update on public.ticket_sales
  for update to authenticated
  using (
    exists (
      select 1
      from public.events_v2 e
      where e.id = ticket_sales.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
          or public.has_perm(auth.uid(), e.org_id, 'ticketing.refund')
          or exists (
            select 1 from public.event_ticketing_grants g
            where g.event_id = e.id
              and g.user_id = auth.uid()
              and g.permission in ('operate_box_office', 'process_refunds')
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.events_v2 e
      where e.id = ticket_sales.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
          or public.has_perm(auth.uid(), e.org_id, 'ticketing.refund')
          or exists (
            select 1 from public.event_ticketing_grants g
            where g.event_id = e.id
              and g.user_id = auth.uid()
              and g.permission in ('operate_box_office', 'process_refunds')
          )
        )
    )
  );

create policy ticket_sales_delete on public.ticket_sales
  for delete to authenticated
  using (
    exists (
      select 1
      from public.events_v2 e
      where e.id = ticket_sales.event_id
        and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
    )
  );

-- ---------------------------------------------------------------------------
-- Campaigns and promo codes
-- ---------------------------------------------------------------------------
drop policy if exists ticket_campaigns_all on public.ticket_campaigns;
drop policy if exists ticket_campaigns_select on public.ticket_campaigns;
drop policy if exists ticket_campaigns_write on public.ticket_campaigns;
drop policy if exists ticket_campaigns_insert on public.ticket_campaigns;
drop policy if exists ticket_campaigns_update on public.ticket_campaigns;
drop policy if exists ticket_campaigns_delete on public.ticket_campaigns;

create policy ticket_campaigns_select on public.ticket_campaigns
  for select to authenticated
  using (
    is_active
    or exists (
      select 1 from public.events_v2 e
      where e.id = ticket_campaigns.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.view')
          or public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
        )
    )
  );

create policy ticket_campaigns_insert on public.ticket_campaigns
  for insert to authenticated
  with check (
    exists (
      select 1 from public.events_v2 e
      where e.id = ticket_campaigns.event_id
        and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
    )
  );

create policy ticket_campaigns_update on public.ticket_campaigns
  for update to authenticated
  using (
    exists (
      select 1 from public.events_v2 e
      where e.id = ticket_campaigns.event_id
        and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
    )
  )
  with check (
    exists (
      select 1 from public.events_v2 e
      where e.id = ticket_campaigns.event_id
        and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
    )
  );

create policy ticket_campaigns_delete on public.ticket_campaigns
  for delete to authenticated
  using (
    exists (
      select 1 from public.events_v2 e
      where e.id = ticket_campaigns.event_id
        and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
    )
  );

drop policy if exists promo_codes_all on public.promo_codes;
drop policy if exists promo_codes_select on public.promo_codes;
drop policy if exists promo_codes_write on public.promo_codes;
drop policy if exists promo_codes_insert on public.promo_codes;
drop policy if exists promo_codes_update on public.promo_codes;
drop policy if exists promo_codes_delete on public.promo_codes;

create policy promo_codes_select on public.promo_codes
  for select to authenticated
  using (
    exists (
      select 1 from public.events_v2 e
      where e.id = promo_codes.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.view')
          or public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
        )
    )
  );

create policy promo_codes_insert on public.promo_codes
  for insert to authenticated
  with check (
    exists (
      select 1 from public.events_v2 e
      where e.id = promo_codes.event_id
        and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
    )
  );

create policy promo_codes_update on public.promo_codes
  for update to authenticated
  using (
    exists (
      select 1 from public.events_v2 e
      where e.id = promo_codes.event_id
        and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
    )
  )
  with check (
    exists (
      select 1 from public.events_v2 e
      where e.id = promo_codes.event_id
        and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
    )
  );

create policy promo_codes_delete on public.promo_codes
  for delete to authenticated
  using (
    exists (
      select 1 from public.events_v2 e
      where e.id = promo_codes.event_id
        and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
    )
  );

-- ---------------------------------------------------------------------------
-- Shares, referrals, and analytics
-- ---------------------------------------------------------------------------
drop policy if exists ticket_shares_all on public.ticket_shares;
drop policy if exists ticket_shares_select on public.ticket_shares;
drop policy if exists ticket_shares_insert on public.ticket_shares;
drop policy if exists ticket_shares_update on public.ticket_shares;
drop policy if exists ticket_shares_delete on public.ticket_shares;

create policy ticket_shares_select on public.ticket_shares
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.events_v2 e
      where e.id = ticket_shares.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.view')
          or public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
        )
    )
  );

create policy ticket_shares_insert on public.ticket_shares
  for insert to authenticated
  with check (
    (
      user_id = auth.uid()
      and exists (
        select 1 from public.ticket_types tt
        where tt.event_id = ticket_shares.event_id
          and tt.is_active
      )
    )
    or exists (
      select 1 from public.events_v2 e
      where e.id = ticket_shares.event_id
        and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
    )
  );

create policy ticket_shares_update on public.ticket_shares
  for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.ticket_types tt
      where tt.event_id = ticket_shares.event_id
        and tt.is_active
    )
  );

create policy ticket_shares_delete on public.ticket_shares
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists ticket_referrals_all on public.ticket_referrals;
drop policy if exists ticket_referrals_select on public.ticket_referrals;
drop policy if exists ticket_referrals_insert on public.ticket_referrals;
drop policy if exists ticket_referrals_update on public.ticket_referrals;
drop policy if exists ticket_referrals_delete on public.ticket_referrals;

create policy ticket_referrals_select on public.ticket_referrals
  for select to authenticated
  using (
    referrer_id = auth.uid()
    or exists (
      select 1 from public.events_v2 e
      where e.id = ticket_referrals.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.view')
          or public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
        )
    )
  );

create policy ticket_referrals_insert on public.ticket_referrals
  for insert to authenticated
  with check (
    (
      referrer_id = auth.uid()
      and exists (
        select 1 from public.ticket_types tt
        where tt.event_id = ticket_referrals.event_id
          and tt.is_active
      )
    )
    or exists (
      select 1 from public.events_v2 e
      where e.id = ticket_referrals.event_id
        and public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
    )
  );

create policy ticket_referrals_update on public.ticket_referrals
  for update to authenticated
  using (referrer_id = auth.uid())
  with check (
    referrer_id = auth.uid()
    and exists (
      select 1 from public.ticket_types tt
      where tt.event_id = ticket_referrals.event_id
        and tt.is_active
    )
  );

create policy ticket_referrals_delete on public.ticket_referrals
  for delete to authenticated
  using (referrer_id = auth.uid());

drop policy if exists ticket_analytics_select on public.ticket_analytics;
create policy ticket_analytics_select on public.ticket_analytics
  for select to authenticated
  using (
    exists (
      select 1 from public.events_v2 e
      where e.id = ticket_analytics.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.view')
          or public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
        )
    )
  );

drop policy if exists social_media_performance_select on public.social_media_performance;
create policy social_media_performance_select on public.social_media_performance
  for select to authenticated
  using (
    exists (
      select 1 from public.events_v2 e
      where e.id = social_media_performance.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.view')
          or public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
        )
    )
  );

drop policy if exists ticket_analytics_events_select on public.ticket_analytics_events;
drop policy if exists ticket_analytics_events_insert on public.ticket_analytics_events;

create policy ticket_analytics_events_select on public.ticket_analytics_events
  for select to authenticated
  using (
    event_id is not null
    and exists (
      select 1 from public.events_v2 e
      where e.id = ticket_analytics_events.event_id
        and (
          public.has_perm(auth.uid(), e.org_id, 'ticketing.view')
          or public.has_perm(auth.uid(), e.org_id, 'ticketing.manage')
        )
    )
  );

create policy ticket_analytics_events_insert on public.ticket_analytics_events
  for insert to authenticated
  with check (
    actor_user_id = auth.uid()
    and event_id is not null
    and exists (
      select 1 from public.ticket_types tt
      where tt.event_id = ticket_analytics_events.event_id
        and tt.is_active
    )
  );

-- Exact organization-scoped overview metrics. SECURITY INVOKER preserves RLS.
create or replace function public.get_admin_ticketing_overview(
  p_org_id uuid,
  p_event_id uuid default null
)
returns table (
  total_revenue numeric,
  total_tickets_sold bigint,
  total_tickets_available bigint,
  total_tickets_sold_overall bigint,
  active_campaigns bigint,
  campaign_usage_percentage numeric,
  social_clicks bigint,
  social_conversions bigint,
  referral_revenue numeric
)
language sql
stable
security invoker
set search_path to 'public', 'extensions'
as $$
  select
    coalesce((
      select sum(ts.total_amount)
      from public.ticket_sales ts
      join public.events_v2 e on e.id = ts.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or ts.event_id = p_event_id)
        and ts.payment_status = 'completed'
        and ts.created_at >= now() - interval '30 days'
    ), 0),
    coalesce((
      select sum(ts.quantity)::bigint
      from public.ticket_sales ts
      join public.events_v2 e on e.id = ts.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or ts.event_id = p_event_id)
        and ts.payment_status = 'completed'
        and ts.created_at >= now() - interval '30 days'
    ), 0),
    coalesce((
      select sum(tt.quantity_available)::bigint
      from public.ticket_types tt
      join public.events_v2 e on e.id = tt.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or tt.event_id = p_event_id)
        and tt.is_active
    ), 0),
    coalesce((
      select sum(tt.quantity_sold)::bigint
      from public.ticket_types tt
      join public.events_v2 e on e.id = tt.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or tt.event_id = p_event_id)
        and tt.is_active
    ), 0),
    (
      select count(*)
      from public.ticket_campaigns tc
      join public.events_v2 e on e.id = tc.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or tc.event_id = p_event_id)
        and tc.is_active
        and tc.end_date >= now()
    ),
    coalesce((
      select avg(
        case
          when tc.max_uses is null or tc.max_uses = 0 then 0
          else (tc.current_uses::numeric / tc.max_uses::numeric) * 100
        end
      )
      from public.ticket_campaigns tc
      join public.events_v2 e on e.id = tc.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or tc.event_id = p_event_id)
        and tc.is_active
        and tc.end_date >= now()
    ), 0),
    coalesce((
      select sum(tsh.click_count)::bigint
      from public.ticket_shares tsh
      join public.events_v2 e on e.id = tsh.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or tsh.event_id = p_event_id)
        and tsh.created_at >= now() - interval '30 days'
    ), 0),
    coalesce((
      select sum(tsh.conversion_count)::bigint
      from public.ticket_shares tsh
      join public.events_v2 e on e.id = tsh.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or tsh.event_id = p_event_id)
        and tsh.created_at >= now() - interval '30 days'
    ), 0),
    0::numeric;
$$;

revoke all on function public.get_admin_ticketing_overview(uuid, uuid) from public;
grant execute on function public.get_admin_ticketing_overview(uuid, uuid)
  to authenticated, service_role;

-- Aggregate in Postgres so dashboard totals are exact rather than capped by a
-- PostgREST row limit. SECURITY INVOKER keeps ticket_shares RLS in force.
create or replace function public.get_admin_ticketing_social_performance(
  p_org_id uuid,
  p_event_id uuid default null
)
returns table (
  platform text,
  clicks bigint,
  conversions bigint,
  revenue numeric
)
language sql
stable
security invoker
set search_path to 'public', 'extensions'
as $$
  select
    tsh.platform,
    coalesce(sum(tsh.click_count), 0)::bigint as clicks,
    coalesce(sum(tsh.conversion_count), 0)::bigint as conversions,
    coalesce(sum(tsh.revenue_generated), 0)::numeric as revenue
  from public.ticket_shares tsh
  join public.events_v2 e on e.id = tsh.event_id
  where e.org_id = p_org_id
    and (p_event_id is null or tsh.event_id = p_event_id)
  group by tsh.platform
  order by clicks desc, tsh.platform;
$$;

revoke all on function public.get_admin_ticketing_social_performance(uuid, uuid)
  from public;
grant execute on function public.get_admin_ticketing_social_performance(uuid, uuid)
  to authenticated, service_role;

-- Promo redemption is a conditional, atomic increment. Only trusted server
-- paths may call it; public validation never exposes the promo-code table.
create or replace function public.increment_promo_code_usage(
  p_promo_id uuid,
  p_event_id uuid
)
returns integer
language sql
security invoker
set search_path to 'public', 'extensions'
as $$
  update public.promo_codes
  set current_uses = current_uses + 1,
      updated_at = now()
  where id = p_promo_id
    and event_id = p_event_id
    and is_active
    and start_date <= now()
    and end_date >= now()
    and (max_uses is null or current_uses < max_uses)
  returning current_uses;
$$;

revoke all on function public.increment_promo_code_usage(uuid, uuid) from public;
grant execute on function public.increment_promo_code_usage(uuid, uuid) to service_role;

-- Apply all local refund state changes in a single database transaction. The
-- external processor call remains idempotent and is completed before this RPC.
create or replace function public.apply_ticket_refund(
  p_order_id uuid,
  p_actor_user_id uuid,
  p_refund_amount numeric,
  p_ticket_ids uuid[] default null
)
returns table (
  event_id uuid,
  ticket_type_id uuid,
  buyer_user_id uuid,
  restored_quantity integer,
  payment_reference text,
  org_id uuid
)
language plpgsql
security invoker
set search_path to 'public', 'extensions'
as $$
declare
  v_order public.ticket_sales%rowtype;
  v_requested_ids uuid[];
  v_target_ids uuid[];
  v_restore_quantity integer;
  v_is_partial boolean;
  v_actor_user_id uuid;
  v_org_id uuid;
begin
  if p_refund_amount is null or p_refund_amount <= 0 then
    raise exception 'Refund amount must be greater than zero';
  end if;

  select ts.*
  into v_order
  from public.ticket_sales ts
  where ts.id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if v_order.payment_status not in ('completed', 'paid') then
    raise exception 'Order is not refundable';
  end if;
  if coalesce(v_order.metadata, '{}'::jsonb) ? 'refund' then
    raise exception 'Order has already been refunded';
  end if;
  if p_refund_amount > v_order.total_amount then
    raise exception 'Refund amount exceeds order total';
  end if;

  if p_ticket_ids is not null and cardinality(p_ticket_ids) > 0 then
    select coalesce(array_agg(distinct requested.id), '{}'::uuid[])
    into v_requested_ids
    from unnest(p_ticket_ids) as requested(id);

    if cardinality(v_requested_ids) <> cardinality(p_ticket_ids) then
      raise exception 'Duplicate ticket IDs are not allowed';
    end if;

    select coalesce(array_agg(t.id order by t.id), '{}'::uuid[])
    into v_target_ids
    from public.tickets t
    where t.order_id = p_order_id
      and t.id = any(v_requested_ids)
      and t.status not in ('refunded', 'canceled', 'void');

    if cardinality(v_target_ids) <> cardinality(v_requested_ids) then
      raise exception 'One or more tickets are not refundable for this order';
    end if;
  else
    select coalesce(array_agg(t.id order by t.id), '{}'::uuid[])
    into v_target_ids
    from public.tickets t
    where t.order_id = p_order_id
      and t.status not in ('refunded', 'canceled', 'void');
  end if;

  v_restore_quantity := case
    when cardinality(v_target_ids) > 0 then cardinality(v_target_ids)
    else v_order.quantity
  end;
  if v_restore_quantity <= 0 then
    raise exception 'Order has no refundable admissions';
  end if;

  v_is_partial := p_ticket_ids is not null
    and cardinality(p_ticket_ids) > 0
    and v_restore_quantity < v_order.quantity;

  select u.id into v_actor_user_id
  from auth.users u
  where u.id = p_actor_user_id;

  if cardinality(v_target_ids) > 0 then
    update public.tickets t
    set status = 'refunded', updated_at = now()
    where t.id = any(v_target_ids);

    update public.ticket_credentials tc
    set status = 'revoked',
        revoked_at = now(),
        revoke_reason = 'refunded'
    where tc.ticket_id = any(v_target_ids)
      and tc.status = 'active';

    insert into public.ticket_ownership_events (
      ticket_id,
      event_type,
      actor_user_id,
      metadata
    )
    select
      target.id,
      'refunded',
      v_actor_user_id,
      jsonb_build_object('refund_amount', p_refund_amount, 'order_id', p_order_id)
    from unnest(v_target_ids) as target(id);
  end if;

  update public.ticket_sales ts
  set payment_status = case when v_is_partial then 'completed' else 'refunded' end,
      metadata = coalesce(ts.metadata, '{}'::jsonb) || jsonb_build_object(
        'refund', jsonb_build_object(
          'amount', p_refund_amount,
          'partial', v_is_partial,
          'ticket_ids', to_jsonb(v_target_ids),
          'actor_user_id', v_actor_user_id,
          'at', now()
        )
      ),
      updated_at = now()
  where ts.id = p_order_id;

  update public.ticket_types tt
  set quantity_sold = greatest(0, tt.quantity_sold - v_restore_quantity),
      updated_at = now()
  where tt.id = v_order.ticket_type_id;

  select e.org_id into v_org_id
  from public.events_v2 e
  where e.id = v_order.event_id;

  return query
  select
    v_order.event_id,
    v_order.ticket_type_id,
    v_order.buyer_user_id,
    v_restore_quantity,
    v_order.payment_reference,
    v_org_id;
end;
$$;

revoke all on function public.apply_ticket_refund(uuid, uuid, numeric, uuid[])
  from public;
grant execute on function public.apply_ticket_refund(uuid, uuid, numeric, uuid[])
  to service_role;

create or replace function public.decrement_ticket_quantity_sold(
  p_ticket_type_id uuid,
  p_quantity integer
)
returns integer
language sql
security invoker
set search_path to 'public', 'extensions'
as $$
  update public.ticket_types
  set quantity_sold = greatest(0, quantity_sold - greatest(0, p_quantity)),
      updated_at = now()
  where id = p_ticket_type_id
  returning quantity_sold;
$$;

revoke all on function public.decrement_ticket_quantity_sold(uuid, integer) from public;
grant execute on function public.decrement_ticket_quantity_sold(uuid, integer) to service_role;
