-- DB-005: additive compatibility read models required by the admin ticketing
-- overview. The July event-ticketing foundation remains canonical; these
-- tables preserve the existing admin/reporting contract without renaming or
-- deleting ticketing objects.

set client_min_messages = warning;
create extension if not exists pgcrypto;

create table if not exists public.ticket_shares (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events_v2(id) on delete cascade,
  ticket_type_id uuid references public.ticket_types(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  platform text not null check (platform in (
    'facebook', 'twitter', 'instagram', 'linkedin', 'tiktok', 'email', 'sms',
    'whatsapp', 'telegram', 'feed', 'message', 'copy_link', 'other'
  )),
  share_url text,
  share_text text,
  click_count integer not null default 0 check (click_count >= 0),
  conversion_count integer not null default 0 check (conversion_count >= 0),
  revenue_generated numeric not null default 0 check (revenue_generated >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_referrals (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events_v2(id) on delete cascade,
  referrer_id uuid references auth.users(id) on delete set null,
  referred_email text not null,
  referral_code text not null unique,
  discount_amount numeric not null default 0 check (discount_amount >= 0),
  is_used boolean not null default false,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_analytics (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events_v2(id) on delete cascade,
  date date not null,
  views integer not null default 0 check (views >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  conversions integer not null default 0 check (conversions >= 0),
  revenue numeric not null default 0 check (revenue >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, date)
);

create table if not exists public.social_media_performance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events_v2(id) on delete cascade,
  platform text not null,
  post_id text,
  post_url text,
  shares_count integer not null default 0 check (shares_count >= 0),
  clicks_count integer not null default 0 check (clicks_count >= 0),
  conversions_count integer not null default 0 check (conversions_count >= 0),
  revenue_generated numeric not null default 0 check (revenue_generated >= 0),
  engagement_rate numeric not null default 0 check (engagement_rate >= 0),
  post_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ticket_shares_event on public.ticket_shares(event_id);
create index if not exists idx_ticket_referrals_event on public.ticket_referrals(event_id);
create index if not exists idx_ticket_analytics_event_date on public.ticket_analytics(event_id, date desc);
create index if not exists idx_social_media_performance_event on public.social_media_performance(event_id);

alter table public.ticket_shares enable row level security;
alter table public.ticket_referrals enable row level security;
alter table public.ticket_analytics enable row level security;
alter table public.social_media_performance enable row level security;

drop policy if exists ticket_shares_participant_read on public.ticket_shares;
create policy ticket_shares_participant_read on public.ticket_shares
  for select to authenticated
  using (
    user_id = auth.uid()
    or (event_id is not null and (
      public.is_event_v2_org_member(event_id)
      or public.has_event_ticketing_grant(event_id, 'view_overview')
    ))
  );

drop policy if exists ticket_shares_owner_write on public.ticket_shares;
create policy ticket_shares_owner_write on public.ticket_shares
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and event_id is not null
    and public.has_event_ticketing_grant(event_id, 'view_overview')
  );

drop policy if exists ticket_referrals_participant_read on public.ticket_referrals;
create policy ticket_referrals_participant_read on public.ticket_referrals
  for select to authenticated
  using (
    referrer_id = auth.uid()
    or (event_id is not null and public.has_event_ticketing_grant(event_id, 'view_overview'))
  );

drop policy if exists ticket_referrals_owner_write on public.ticket_referrals;
create policy ticket_referrals_owner_write on public.ticket_referrals
  for insert to authenticated
  with check (
    referrer_id = auth.uid()
    and event_id is not null
    and public.has_event_ticketing_grant(event_id, 'view_overview')
  );

drop policy if exists ticket_analytics_org_read on public.ticket_analytics;
create policy ticket_analytics_org_read on public.ticket_analytics
  for select to authenticated
  using (event_id is not null and public.has_event_ticketing_grant(event_id, 'view_overview'));

drop policy if exists social_media_performance_org_read on public.social_media_performance;
create policy social_media_performance_org_read on public.social_media_performance
  for select to authenticated
  using (event_id is not null and public.has_event_ticketing_grant(event_id, 'view_overview'));

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
language plpgsql
stable
security invoker
set search_path to 'public', 'extensions'
as $$
begin
  if auth.role() <> 'service_role'
     and not exists (
       select 1
       from public.org_members m
       where m.org_id = p_org_id
         and m.user_id = auth.uid()
     ) then
    raise exception 'organization access denied';
  end if;

  return query
  select
    coalesce((
      select sum(ts.total_amount)
      from public.ticket_sales ts
      join public.events_v2 e on e.id = ts.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or ts.event_id = p_event_id)
        and ts.payment_status = 'completed'
        and ts.created_at >= now() - interval '30 days'
    ), 0)::numeric,
    coalesce((
      select sum(ts.quantity)::bigint
      from public.ticket_sales ts
      join public.events_v2 e on e.id = ts.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or ts.event_id = p_event_id)
        and ts.payment_status = 'completed'
        and ts.created_at >= now() - interval '30 days'
    ), 0)::bigint,
    coalesce((
      select sum(tt.quantity_available)::bigint
      from public.ticket_types tt
      join public.events_v2 e on e.id = tt.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or tt.event_id = p_event_id)
        and tt.is_active
    ), 0)::bigint,
    coalesce((
      select sum(tt.quantity_sold)::bigint
      from public.ticket_types tt
      join public.events_v2 e on e.id = tt.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or tt.event_id = p_event_id)
        and tt.is_active
    ), 0)::bigint,
    (
      select count(*)::bigint
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
    ), 0)::numeric,
    coalesce((
      select sum(tsh.click_count)::bigint
      from public.ticket_shares tsh
      join public.events_v2 e on e.id = tsh.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or tsh.event_id = p_event_id)
        and tsh.created_at >= now() - interval '30 days'
    ), 0)::bigint,
    coalesce((
      select sum(tsh.conversion_count)::bigint
      from public.ticket_shares tsh
      join public.events_v2 e on e.id = tsh.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or tsh.event_id = p_event_id)
        and tsh.created_at >= now() - interval '30 days'
    ), 0)::bigint,
    coalesce((
      select sum(tr.discount_amount)
      from public.ticket_referrals tr
      join public.events_v2 e on e.id = tr.event_id
      where e.org_id = p_org_id
        and (p_event_id is null or tr.event_id = p_event_id)
        and tr.is_used
    ), 0)::numeric;
end;
$$;

revoke all on function public.get_admin_ticketing_overview(uuid, uuid) from public, anon;
grant execute on function public.get_admin_ticketing_overview(uuid, uuid) to authenticated, service_role;

-- The admin analytics route also consumes this aggregate RPC. Keep the
-- response shape compatible with the archived admin contract while preserving
-- event/org scoping and invoker RLS semantics.
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

revoke all on function public.get_admin_ticketing_social_performance(uuid, uuid) from public, anon;
grant execute on function public.get_admin_ticketing_social_performance(uuid, uuid) to authenticated, service_role;
