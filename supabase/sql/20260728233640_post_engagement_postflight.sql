-- Postflight checks for 20260728233640_repair_post_engagement_persistence.sql.
-- Each query must return zero rows.

select event_object_table, trigger_name
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('post_likes', 'post_comments', 'post_shares')
  and (
    trigger_name ilike '%count%'
    or action_statement ilike '%engagement_count%'
  )
  and trigger_name not in (
    'canonical_post_likes_count',
    'canonical_post_comments_count',
    'canonical_post_shares_count'
  );

with trigger_counts as (
  select event_object_table, count(distinct trigger_name) as count_triggers
  from information_schema.triggers
  where event_object_schema = 'public'
    and trigger_name in (
      'canonical_post_likes_count',
      'canonical_post_comments_count',
      'canonical_post_shares_count'
    )
  group by event_object_table
)
select expected.table_name, coalesce(actual.count_triggers, 0) as count_triggers
from (
  values ('post_likes'), ('post_comments'), ('post_shares')
) as expected(table_name)
left join trigger_counts actual on actual.event_object_table = expected.table_name
where coalesce(actual.count_triggers, 0) <> 1;

with likes as (
  select post_id, count(*)::integer as actual from public.post_likes group by post_id
),
comments as (
  select post_id, count(*)::integer as actual from public.post_comments group by post_id
),
shares as (
  select post_id, count(*)::integer as actual from public.post_shares group by post_id
)
select p.id
from public.posts p
left join likes on likes.post_id = p.id
left join comments on comments.post_id = p.id
left join shares on shares.post_id = p.id
where p.likes_count is distinct from coalesce(likes.actual, 0)
   or p.comments_count is distinct from coalesce(comments.actual, 0)
   or p.shares_count is distinct from coalesce(shares.actual, 0);
