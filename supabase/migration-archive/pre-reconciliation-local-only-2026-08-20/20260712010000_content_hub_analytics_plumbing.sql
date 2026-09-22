-- Content Hub analytics plumbing: posting_analytics, hashtag_groups, RPC
-- Aligns scheduled_posts columns used by cross-platform analytics.

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- scheduled_posts: columns expected by cross-platform analytics / posting
-- ---------------------------------------------------------------------------
alter table if exists public.scheduled_posts
  add column if not exists success_accounts uuid[] default array[]::uuid[],
  add column if not exists failed_accounts uuid[] default array[]::uuid[],
  add column if not exists created_post_ids uuid[] default array[]::uuid[],
  add column if not exists total_reach integer default 0,
  add column if not exists total_engagement integer default 0,
  add column if not exists platform_status jsonb default '{}'::jsonb,
  add column if not exists platform_errors jsonb default '{}'::jsonb;

-- Allow both legacy ('completed') and current ('posted') success statuses
do $$
begin
  if to_regclass('public.scheduled_posts') is null then
    return;
  end if;

  alter table public.scheduled_posts drop constraint if exists scheduled_posts_status_check;
  alter table public.scheduled_posts
    add constraint scheduled_posts_status_check
    check (status in (
      'draft', 'scheduled', 'posting', 'posted', 'completed', 'failed', 'cancelled'
    ));
exception
  when others then
    raise notice 'scheduled_posts status constraint update skipped: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- posting_analytics
-- ---------------------------------------------------------------------------
create table if not exists public.posting_analytics (
  id uuid primary key default gen_random_uuid(),
  scheduled_post_id uuid references public.scheduled_posts(id) on delete cascade not null,
  account_id uuid,
  post_id uuid,
  impressions integer default 0,
  reach integer default 0,
  engagement_rate double precision default 0.0,
  clicks integer default 0,
  shares integer default 0,
  saves integer default 0,
  posted_at timestamptz,
  first_engagement_at timestamptz,
  peak_engagement_time timestamptz,
  expected_performance jsonb default '{}'::jsonb,
  performance_score double precision default 0.0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_posting_analytics_scheduled
  on public.posting_analytics(scheduled_post_id);
create index if not exists idx_posting_analytics_account
  on public.posting_analytics(account_id, posted_at);

alter table public.posting_analytics enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'posting_analytics'
      and policyname = 'Users can view analytics for their posts'
  ) then
    create policy "Users can view analytics for their posts" on public.posting_analytics
      for select using (
        scheduled_post_id in (select id from public.scheduled_posts where user_id = auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'posting_analytics'
      and policyname = 'Users can insert analytics for their posts'
  ) then
    create policy "Users can insert analytics for their posts" on public.posting_analytics
      for insert with check (
        scheduled_post_id in (select id from public.scheduled_posts where user_id = auth.uid())
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'posting_analytics'
      and policyname = 'Users can update analytics for their posts'
  ) then
    create policy "Users can update analytics for their posts" on public.posting_analytics
      for update using (
        scheduled_post_id in (select id from public.scheduled_posts where user_id = auth.uid())
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- hashtag_groups
-- ---------------------------------------------------------------------------
create table if not exists public.hashtag_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  group_name text not null,
  hashtags text[] not null,
  account_types text[] default array[]::text[],
  category text default 'general',
  performance_score double precision default 0.0,
  usage_count integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique (user_id, group_name)
);

create index if not exists idx_hashtag_groups_user
  on public.hashtag_groups(user_id, is_active);

alter table public.hashtag_groups enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'hashtag_groups'
      and policyname = 'Users can manage their own hashtag groups'
  ) then
    create policy "Users can manage their own hashtag groups" on public.hashtag_groups
      for all using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- get_cross_platform_analytics RPC
-- ---------------------------------------------------------------------------
create or replace function public.get_cross_platform_analytics(
  p_user_id uuid,
  p_start_date timestamptz default (now() - interval '30 days'),
  p_end_date timestamptz default now()
)
returns table (
  total_scheduled_posts integer,
  total_posted integer,
  total_failed integer,
  average_success_rate double precision,
  total_reach integer,
  total_engagement integer,
  best_performing_account_type text,
  optimal_posting_hour integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with post_stats as (
    select
      sp.id,
      sp.status,
      coalesce(array_length(sp.success_accounts, 1), 0) as success_count,
      coalesce(array_length(sp.failed_accounts, 1), 0) as failure_count,
      coalesce(array_length(sp.target_accounts, 1), 0) as target_count,
      coalesce(sp.total_reach, 0) as total_reach,
      coalesce(sp.total_engagement, 0) as total_engagement,
      extract(hour from sp.posted_at) as posting_hour
    from public.scheduled_posts sp
    where sp.user_id = p_user_id
      and sp.created_at between p_start_date and p_end_date
  ),
  account_performance as (
    select
      coalesce(a.account_type, 'unknown') as account_type,
      avg(pa.performance_score) as avg_performance
    from public.posting_analytics pa
    left join public.accounts a on pa.account_id = a.id
    join public.scheduled_posts sp on pa.scheduled_post_id = sp.id
    where sp.user_id = p_user_id
      and pa.created_at between p_start_date and p_end_date
    group by coalesce(a.account_type, 'unknown')
  )
  select
    count(*)::integer as total_scheduled_posts,
    count(*) filter (where status in ('completed', 'posted'))::integer as total_posted,
    count(*) filter (where status = 'failed')::integer as total_failed,
    coalesce(
      avg(
        case
          when target_count > 0 then success_count::double precision / target_count
          when status in ('completed', 'posted') then 1.0
          when status = 'failed' then 0.0
          else null
        end
      ),
      0
    ) as average_success_rate,
    coalesce(sum(total_reach), 0)::integer as total_reach,
    coalesce(sum(total_engagement), 0)::integer as total_engagement,
    (
      select account_type
      from account_performance
      order by avg_performance desc nulls last
      limit 1
    ) as best_performing_account_type,
    (
      select posting_hour::integer
      from post_stats
      where posting_hour is not null
      group by posting_hour
      order by count(*) desc
      limit 1
    ) as optimal_posting_hour
  from post_stats;
end;
$$;

grant execute on function public.get_cross_platform_analytics(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.get_cross_platform_analytics(uuid, timestamptz, timestamptz) to service_role;

comment on function public.get_cross_platform_analytics is
  'Aggregated scheduled-post performance for Content Hub cross-platform analytics';
