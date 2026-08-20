-- AUDIT:API-006 / AUDIT:DOM-104
-- Forward-only convergence of post comment counters. This migration changes no
-- persisted row counts by itself; reconciliation is an explicit bounded job.

set lock_timeout = '5s';
set statement_timeout = '60s';

create schema if not exists private;

create or replace function private.audit_update_post_comments_count()
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

  update public.posts
  set comments_count = greatest(coalesce(comments_count, 0) + delta, 0)
  where id = target_post_id;

  return null;
end;
$$;

revoke all on function private.audit_update_post_comments_count() from public, anon, authenticated;

-- Security replacement: remove both historical trigger names so a comment
-- cannot be counted twice, then install one canonical trigger.
drop trigger if exists post_comments_count_trigger on public.post_comments;
drop trigger if exists trigger_post_comment_count_update on public.post_comments;
drop trigger if exists audit_post_comments_count_trigger on public.post_comments;

create trigger audit_post_comments_count_trigger
after insert or delete on public.post_comments
for each row execute function private.audit_update_post_comments_count();

create or replace function private.audit_reconcile_post_comment_counts(
  batch_after uuid default null,
  batch_size integer default 500
)
returns table(post_id uuid, previous_count integer, reconciled_count integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if batch_size < 1 or batch_size > 5000 then
    raise exception 'batch_size must be between 1 and 5000';
  end if;

  return query
  with candidates as (
    select
      p.id,
      coalesce(p.comments_count, 0)::integer as prior_count,
      count(c.id)::integer as actual_count
    from public.posts p
    left join public.post_comments c on c.post_id = p.id
    where batch_after is null or p.id > batch_after
    group by p.id, p.comments_count
    having coalesce(p.comments_count, 0)::integer is distinct from count(c.id)::integer
    order by p.id
    limit batch_size
  ),
  updated as (
    update public.posts p
    set comments_count = candidates.actual_count
    from candidates
    where p.id = candidates.id
    returning p.id, candidates.prior_count, candidates.actual_count
  )
  select updated.id, updated.prior_count, updated.actual_count
  from updated
  order by updated.id;
end;
$$;

revoke all on function private.audit_reconcile_post_comment_counts(uuid, integer)
  from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.audit_reconcile_post_comment_counts(uuid, integer)
  to service_role;
