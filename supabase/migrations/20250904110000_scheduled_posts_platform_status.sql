set client_min_messages = warning;

-- Add per-platform status tracking on scheduled_posts (table may not exist on all migration paths)

alter table if exists scheduled_posts
  add column if not exists platform_status jsonb default '{}'::jsonb,
  add column if not exists platform_errors jsonb default '{}'::jsonb;

do $body$
begin
  if to_regclass('public.scheduled_posts') is null then
    return;
  end if;
  execute 'create index if not exists idx_scheduled_posts_platform_status on public.scheduled_posts using gin(platform_status)';
  execute 'create index if not exists idx_scheduled_posts_platform_errors on public.scheduled_posts using gin(platform_errors)';
end $body$;
