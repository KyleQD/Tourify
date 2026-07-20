-- DESIGN TEMPLATE ONLY.
-- Audit existing admin capabilities and ID types before creating the real migration.

begin;

create table if not exists public.music_certification_cases (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  track_id uuid not null references public.artist_music(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  certification_type text not null default 'human_created',
  standard_version text not null,
  status text not null default 'draft',
  requested_level smallint not null default 1,
  submitted_at timestamptz,
  review_started_at timestamptz,
  decided_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (certification_type in ('origin_record', 'human_created', 'rights_passport')),
  check (status in (
    'draft', 'submitted', 'in_review', 'needs_information', 'approved',
    'rejected', 'withdrawn', 'suspended', 'revoked'
  )),
  check (requested_level between 0 and 5)
);

create index if not exists music_certification_cases_owner_status_idx
  on public.music_certification_cases (user_id, status, updated_at desc);

create table if not exists public.music_certification_evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.music_certification_cases(id) on delete cascade,
  track_id uuid not null references public.artist_music(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence_type text not null,
  storage_bucket text,
  storage_path text,
  external_reference text,
  sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'submitted',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (status in ('submitted', 'accepted', 'rejected', 'withdrawn'))
);

create table if not exists public.music_certification_reviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.music_certification_cases(id) on delete cascade,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  decision text not null,
  findings jsonb not null default '{}'::jsonb,
  internal_notes text,
  standard_version text not null,
  created_at timestamptz not null default now(),
  check (decision in ('needs_information', 'approve', 'reject', 'suspend', 'reactivate', 'revoke'))
);

create table if not exists public.music_certification_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.music_certification_cases(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  from_status text,
  to_status text,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.music_certificates (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  case_id uuid not null references public.music_certification_cases(id) on delete restrict,
  track_id uuid not null references public.artist_music(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  certificate_version integer not null,
  standard_version text not null,
  certification_level smallint not null,
  manifest_json jsonb not null,
  manifest_hash text not null,
  status text not null default 'active',
  issued_at timestamptz not null default now(),
  suspended_at timestamptz,
  revoked_at timestamptz,
  superseded_by uuid references public.music_certificates(id),
  created_at timestamptz not null default now(),
  unique (track_id, certificate_version),
  check (certification_level between 0 and 5),
  check (status in ('active', 'suspended', 'revoked', 'superseded'))
);

alter table public.music_certification_cases enable row level security;
alter table public.music_certification_evidence enable row level security;
alter table public.music_certification_reviews enable row level security;
alter table public.music_certification_events enable row level security;
alter table public.music_certificates enable row level security;

create policy "certification cases owner select"
  on public.music_certification_cases for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "certification cases owner insert"
  on public.music_certification_cases for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.artist_music track
      where track.id = track_id and track.user_id = (select auth.uid())
    )
  );

create policy "certification cases owner update draft states"
  on public.music_certification_cases for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and status in ('draft', 'needs_information')
  )
  with check (
    (select auth.uid()) = user_id
    and status in ('draft', 'submitted', 'withdrawn')
  );

create policy "certification evidence owner select"
  on public.music_certification_evidence for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "certification evidence owner insert"
  on public.music_certification_evidence for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.music_certification_cases certification_case
      where certification_case.id = case_id
        and certification_case.user_id = (select auth.uid())
        and certification_case.track_id = track_id
    )
  );

create policy "certification events owner select"
  on public.music_certification_events for select
  to authenticated
  using (
    exists (
      select 1 from public.music_certification_cases certification_case
      where certification_case.id = case_id
        and certification_case.user_id = (select auth.uid())
    )
  );

create policy "certificates owner select"
  on public.music_certificates for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Do not add generic authenticated access to reviews.
-- Codex must use the repository's existing admin/rights-operations capability checks.
-- Public verification should use a narrow server route, not raw table exposure.

commit;
