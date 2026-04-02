-- Scaling indexes and materialized views for forum performance

-- Extensions needed
create extension if not exists pg_trgm;
create extension if not exists pg_cron;

-- Forum threads: common read paths
create index if not exists idx_threads_forum_hot_v2
  on forum_threads_v2 (forum_id, hot_score desc, created_at desc);

create index if not exists idx_threads_kind_created_v2
  on forum_threads_v2 (kind, created_at desc);

-- Forum posts: tree reads
create index if not exists idx_forum_posts_thread_path_v2
  on forum_posts_v2 (thread_id, path);

create index if not exists idx_forum_posts_thread_created_v2
  on forum_posts_v2 (thread_id, created_at asc);

-- Votes: target+user lookups and dedupe
create index if not exists idx_forum_votes_target_user_v2
  on forum_votes_v2 (target_kind, target_id, user_id);

-- Partial indexes per kind to shrink btree size
create index if not exists idx_forum_votes_thread_user_v2
  on forum_votes_v2 (target_id, user_id)
  where target_kind = 'thread';

create index if not exists idx_forum_votes_post_user_v2
  on forum_votes_v2 (target_id, user_id)
  where target_kind = 'post';

-- Username search improvements (fuzzy)
create index if not exists idx_profiles_username_trgm
  on profiles using gin (username gin_trgm_ops);

-- Materialized views for hot/new/top (7 day window for hot/top)
create materialized view if not exists forum_threads_hot_mv as
select id, forum_id, title, kind, score, hot_score, comments_count, created_at
from forum_threads_v2
where created_at > now() - interval '7 days';

create unique index if not exists idx_hot_mv_id on forum_threads_hot_mv (id);
create index if not exists idx_hot_mv_order on forum_threads_hot_mv (hot_score desc, created_at desc);

create materialized view if not exists forum_threads_top_mv as
select id, forum_id, title, kind, score, comments_count, created_at
from forum_threads_v2
where created_at > now() - interval '7 days';

create unique index if not exists idx_top_mv_id on forum_threads_top_mv (id);
create index if not exists idx_top_mv_order on forum_threads_top_mv (score desc, created_at desc);

-- Refresh helpers
create or replace function refresh_forum_mviews() returns void language plpgsql as $$
begin
  refresh materialized view concurrently forum_threads_hot_mv;
  refresh materialized view concurrently forum_threads_top_mv;
end $$;

-- pg_cron: register in dashboard or run once (invalid to append ON CONFLICT to SELECT cron.schedule)
-- select cron.schedule('refresh_forum_mviews_every_min', '*/1 * * * *', $$ select refresh_forum_mviews(); $$);


