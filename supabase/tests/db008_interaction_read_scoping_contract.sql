-- ============================================================================
-- db008_interaction_read_scoping_contract.sql
--
-- Zero-drift postflight for 20260926140000_interaction_read_scoping.sql
-- (HF-DB-006-SOCIAL-007, stage 1).
--
-- Returns ONLY rows that violate the contract, plus exactly one summary row
-- named `interaction_read_scoping_ready`. A caller that reads zero rows has
-- passed; a caller that reads any row has not.
--
-- The behavioural half of the contract (anon is denied, an authenticated caller
-- is not, an orphan comment is denied) lives in
-- supabase/tests/db011_interaction_scope.harness.sh, because it needs a role
-- switch and a JWT claim rather than a single SELECT.
-- ============================================================================

with violations as (
  -- 1. RLS must still be enabled on all three tables.
  select 'rls_disabled'::text as check_name, t as detail
  from unnest(array['post_likes', 'comment_likes', 'post_comments']) as t
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = t and c.relrowsecurity
  )

  union all
  -- 2. The three final SELECT policies must exist under their final names.
  select 'missing_policy', v.pair
  from (values
    ('post_likes',    'Users can view likes on visible posts'),
    ('comment_likes', 'Users can view comment likes on visible comments'),
    ('post_comments', 'Users can view comments on visible posts')
  ) as v(tbl, pair)
  where not exists (
    select 1
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = v.tbl
      and p.polname = v.pair
      and p.polcmd = 'r'
  )

  union all
  -- 3. Each final policy must be scoped to `authenticated`. A policy that applies
  --    to PUBLIC re-opens the exact anon exposure this migration closes.
  select 'policy_not_authenticated_only', c.relname || '.' || p.polname
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('post_likes', 'comment_likes', 'post_comments')
    and p.polcmd = 'r'
    and p.polname in (
      'Users can view likes on visible posts',
      'Users can view comment likes on visible comments',
      'Users can view comments on visible posts'
    )
    and p.polroles <> array[(select oid from pg_roles where rolname = 'authenticated')]::oid[]

  union all
  -- 4. NO SELECT policy on these tables may apply beyond `authenticated`. This,
  --    not "the predicate is not literally `true`", is the property that closes
  --    the anon exposure: a policy with `polroles = {0}` (PUBLIC) admits anon
  --    whatever its predicate says, and a policy scoped to `anon` admits anon
  --    outright.
  select 'select_policy_applies_beyond_authenticated', c.relname || '.' || p.polname
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('post_likes', 'comment_likes', 'post_comments')
    and p.polcmd = 'r'
    and p.polroles <> array[(select oid from pg_roles where rolname = 'authenticated')]::oid[]

  union all
  -- 5. The superseded policy names must be gone, or the UNION of permissive
  --    policies silently restores USING (true).
  select 'superseded_policy_still_present', c.relname || '.' || p.polname
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('post_likes', 'comment_likes', 'post_comments')
    and p.polcmd = 'r'
    and p.polname in (
      'Anyone can view likes',
      'Comment likes are viewable by everyone',
      'Comments are viewable by everyone'
    )

  union all
  -- 6. The write policies must be untouched: this migration changes read scope
  --    only, and a write policy that disappeared would be an unreviewed change.
  select 'missing_write_policy', v.tbl || '.' || v.pol
  from (values
    ('post_likes',     'a', 'Users can like posts'),
    ('post_likes',     'd', 'Users can unlike posts'),
    ('comment_likes',  'a', 'Users can like comments'),
    ('comment_likes',  'd', 'Users can unlike comments'),
    ('post_comments',  'a', 'Users can create comments'),
    ('post_comments',  'w', 'Users can update their own comments'),
    ('post_comments',  'd', 'Users can delete their own comments')
  -- pg_policy.polcmd uses PostgreSQL's own letters: r=SELECT a=INSERT w=UPDATE
  -- d=DELETE. 'u' is not a value polcmd can take, so a typo here silently checks
  -- nothing.
  ) as v(tbl, cmd, pol)
  where not exists (
    select 1
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = v.tbl
      and p.polname = v.pol
      and p.polcmd = v.cmd
  )

  union all
  -- 7. Each final policy must be PARENT-SCOPED, i.e. reference the relation its
  --    foreign key points at. A policy that lost its parent reference would still
  --    deny anon and would pass checks 1-6, while silently becoming a
  --    whole-table read the moment `posts` is tightened.
  select 'policy_not_parent_scoped', c.relname || '.' || p.polname
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and (
      (c.relname = 'post_likes'     and p.polname = 'Users can view likes on visible posts' and pg_get_expr(p.polqual, p.polrelid) !~* 'posts')
      or (c.relname = 'comment_likes' and p.polname = 'Users can view comment likes on visible comments' and (pg_get_expr(p.polqual, p.polrelid) !~* 'post_comments' or pg_get_expr(p.polqual, p.polrelid) !~* 'posts'))
      or (c.relname = 'post_comments' and p.polname = 'Users can view comments on visible posts' and pg_get_expr(p.polqual, p.polrelid) !~* 'posts')
    )

  union all
  -- 8. The final policies must not be a bare `USING (true)` dressed up with a
  --    role clause. That form passes checks 1-7 and is exactly the defect this
  --    migration exists to remove.
  select 'policy_is_bare_true', c.relname || '.' || p.polname
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('post_likes', 'comment_likes', 'post_comments')
    and p.polcmd = 'r'
    and pg_get_expr(p.polqual, p.polrelid) = 'true'
)
select * from violations
union all
select 'interaction_read_scoping_ready'::text, 'all checks passed'::text
where not exists (select 1 from violations);
