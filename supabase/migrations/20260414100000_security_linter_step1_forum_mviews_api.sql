set client_min_messages = warning;

-- Step 1 (security linter 0016_materialized_view_in_api):
-- Forum ranking MVs are refreshed by postgres/cron; they must not be directly
-- queryable via PostgREST (anon / authenticated).

revoke select on table public.forum_threads_hot_mv from PUBLIC, anon, authenticated;
revoke select on table public.forum_threads_top_mv from PUBLIC, anon, authenticated;
