set client_min_messages = warning;

-- ============================================================================
-- Event dedup, claims and ownership (Phases 5-6)
-- Additive only. RLS from creation.
-- ============================================================================

-- Fuzzy duplicate candidates awaiting human review.
create table if not exists public.event_merge_candidates (
  id uuid primary key default gen_random_uuid(),
  left_event_id uuid not null references public.events(id) on delete cascade,
  right_event_id uuid not null references public.events(id) on delete cascade,
  source_record_id uuid references public.event_external_sources(id) on delete set null,
  confidence_score numeric not null,
  match_reasons jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'merged', 'rejected', 'never_merge')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint event_merge_candidates_distinct check (left_event_id <> right_event_id)
);

create unique index if not exists idx_event_merge_candidates_pair_pending
  on public.event_merge_candidates (least(left_event_id::text, right_event_id::text), greatest(left_event_id::text, right_event_id::text))
  where status = 'pending';

-- Explicit "never merge" decisions survive future imports.
create table if not exists public.event_merge_decisions (
  id uuid primary key default gen_random_uuid(),
  left_event_id uuid not null references public.events(id) on delete cascade,
  right_event_id uuid not null references public.events(id) on delete cascade,
  decision text not null check (decision in ('never_merge')),
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (left_event_id, right_event_id)
);

-- Redirects from losing canonical URLs after a merge.
create table if not exists public.event_slug_redirects (
  slug text primary key,
  target_event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Ownership claims on imported events.
create table if not exists public.event_claims (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  claimant_user_id uuid not null references auth.users(id) on delete cascade,
  claimant_account_type text not null
    check (claimant_account_type in ('artist', 'venue', 'organization')),
  claimant_account_id uuid,
  relationship_type text not null
    check (relationship_type in ('performer', 'venue_host', 'organizer', 'manager')),
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'revoked')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_event_claims_event on public.event_claims (event_id, status);
create index if not exists idx_event_claims_claimant on public.event_claims (claimant_user_id, status);

-- Field-level native enrichment preservation.
create table if not exists public.event_field_overrides (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  field_path text not null,
  value jsonb,
  authority_type text not null
    check (authority_type in ('owner', 'native_editor', 'venue', 'organization')),
  authority_id uuid,
  locked boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, field_path)
);

-- ============================================================================
-- RLS
-- ============================================================================

alter table public.event_merge_candidates enable row level security;
alter table public.event_merge_decisions enable row level security;
alter table public.event_slug_redirects enable row level security;
alter table public.event_claims enable row level security;
alter table public.event_field_overrides enable row level security;

-- Redirects are public-read so slug resolution can 301 anonymously.
drop policy if exists event_slug_redirects_public_read on public.event_slug_redirects;
create policy event_slug_redirects_public_read
on public.event_slug_redirects
for select
using (true);
grant select on public.event_slug_redirects to anon, authenticated;

-- Claims: users create and read their own; review is service/admin only.
drop policy if exists event_claims_self_read on public.event_claims;
create policy event_claims_self_read
on public.event_claims
for select
using (auth.uid() = claimant_user_id);

drop policy if exists event_claims_self_insert on public.event_claims;
create policy event_claims_self_insert
on public.event_claims
for insert
with check (auth.uid() = claimant_user_id and status = 'pending');

grant select, insert on public.event_claims to authenticated;

-- Field overrides: public read of locked fields is harmless (they mirror
-- public event fields) but keep to authenticated to be conservative.
drop policy if exists event_field_overrides_read on public.event_field_overrides;
create policy event_field_overrides_read
on public.event_field_overrides
for select
using (auth.role() = 'authenticated');
grant select on public.event_field_overrides to authenticated;

-- Merge candidates/decisions: no direct client access (admin via service role).

-- ============================================================================
-- Transactional merge helper (privileged; called by admin review flow via
-- service role). Moves source links/offers to the surviving event, records
-- the slug redirect, and archives the loser.
-- ============================================================================

create or replace function public.event_merge_execute(
  p_winner uuid,
  p_loser uuid,
  p_actor uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_loser_slug text;
begin
  if p_winner = p_loser then
    raise exception 'cannot merge an event into itself';
  end if;

  update public.event_external_sources set event_id = p_winner, updated_at = now()
    where event_id = p_loser;
  update public.event_ticket_offers set event_id = p_winner, updated_at = now()
    where event_id = p_loser;
  update public.event_field_overrides set event_id = p_winner, updated_at = now()
    where event_id = p_loser
    and field_path not in (select field_path from public.event_field_overrides where event_id = p_winner);
  delete from public.event_discovery_index where event_id = p_loser;

  select slug into v_loser_slug from public.events where id = p_loser;
  if v_loser_slug is not null then
    insert into public.event_slug_redirects (slug, target_event_id)
    values (v_loser_slug, p_winner)
    on conflict (slug) do update set target_event_id = excluded.target_event_id;
  end if;

  update public.events
    set status = 'draft',
        slug = 'merged-' || p_loser::text,
        is_public = false,
        updated_at = now()
    where id = p_loser;

  update public.event_merge_candidates
    set status = 'merged', reviewed_by = p_actor, reviewed_at = now()
    where status = 'pending'
      and ((left_event_id = p_winner and right_event_id = p_loser)
        or (left_event_id = p_loser and right_event_id = p_winner));
end
$$;

revoke all on function public.event_merge_execute(uuid, uuid, uuid) from public, anon, authenticated;
