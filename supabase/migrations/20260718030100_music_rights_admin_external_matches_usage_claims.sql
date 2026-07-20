-- Phase 7 S3–S6: external records, matches, usage, claims.

begin;

create table if not exists public.music_rights_external_records (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.music_rights_admin_cases(id) on delete set null,
  provider_code text not null,
  external_id text,
  record_type text not null,
  subject_id uuid,
  payload_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  effective_at timestamptz,
  supersedes_id uuid references public.music_rights_external_records(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.music_rights_match_candidates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.music_rights_admin_cases(id) on delete cascade,
  artist_music_id uuid references public.artist_music(id) on delete set null,
  identifier_score numeric not null default 0,
  metadata_score numeric not null default 0,
  audio_score numeric not null default 0,
  version_penalty numeric not null default 0,
  decision text not null default 'manual_review' check (decision in (
    'auto_candidate', 'manual_review', 'no_match', 'rejected'
  )),
  human_reviewed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.music_rights_usage_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.music_rights_admin_cases(id) on delete set null,
  source_code text not null,
  source_event_id text,
  raw_object_path text,
  normalized jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in (
    'received', 'normalized', 'matched', 'manual_review', 'rejected', 'claimed'
  )),
  created_at timestamptz not null default now(),
  unique (source_code, source_event_id)
);

create table if not exists public.music_rights_claims (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.music_rights_admin_cases(id) on delete cascade,
  claim_type text not null check (claim_type in (
    'royalty', 'mechanical', 'neighboring', 'platform_monetization', 'ugc', 'other'
  )),
  amount_minor bigint,
  currency text default 'USD',
  status text not null default 'draft' check (status in (
    'draft', 'review', 'approved', 'submitted', 'countered', 'accepted',
    'partially_accepted', 'rejected', 'appealed', 'paid', 'closed', 'withdrawn'
  )),
  authority_snapshot jsonb not null default '{}'::jsonb,
  human_reviewed boolean not null default false,
  phase3_handoff_id text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.music_rights_platform_policies (
  id uuid primary key default gen_random_uuid(),
  artist_music_id uuid not null references public.artist_music(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  platform_code text not null,
  policy jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in (
    'draft', 'pending_review', 'active', 'suspended', 'revoked'
  )),
  ai_training_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.music_rights_external_records enable row level security;
alter table public.music_rights_match_candidates enable row level security;
alter table public.music_rights_usage_events enable row level security;
alter table public.music_rights_claims enable row level security;
alter table public.music_rights_platform_policies enable row level security;

revoke all on
  public.music_rights_external_records,
  public.music_rights_match_candidates,
  public.music_rights_usage_events,
  public.music_rights_claims,
  public.music_rights_platform_policies
from anon, authenticated;

grant select on public.music_rights_external_records to authenticated;
grant select, insert, update on public.music_rights_match_candidates to authenticated;
grant select, insert on public.music_rights_usage_events to authenticated;
grant select, insert, update on public.music_rights_claims to authenticated;
grant select, insert, update on public.music_rights_platform_policies to authenticated;

grant all on
  public.music_rights_external_records,
  public.music_rights_match_candidates,
  public.music_rights_usage_events,
  public.music_rights_claims,
  public.music_rights_platform_policies
to service_role;

drop policy if exists mra_external_access on public.music_rights_external_records;
create policy mra_external_access on public.music_rights_external_records
for select to authenticated using (
  case_id is null
  or exists (
    select 1 from public.music_rights_admin_cases c
    where c.id = case_id and c.owner_user_id = (select auth.uid())
  )
);

drop policy if exists mra_matches_access on public.music_rights_match_candidates;
create policy mra_matches_access on public.music_rights_match_candidates
for all to authenticated using (
  exists (
    select 1 from public.music_rights_admin_cases c
    where c.id = case_id and c.owner_user_id = (select auth.uid())
  )
  or exists (
    select 1 from public.artist_music am
    where am.id = artist_music_id and am.user_id = (select auth.uid())
  )
) with check (true);

drop policy if exists mra_usage_access on public.music_rights_usage_events;
create policy mra_usage_access on public.music_rights_usage_events
for all to authenticated using (
  case_id is null
  or exists (
    select 1 from public.music_rights_admin_cases c
    where c.id = case_id and c.owner_user_id = (select auth.uid())
  )
) with check (true);

drop policy if exists mra_claims_access on public.music_rights_claims;
create policy mra_claims_access on public.music_rights_claims
for all to authenticated using (exists (
  select 1 from public.music_rights_admin_cases c
  where c.id = case_id and c.owner_user_id = (select auth.uid())
)) with check (true);

drop policy if exists mra_platform_policies_access on public.music_rights_platform_policies;
create policy mra_platform_policies_access on public.music_rights_platform_policies
for all to authenticated using (
  owner_user_id = (select auth.uid())
  or exists (
    select 1 from public.artist_music am
    where am.id = artist_music_id and am.user_id = (select auth.uid())
  )
) with check (owner_user_id = (select auth.uid()));

drop policy if exists mra_external_service on public.music_rights_external_records;
create policy mra_external_service on public.music_rights_external_records for all to service_role using (true) with check (true);
drop policy if exists mra_matches_service on public.music_rights_match_candidates;
create policy mra_matches_service on public.music_rights_match_candidates for all to service_role using (true) with check (true);
drop policy if exists mra_usage_service on public.music_rights_usage_events;
create policy mra_usage_service on public.music_rights_usage_events for all to service_role using (true) with check (true);
drop policy if exists mra_claims_service on public.music_rights_claims;
create policy mra_claims_service on public.music_rights_claims for all to service_role using (true) with check (true);
drop policy if exists mra_platform_policies_service on public.music_rights_platform_policies;
create policy mra_platform_policies_service on public.music_rights_platform_policies for all to service_role using (true) with check (true);

comment on table public.music_rights_external_records is 'Official-source mirrors; supersedes_id for versioning; never silent overwrite.';
comment on table public.music_rights_match_candidates is 'Technical matches require human review before outbound claim/takedown.';

commit;
