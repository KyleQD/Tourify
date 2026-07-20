-- Feed post collaborators (Instagram-style co-author / network share)
-- Distinct from promotion post_collaborators which FK to promotion_posts.

create table if not exists public.feed_post_collaborators (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  collaborator_user_id uuid not null references auth.users (id) on delete cascade,
  collaborator_profile_id uuid,
  status text not null default 'invited'
    check (status in ('invited', 'accepted', 'declined')),
  invited_by_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (post_id, collaborator_user_id)
);

create index if not exists feed_post_collaborators_collaborator_status_idx
  on public.feed_post_collaborators (collaborator_user_id, status);

create index if not exists feed_post_collaborators_post_status_idx
  on public.feed_post_collaborators (post_id, status);

create index if not exists feed_post_collaborators_profile_status_idx
  on public.feed_post_collaborators (collaborator_profile_id, status)
  where collaborator_profile_id is not null;

-- Ensure tagged_users GIN index exists for containment queries
create index if not exists posts_tagged_users_gin_idx
  on public.posts using gin (tagged_users);

alter table public.feed_post_collaborators enable row level security;

drop policy if exists feed_post_collaborators_select on public.feed_post_collaborators;
create policy feed_post_collaborators_select on public.feed_post_collaborators
  for select using (
    collaborator_user_id = auth.uid()
    or invited_by_user_id = auth.uid()
    or exists (
      select 1 from public.posts p
      where p.id = feed_post_collaborators.post_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists feed_post_collaborators_insert on public.feed_post_collaborators;
create policy feed_post_collaborators_insert on public.feed_post_collaborators
  for insert with check (
    invited_by_user_id = auth.uid()
    and exists (
      select 1 from public.posts p
      where p.id = feed_post_collaborators.post_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists feed_post_collaborators_update on public.feed_post_collaborators;
create policy feed_post_collaborators_update on public.feed_post_collaborators
  for update using (
    collaborator_user_id = auth.uid()
    or invited_by_user_id = auth.uid()
  )
  with check (
    collaborator_user_id = auth.uid()
    or invited_by_user_id = auth.uid()
  );

drop policy if exists feed_post_collaborators_delete on public.feed_post_collaborators;
create policy feed_post_collaborators_delete on public.feed_post_collaborators
  for delete using (
    invited_by_user_id = auth.uid()
    or exists (
      select 1 from public.posts p
      where p.id = feed_post_collaborators.post_id
        and p.user_id = auth.uid()
    )
  );
