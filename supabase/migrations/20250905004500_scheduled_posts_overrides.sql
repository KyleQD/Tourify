set client_min_messages = warning;

-- Ensure scheduled_posts has account_specific_content JSONB column for per-platform overrides
do $body$
begin
  if to_regclass('public.scheduled_posts') is null then
    return;
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'scheduled_posts'
      and column_name = 'account_specific_content'
  ) then
    alter table public.scheduled_posts
      add column account_specific_content jsonb default '{}'::jsonb;
  end if;
end $body$;

-- Optional index to query by a specific platform override key quickly
-- create index if not exists scheduled_posts_overrides_gin on public.scheduled_posts using gin (account_specific_content jsonb_path_ops);



