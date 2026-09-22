-- Follower polls: options, votes, denormalized counters on posts.
-- Polls are posts with type = 'poll' attributed via posted_as_* columns.

set client_min_messages = warning;

-- ---------------------------------------------------------------------------
-- Posts: poll metadata columns
-- ---------------------------------------------------------------------------
alter table public.posts
  add column if not exists poll_ends_at timestamptz;

alter table public.posts
  add column if not exists poll_total_votes integer not null default 0;

create index if not exists idx_posts_type_poll
  on public.posts (posted_as_profile_id, created_at desc)
  where type = 'poll';

-- ---------------------------------------------------------------------------
-- poll_options
-- ---------------------------------------------------------------------------
create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  text text not null,
  position integer not null default 0,
  vote_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint poll_options_text_nonempty check (char_length(trim(text)) > 0),
  constraint poll_options_position_nonneg check (position >= 0)
);

create index if not exists idx_poll_options_post
  on public.poll_options (post_id, position);

-- ---------------------------------------------------------------------------
-- poll_votes (single choice per user per poll)
-- ---------------------------------------------------------------------------
create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists idx_poll_votes_post
  on public.poll_votes (post_id, created_at desc);

create index if not exists idx_poll_votes_option
  on public.poll_votes (option_id);

create index if not exists idx_poll_votes_user
  on public.poll_votes (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Counter triggers
-- ---------------------------------------------------------------------------
create or replace function public.bump_poll_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.poll_options
    set vote_count = coalesce(vote_count, 0) + 1
    where id = new.option_id;

    update public.posts
    set poll_total_votes = coalesce(poll_total_votes, 0) + 1
    where id = new.post_id;

    return new;
  elsif tg_op = 'DELETE' then
    update public.poll_options
    set vote_count = greatest(coalesce(vote_count, 0) - 1, 0)
    where id = old.option_id;

    update public.posts
    set poll_total_votes = greatest(coalesce(poll_total_votes, 0) - 1, 0)
    where id = old.post_id;

    return old;
  elsif tg_op = 'UPDATE' then
    if old.option_id is distinct from new.option_id then
      update public.poll_options
      set vote_count = greatest(coalesce(vote_count, 0) - 1, 0)
      where id = old.option_id;

      update public.poll_options
      set vote_count = coalesce(vote_count, 0) + 1
      where id = new.option_id;
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_poll_votes_counts on public.poll_votes;
create trigger trg_poll_votes_counts
  after insert or update or delete on public.poll_votes
  for each row
  execute function public.bump_poll_vote_counts();

-- ---------------------------------------------------------------------------
-- Helper: can the viewer see this poll post?
-- ---------------------------------------------------------------------------
create or replace function public.can_read_poll_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and (
        p.user_id = (select auth.uid())
        or coalesce(p.visibility, 'public') = 'public'
        or (
          coalesce(p.visibility, 'public') = 'followers'
          and (select auth.uid()) is not null
          and (
            exists (
              select 1
              from public.accounts a
              join public.account_follows af on af.account_id = a.id
              where a.profile_id = p.posted_as_profile_id
                and af.follower_user_id = (select auth.uid())
            )
            or exists (
              select 1
              from public.follows f
              where f.follower_id = (select auth.uid())
                and f.following_id = p.user_id
            )
          )
        )
      )
  );
$$;

revoke all on function public.can_read_poll_post(uuid) from public;
grant execute on function public.can_read_poll_post(uuid) to authenticated, anon;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.poll_options enable row level security;
alter table public.poll_votes enable row level security;

drop policy if exists poll_options_select on public.poll_options;
create policy poll_options_select on public.poll_options
  for select to authenticated, anon
  using (public.can_read_poll_post(post_id));

drop policy if exists poll_options_insert_owner on public.poll_options;
create policy poll_options_insert_owner on public.poll_options
  for insert to authenticated
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.user_id = (select auth.uid())
        and p.type = 'poll'
    )
  );

drop policy if exists poll_options_delete_owner on public.poll_options;
create policy poll_options_delete_owner on public.poll_options
  for delete to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists poll_votes_select on public.poll_votes;
create policy poll_votes_select on public.poll_votes
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists poll_votes_insert_own on public.poll_votes;
create policy poll_votes_insert_own on public.poll_votes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_read_poll_post(post_id)
    and exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.type = 'poll'
        and (p.poll_ends_at is null or p.poll_ends_at > now())
    )
    and exists (
      select 1 from public.poll_options o
      where o.id = option_id
        and o.post_id = post_id
    )
  );

drop policy if exists poll_votes_delete_own on public.poll_votes;
create policy poll_votes_delete_own on public.poll_votes
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select on public.poll_options to anon, authenticated;
grant insert, delete on public.poll_options to authenticated;
grant all on public.poll_options to service_role;

grant select, insert, delete on public.poll_votes to authenticated;
grant all on public.poll_votes to service_role;
