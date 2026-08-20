-- Account-scoped follows for artist / venue / organization personas.
-- Friend graph remains user-scoped (follows + follow_requests).

set client_min_messages = warning;

create table if not exists public.account_follows (
  id uuid primary key default gen_random_uuid(),
  follower_user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_user_id, account_id),
  check (follower_user_id is distinct from null)
);

create index if not exists idx_account_follows_follower
  on public.account_follows (follower_user_id, created_at desc);

create index if not exists idx_account_follows_account
  on public.account_follows (account_id, created_at desc);

alter table public.accounts
  add column if not exists follower_count integer not null default 0;

alter table public.account_follows enable row level security;

drop policy if exists account_follows_select on public.account_follows;
create policy account_follows_select on public.account_follows
  for select to authenticated, anon
  using (true);

drop policy if exists account_follows_insert_own on public.account_follows;
create policy account_follows_insert_own on public.account_follows
  for insert to authenticated
  with check (follower_user_id = (select auth.uid()));

drop policy if exists account_follows_delete_own on public.account_follows;
create policy account_follows_delete_own on public.account_follows
  for delete to authenticated
  using (follower_user_id = (select auth.uid()));

grant select on public.account_follows to anon, authenticated;
grant insert, delete on public.account_follows to authenticated;
grant all on public.account_follows to service_role;

create or replace function public.bump_account_follower_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.accounts
    set follower_count = coalesce(follower_count, 0) + 1,
        updated_at = now()
    where id = new.account_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.accounts
    set follower_count = greatest(coalesce(follower_count, 0) - 1, 0),
        updated_at = now()
    where id = old.account_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_account_follows_count on public.account_follows;
create trigger trg_account_follows_count
  after insert or delete on public.account_follows
  for each row
  execute function public.bump_account_follower_count();
