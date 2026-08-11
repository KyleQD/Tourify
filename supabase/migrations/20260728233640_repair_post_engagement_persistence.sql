-- Repair persistence for likes, comments, and shares on public.posts.
-- Interaction rows are the source of truth; posts.*_count are projections.

set lock_timeout = '5s';
set statement_timeout = '120s';

create schema if not exists private;

-- post_likes.user_id represents the authenticated user, just like comments and
-- shares. Historical schema versions pointed it at profiles(id).
alter table public.post_likes
  drop constraint if exists post_likes_user_id_fkey;

alter table public.post_likes
  add constraint post_likes_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade
  not valid;

alter table public.post_likes
  validate constraint post_likes_user_id_fkey;

alter table public.post_shares
  alter column post_id set not null,
  alter column user_id set not null;

alter table public.post_shares
  drop constraint if exists post_shares_destination_check;

alter table public.post_shares
  add constraint post_shares_destination_check
  check (shared_to in ('clipboard', 'native', 'feed'));

-- Remove every historical counter trigger. Notification and author engagement
-- triggers deliberately remain installed.
drop trigger if exists post_likes_insert_trigger on public.post_likes;
drop trigger if exists post_likes_delete_trigger on public.post_likes;
drop trigger if exists trigger_post_like_count_update on public.post_likes;
drop trigger if exists update_post_like_counts_trigger on public.post_likes;
drop trigger if exists post_likes_count_trigger on public.post_likes;
drop trigger if exists trigger_update_post_likes_count on public.post_likes;

drop trigger if exists post_comments_count_trigger on public.post_comments;
drop trigger if exists trigger_post_comment_count_update on public.post_comments;
drop trigger if exists trigger_update_post_comments_count on public.post_comments;
drop trigger if exists audit_post_comments_count_trigger on public.post_comments;

drop trigger if exists shares_count_trigger on public.post_shares;
drop trigger if exists trigger_post_share_count_update on public.post_shares;
drop trigger if exists trigger_update_post_shares_count on public.post_shares;

create or replace function private.sync_post_engagement_count()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_post_id uuid;
  delta integer;
begin
  if tg_op = 'INSERT' then
    target_post_id := new.post_id;
    delta := 1;
  elsif tg_op = 'DELETE' then
    target_post_id := old.post_id;
    delta := -1;
  else
    return null;
  end if;

  if tg_table_name = 'post_likes' then
    update public.posts
    set likes_count = greatest(coalesce(likes_count, 0) + delta, 0)
    where id = target_post_id;
  elsif tg_table_name = 'post_comments' then
    update public.posts
    set comments_count = greatest(coalesce(comments_count, 0) + delta, 0)
    where id = target_post_id;
  elsif tg_table_name = 'post_shares' then
    update public.posts
    set shares_count = greatest(coalesce(shares_count, 0) + delta, 0)
    where id = target_post_id;
  else
    raise exception 'Unsupported engagement table: %', tg_table_name;
  end if;

  return null;
end;
$$;

revoke all on function private.sync_post_engagement_count()
  from public, anon, authenticated;

create trigger canonical_post_likes_count
after insert or delete on public.post_likes
for each row execute function private.sync_post_engagement_count();

create trigger canonical_post_comments_count
after insert or delete on public.post_comments
for each row execute function private.sync_post_engagement_count();

create trigger canonical_post_shares_count
after insert or delete on public.post_shares
for each row execute function private.sync_post_engagement_count();

-- Visibility helper used by interaction-table RLS. It lives outside the
-- exposed schema and accepts the verified auth.uid() as an explicit argument.
create or replace function private.can_view_post_engagement(
  target_post_id uuid,
  viewer_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = target_post_id
      and (
        viewer_user_id = p.user_id
        or (
          p.is_visible = true
          and p.moderation_status = 'approved'
          and (
            coalesce(p.visibility, 'public') = 'public'
            or (
              viewer_user_id is not null
              and coalesce(p.visibility, 'public') = 'followers'
              and (
                exists (
                  select 1
                  from public.follows f
                  where f.follower_id = viewer_user_id
                    and f.following_id = p.user_id
                )
                or exists (
                  select 1
                  from public.accounts a
                  join public.account_follows af on af.account_id = a.id
                  where a.profile_id = p.posted_as_profile_id
                    and af.follower_user_id = viewer_user_id
                )
              )
            )
            or (
              viewer_user_id is not null
              and coalesce(p.visibility, 'public') = 'friends'
              and exists (
                select 1
                from public.follows outgoing
                where outgoing.follower_id = viewer_user_id
                  and outgoing.following_id = p.user_id
              )
              and exists (
                select 1
                from public.follows incoming
                where incoming.follower_id = p.user_id
                  and incoming.following_id = viewer_user_id
              )
            )
          )
        )
      )
  );
$$;

revoke all on function private.can_view_post_engagement(uuid, uuid) from public;
grant usage on schema private to anon, authenticated, service_role;
grant execute on function private.can_view_post_engagement(uuid, uuid)
  to anon, authenticated, service_role;

alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_shares enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('post_likes', 'post_comments', 'post_shares')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end;
$$;

create policy post_likes_select_visible
on public.post_likes for select
to anon, authenticated
using (private.can_view_post_engagement(post_id, (select auth.uid())));

create policy post_likes_insert_own
on public.post_likes for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_view_post_engagement(post_id, (select auth.uid()))
);

create policy post_likes_delete_own
on public.post_likes for delete
to authenticated
using (user_id = (select auth.uid()));

create policy post_comments_select_visible
on public.post_comments for select
to anon, authenticated
using (private.can_view_post_engagement(post_id, (select auth.uid())));

create policy post_comments_insert_own
on public.post_comments for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_view_post_engagement(post_id, (select auth.uid()))
);

create policy post_comments_update_own
on public.post_comments for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy post_comments_delete_own
on public.post_comments for delete
to authenticated
using (user_id = (select auth.uid()));

create policy post_shares_select_visible
on public.post_shares for select
to anon, authenticated
using (private.can_view_post_engagement(post_id, (select auth.uid())));

create policy post_shares_insert_own
on public.post_shares for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.can_view_post_engagement(post_id, (select auth.uid()))
);

create policy post_shares_delete_own
on public.post_shares for delete
to authenticated
using (user_id = (select auth.uid()));

-- A feed reshare must create the new post and its share event together.
-- SECURITY INVOKER keeps both inserts subject to the caller's RLS policies.
create or replace function public.create_post_reshare(
  target_post_id uuid,
  reshare_content text,
  reshare_visibility text,
  acting_type text,
  acting_profile_id uuid,
  acting_display_name text,
  acting_username text,
  acting_avatar_url text,
  reshare_metadata jsonb
)
returns public.posts
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  created_post public.posts;
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not private.can_view_post_engagement(target_post_id, caller_id) then
    raise exception 'Post not found' using errcode = 'P0002';
  end if;

  insert into public.posts (
    user_id,
    content,
    type,
    visibility,
    content_ref_type,
    content_ref_id,
    posted_as_type,
    posted_as_profile_id,
    account_display_name,
    account_username,
    account_avatar_url,
    metadata
  )
  values (
    caller_id,
    reshare_content,
    'share',
    case when reshare_visibility = 'followers' then 'followers' else 'public' end,
    'post',
    target_post_id,
    acting_type,
    acting_profile_id,
    acting_display_name,
    acting_username,
    acting_avatar_url,
    coalesce(reshare_metadata, '{}'::jsonb)
  )
  returning * into created_post;

  insert into public.post_shares (post_id, user_id, shared_to)
  values (target_post_id, caller_id, 'feed');

  return created_post;
end;
$$;

revoke all on function public.create_post_reshare(
  uuid, text, text, text, uuid, text, text, text, jsonb
) from public, anon;
grant execute on function public.create_post_reshare(
  uuid, text, text, text, uuid, text, text, text, jsonb
) to authenticated, service_role;

-- Correct all projections from their canonical interaction rows.
update public.posts p
set
  likes_count = (select count(*)::integer from public.post_likes l where l.post_id = p.id),
  comments_count = (select count(*)::integer from public.post_comments c where c.post_id = p.id),
  shares_count = (select count(*)::integer from public.post_shares s where s.post_id = p.id);

-- These functions powered only the removed legacy counter triggers.
drop function if exists public.update_post_like_counts();
drop function if exists public.update_post_likes_count();
drop function if exists public.update_post_comments_count();
drop function if exists public.update_shares_count();
drop function if exists public.update_post_engagement_counts();
drop function if exists private.audit_update_post_comments_count();
