-- ============================================================================
-- 20260926140000_interaction_read_scoping.sql
-- DB-008 / DB-011 — stage 1 of HF-DB-006-SOCIAL-007.
--
-- THE DEFECT
--   `post_likes`, `comment_likes` and `post_comments` each carry a SELECT
--   policy of `USING (true)`:
--     20240430000000_create_posts.sql:47-49            post_likes
--     20241220000010_enhance_feed_system.sql:131-134   post_comments
--     20241220000010_enhance_feed_system.sql:152-155   comment_likes
--   RLS policies are permissive and combine by UNION, so a `USING (true)` policy
--   makes every row of the table readable by every role holding a table-level
--   SELECT grant. Supabase's default privileges grant exactly that to `anon`, so
--   an unauthenticated internet caller could read through PostgREST:
--     * the entire platform-wide like graph as (user_id, post_id) pairs and,
--       joined to `profiles` on the shape the product already uses
--       (app/api/community/activity/route.ts:56-66), every liker's identity
--     * every comment body on every post
--   That is a platform-wide identity and engagement graph, not a per-viewer read.
--   It is an authorization defect, not a type error, and no generated type
--   changes it.
--
-- WHAT THIS MIGRATION DOES — stage 1, deliberately behaviour-preserving
--   It replaces the `USING (true)` SELECT policy on all three tables with a
--   policy scoped `TO authenticated` and predicated on the parent row being
--   readable:
--     * anon now has NO applicable SELECT policy on any of the three tables and
--       is denied every row. The internet-wide exposure is closed HERE.
--     * every authenticated caller keeps exactly the rows it had before, so no
--       product behaviour changes and no consumer coordination is required for
--       this stage to land. That is why the predicate is parent-scoped rather
--       than `USING (true)` and rather than own-rows-only: it is the strongest
--       predicate that provably cannot break a committed surface.
--     * the predicate is not a no-op by accident. It mirrors the tables' own
--       foreign keys, and it makes each policy follow any future tightening of
--       its parent instead of silently staying world-readable.
--   INSERT/UPDATE/DELETE policies are NOT touched: they already bind on
--   `auth.uid() = user_id` and are not part of the finding.
--
-- WHAT THIS MIGRATION DOES NOT DO — stage 2, and why it is not here
--   The correct long-run rule is "a caller may read a like only if they are the
--   liker, or they are entitled to that post's engagement". Three committed
--   surfaces legitimately need the second disjunct and are owned by other lanes,
--   so shipping it from this lane would break them at runtime:
--     * app/api/notifications/social/route.ts:291-297 lists the LIKERS of a post
--       (`.eq('post_id', postId)`, selects `user_id`, paginated) through the
--       caller-scoped client from `authenticateApiRequest`. Owner: social.
--     * lib/admin/content-hub/org-posts.ts:55 counts every like per post with no
--       user filter, through the caller-scoped client from `withAdminCapability`.
--       Owner: admin.
--     * app/api/community/activity/route.ts:56-66 joins likers to `profiles` for
--       the public activity surface, already on `createServiceRoleClient()` and
--       therefore unaffected by RLS either way. Owner: social.
--   The five viewer-scoped consumers need nothing: they already filter
--   `user_id = <the caller>`, including the two browser components named in the
--   handoff (components/artist/artist-home-feed.tsx:186-192 and
--   components/profile/public-profile-view.tsx:284-290) and the server helper
--   lib/social/post-like-state.ts:264-268.
--   Stage 2 is raised as HF-DB-006-SOCIAL-007-STAGE2 with those exact lines.
--   Until it lands, an AUTHENTICATED caller can still read other users' likes.
--   This migration reduces the blast radius from "the internet" to "any account"
--   and says so rather than implying the finding is closed.
--
-- CONVENTIONS
--   Additive and forward-only. No table, column, index, trigger or function is
--   created, altered or dropped. Only three SELECT policies are replaced. RLS
--   stays enabled on all three tables. Idempotent: re-applying replaces the same
--   final policy names.
-- ============================================================================

set client_min_messages = warning;

begin;

-- ---------------------------------------------------------------------------
-- post_likes
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone can view likes" on public.post_likes;
drop policy if exists "Users can view likes on visible posts" on public.post_likes;

create policy "Users can view likes on visible posts"
  on public.post_likes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_likes.post_id
    )
  );

comment on policy "Users can view likes on visible posts" on public.post_likes is
  'DB-008/DB-011 stage 1 of HF-DB-006-SOCIAL-007. Replaces USING (true), which made the whole platform like graph readable by anon. Stage 1 denies anon and preserves every authenticated row; the parent-post predicate mirrors post_likes_post_id_fkey and follows any future tightening of posts. Stage 2 (own rows plus entitled engagement readers) is raised as HF-DB-006-SOCIAL-007-STAGE2 and is owned by the social and admin lanes.';

-- ---------------------------------------------------------------------------
-- comment_likes — same defect class, same table shape. Not named in the original
-- handoff; found by the same scan.
-- ---------------------------------------------------------------------------
drop policy if exists "Comment likes are viewable by everyone" on public.comment_likes;
drop policy if exists "Users can view comment likes on visible comments" on public.comment_likes;

create policy "Users can view comment likes on visible comments"
  on public.comment_likes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.post_comments c
      join public.posts p on p.id = c.post_id
      where c.id = comment_likes.comment_id
    )
  );

comment on policy "Users can view comment likes on visible comments" on public.comment_likes is
  'DB-008/DB-011 stage 1 of HF-DB-006-SOCIAL-007. Same USING (true) defect as post_likes, not named in the original handoff. Denies anon; preserves every authenticated row.';

-- ---------------------------------------------------------------------------
-- post_comments — public product content on public posts (`posts` is itself
-- USING (true)), so it stays readable to authenticated callers.
-- ---------------------------------------------------------------------------
drop policy if exists "Comments are viewable by everyone" on public.post_comments;
drop policy if exists "Users can view comments on visible posts" on public.post_comments;

create policy "Users can view comments on visible posts"
  on public.post_comments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_comments.post_id
    )
  );

comment on policy "Users can view comments on visible posts" on public.post_comments is
  'DB-008/DB-011 stage 1 of HF-DB-006-SOCIAL-007. Comment bodies are public product content on public posts, so this stays readable to authenticated callers. The parent-post requirement is a no-op while posts is public and makes the policy follow any future tightening of posts instead of staying world-readable. It also mirrors post_comments_post_id_fkey, so a comment whose parent is not selectable is denied at the policy as well as the constraint.';

-- ---------------------------------------------------------------------------
-- Post-state assertions. A migration that silently failed to apply its policies
-- would leave the exposure open while reporting success, so the state is
-- verified here rather than assumed.
-- ---------------------------------------------------------------------------
do $$
declare
  v_bad text;
begin
  select string_agg(t, ', ')
    into v_bad
  from unnest(array['post_likes', 'comment_likes', 'post_comments']) as t
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = t
      and c.relrowsecurity
  );
  if v_bad is not null then
    raise exception 'row level security is not enabled on: %', v_bad;
  end if;

  -- Every SELECT policy on these tables must be scoped to `authenticated` only.
  -- A policy applicable to PUBLIC (the default) or to anon re-opens the exact
  -- exposure this migration closes, regardless of its predicate.
  select string_agg(c.relname || '.' || p.polname, ', ')
    into v_bad
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('post_likes', 'comment_likes', 'post_comments')
    and p.polcmd = 'r'
    and p.polroles <> array[(select oid from pg_roles where rolname = 'authenticated')]::oid[];
  if v_bad is not null then
    raise exception 'a SELECT policy still applies beyond authenticated on: %', v_bad;
  end if;
end $$;

commit;
