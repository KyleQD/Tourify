set client_min_messages = warning;

alter table public.artist_blog_posts
  add column if not exists feed_post_id uuid references public.posts(id) on delete set null;

alter table public.posts
  add column if not exists content_ref_type text,
  add column if not exists content_ref_id uuid;

create index if not exists idx_artist_blog_posts_feed_post_id
  on public.artist_blog_posts (feed_post_id);

create index if not exists idx_artist_blog_posts_acting_entity_published_at
  on public.artist_blog_posts (posted_as_profile_id, posted_as_type, published_at desc);

create index if not exists idx_posts_acting_entity_created_at
  on public.posts (posted_as_profile_id, posted_as_type, created_at desc);

create index if not exists idx_posts_content_ref
  on public.posts (content_ref_type, content_ref_id);

update public.artist_blog_posts
set posted_as_type = 'organization'
where posted_as_type = 'admin';

update public.posts
set posted_as_type = 'organization'
where posted_as_type = 'admin';

with matched_article_posts as (
  select
    article.id as article_id,
    post.id as post_id
  from public.artist_blog_posts article
  join public.posts post
    on post.user_id = article.user_id
   and post.content like '%' || '/blog/' || article.slug || '%'
  where article.feed_post_id is null
)
update public.artist_blog_posts article
set feed_post_id = matched.post_id
from matched_article_posts matched
where article.id = matched.article_id
  and article.feed_post_id is null;

update public.posts post
set
  content_ref_type = 'article',
  content_ref_id = article.id
from public.artist_blog_posts article
where article.feed_post_id = post.id
  and (
    post.content_ref_type is distinct from 'article'
    or post.content_ref_id is distinct from article.id
  );

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'update_updated_at_column'
  ) and not exists (
    select 1
    from pg_trigger
    where tgname = 'update_artist_blog_posts_updated_at'
  ) then
    create trigger update_artist_blog_posts_updated_at
      before update on public.artist_blog_posts
      for each row execute function update_updated_at_column();
  end if;
end $$;
