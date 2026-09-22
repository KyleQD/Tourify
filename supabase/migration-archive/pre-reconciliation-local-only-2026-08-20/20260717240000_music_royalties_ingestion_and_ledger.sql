-- Phase 3 P3-01/P3-02/P3-03: royalty ingestion, matching, ledger foundation (additive).
-- Uses public.music_royalties_* prefixes per ADR-P3-001.

begin;

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name text not null,
  description text,
  enabled boolean not null default false,
  rollout_percentage int not null default 0 check (rollout_percentage between 0 and 100),
  target_org_ids uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.feature_flags enable row level security;

create table public.music_royalties_sources (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'revoked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, provider, display_name)
);

create table public.music_royalties_connections (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.music_royalties_sources(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  auth_status text not null default 'authorized' check (auth_status in ('authorized', 'expired', 'revoked', 'pending')),
  external_account_ref text,
  scopes text[] not null default '{}',
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.music_royalties_import_batches (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid references public.music_royalties_sources(id) on delete set null,
  provider text not null,
  source_statement_id text,
  source_sha256 text not null check (length(source_sha256) = 64),
  storage_bucket text not null default 'music-royalty-statements',
  storage_path text not null,
  original_filename text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  status text not null default 'received' check (status in (
    'received', 'quarantined', 'processing', 'review_required', 'accepted', 'rejected', 'posted'
  )),
  parser_version text,
  currency text,
  period_start date,
  period_end date,
  source_total_minor bigint,
  normalized_total_minor bigint,
  dead_letter_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, provider, source_sha256)
);

create index music_royalties_imports_owner_idx
  on public.music_royalties_import_batches (owner_user_id, status, created_at desc);

create table public.music_royalties_raw_rows (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.music_royalties_import_batches(id) on delete cascade,
  row_number integer not null check (row_number >= 0),
  row_hash text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (import_batch_id, row_number),
  unique (import_batch_id, row_hash)
);

create table public.music_royalties_normalization_runs (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.music_royalties_import_batches(id) on delete cascade,
  parser_version text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.music_royalties_normalized_lines (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid not null references public.music_royalties_import_batches(id) on delete cascade,
  normalization_run_id uuid references public.music_royalties_normalization_runs(id) on delete set null,
  source_row_number integer not null,
  source_row_hash text not null,
  provider text not null,
  usage_start date not null,
  usage_end date not null,
  territory text,
  currency text not null,
  gross_royalty_minor bigint not null check (gross_royalty_minor >= 0),
  deductions_minor bigint not null default 0 check (deductions_minor >= 0),
  net_royalty_minor bigint not null check (net_royalty_minor >= 0),
  isrc text,
  iswc text,
  upc text,
  provider_asset_id text,
  usage_type text,
  units text,
  match_status text not null default 'unmatched' check (match_status in (
    'exact', 'candidate', 'ambiguous', 'unmatched', 'conflict', 'manual'
  )),
  matched_artist_music_id uuid references public.artist_music(id) on delete set null,
  matched_sound_recording_id uuid,
  matched_musical_work_id uuid,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index music_royalties_lines_batch_idx
  on public.music_royalties_normalized_lines (import_batch_id, match_status);
create index music_royalties_lines_isrc_idx
  on public.music_royalties_normalized_lines (isrc) where isrc is not null;

create table public.music_royalties_match_candidates (
  id uuid primary key default gen_random_uuid(),
  normalized_line_id uuid not null references public.music_royalties_normalized_lines(id) on delete cascade,
  artist_music_id uuid references public.artist_music(id) on delete cascade,
  sound_recording_id uuid,
  musical_work_id uuid,
  confidence numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  match_signals jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.music_royalties_accounts (
  code text primary key,
  name text not null,
  account_type text not null check (account_type in ('asset', 'liability', 'equity', 'revenue', 'expense', 'suspense')),
  description text,
  created_at timestamptz not null default now()
);

insert into public.music_royalties_accounts (code, name, account_type, description) values
  ('1100', 'Royalty receivable', 'asset', 'Gross royalties reported by sources'),
  ('2100', 'Participant payable', 'liability', 'Amounts payable to rights participants'),
  ('2150', 'Suspense hold', 'liability', 'Unmatched disputed or held amounts'),
  ('2200', 'Recoupment balance', 'liability', 'Outstanding recoupment obligations'),
  ('4100', 'Royalty revenue recognized', 'revenue', 'Accepted net royalty income'),
  ('5100', 'Deductions and fees', 'expense', 'Source deductions and platform fees'),
  ('5200', 'Allocation adjustments', 'expense', 'Reversals and corrections')
on conflict (code) do nothing;

create table public.music_royalties_periods (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'open' check (status in ('open', 'closing', 'closed')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_user_id, period_start, period_end)
);

create table public.music_royalties_journals (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  import_batch_id uuid references public.music_royalties_import_batches(id) on delete set null,
  period_id uuid references public.music_royalties_periods(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'posted', 'reversed')),
  currency text not null,
  posted_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  reversed_by_journal_id uuid references public.music_royalties_journals(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.music_royalties_journal_entries (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.music_royalties_journals(id) on delete cascade,
  account_code text not null references public.music_royalties_accounts(code),
  debit_minor bigint not null default 0 check (debit_minor >= 0),
  credit_minor bigint not null default 0 check (credit_minor >= 0),
  source_line_id uuid references public.music_royalties_normalized_lines(id) on delete set null,
  memo text,
  created_at timestamptz not null default now(),
  check ((debit_minor = 0) <> (credit_minor = 0))
);

create index music_royalties_journal_entries_journal_idx
  on public.music_royalties_journal_entries (journal_id);

create table public.music_royalties_outbox_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  dedupe_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
  attempts integer not null default 0,
  next_retry_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_type, dedupe_key)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'music-royalty-statements',
  'music-royalty-statements',
  false,
  52428800,
  array[
    'text/csv', 'text/plain', 'application/json', 'application/xml', 'text/xml',
    'application/pdf', 'application/zip', 'application/octet-stream'
  ]
)
on conflict (id) do update set public = excluded.public;

alter table public.music_royalties_sources enable row level security;
alter table public.music_royalties_connections enable row level security;
alter table public.music_royalties_import_batches enable row level security;
alter table public.music_royalties_raw_rows enable row level security;
alter table public.music_royalties_normalization_runs enable row level security;
alter table public.music_royalties_normalized_lines enable row level security;
alter table public.music_royalties_match_candidates enable row level security;
alter table public.music_royalties_accounts enable row level security;
alter table public.music_royalties_periods enable row level security;
alter table public.music_royalties_journals enable row level security;
alter table public.music_royalties_journal_entries enable row level security;
alter table public.music_royalties_outbox_events enable row level security;

revoke all on
  public.music_royalties_sources,
  public.music_royalties_connections,
  public.music_royalties_import_batches,
  public.music_royalties_raw_rows,
  public.music_royalties_normalization_runs,
  public.music_royalties_normalized_lines,
  public.music_royalties_match_candidates,
  public.music_royalties_periods,
  public.music_royalties_journals,
  public.music_royalties_journal_entries,
  public.music_royalties_outbox_events
from anon, authenticated;

grant select on public.music_royalties_accounts to authenticated;
grant select, insert, update on
  public.music_royalties_sources,
  public.music_royalties_connections,
  public.music_royalties_import_batches,
  public.music_royalties_periods,
  public.music_royalties_journals
to authenticated;
grant select, insert on
  public.music_royalties_raw_rows,
  public.music_royalties_normalization_runs,
  public.music_royalties_normalized_lines,
  public.music_royalties_match_candidates,
  public.music_royalties_journal_entries
to authenticated;
grant select on public.music_royalties_outbox_events to authenticated;

grant all on
  public.music_royalties_sources,
  public.music_royalties_connections,
  public.music_royalties_import_batches,
  public.music_royalties_raw_rows,
  public.music_royalties_normalization_runs,
  public.music_royalties_normalized_lines,
  public.music_royalties_match_candidates,
  public.music_royalties_accounts,
  public.music_royalties_periods,
  public.music_royalties_journals,
  public.music_royalties_journal_entries,
  public.music_royalties_outbox_events
to service_role;

create policy music_royalties_sources_owner on public.music_royalties_sources
for all to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy music_royalties_connections_owner on public.music_royalties_connections
for all to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy music_royalties_imports_owner on public.music_royalties_import_batches
for all to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy music_royalties_raw_owner_select on public.music_royalties_raw_rows
for select to authenticated using (exists (
  select 1 from public.music_royalties_import_batches b
  where b.id = import_batch_id and b.owner_user_id = (select auth.uid())
));
create policy music_royalties_raw_owner_insert on public.music_royalties_raw_rows
for insert to authenticated with check (exists (
  select 1 from public.music_royalties_import_batches b
  where b.id = import_batch_id and b.owner_user_id = (select auth.uid())
));

create policy music_royalties_norm_runs_owner on public.music_royalties_normalization_runs
for all to authenticated
using (exists (
  select 1 from public.music_royalties_import_batches b
  where b.id = import_batch_id and b.owner_user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.music_royalties_import_batches b
  where b.id = import_batch_id and b.owner_user_id = (select auth.uid())
));

create policy music_royalties_lines_owner on public.music_royalties_normalized_lines
for all to authenticated
using (exists (
  select 1 from public.music_royalties_import_batches b
  where b.id = import_batch_id and b.owner_user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.music_royalties_import_batches b
  where b.id = import_batch_id and b.owner_user_id = (select auth.uid())
));

create policy music_royalties_candidates_owner on public.music_royalties_match_candidates
for all to authenticated
using (exists (
  select 1 from public.music_royalties_normalized_lines l
  join public.music_royalties_import_batches b on b.id = l.import_batch_id
  where l.id = normalized_line_id and b.owner_user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.music_royalties_normalized_lines l
  join public.music_royalties_import_batches b on b.id = l.import_batch_id
  where l.id = normalized_line_id and b.owner_user_id = (select auth.uid())
));

create policy music_royalties_accounts_select on public.music_royalties_accounts
for select to authenticated using (true);

create policy music_royalties_periods_owner on public.music_royalties_periods
for all to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy music_royalties_journals_owner on public.music_royalties_journals
for all to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy music_royalties_entries_owner on public.music_royalties_journal_entries
for all to authenticated
using (exists (
  select 1 from public.music_royalties_journals j
  where j.id = journal_id and j.owner_user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.music_royalties_journals j
  where j.id = journal_id and j.owner_user_id = (select auth.uid())
));

create policy music_royalties_outbox_owner_select on public.music_royalties_outbox_events
for select to authenticated using (
  owner_user_id is null or owner_user_id = (select auth.uid())
);

create policy music_royalties_sources_service on public.music_royalties_sources for all to service_role using (true) with check (true);
create policy music_royalties_connections_service on public.music_royalties_connections for all to service_role using (true) with check (true);
create policy music_royalties_imports_service on public.music_royalties_import_batches for all to service_role using (true) with check (true);
create policy music_royalties_raw_service on public.music_royalties_raw_rows for all to service_role using (true) with check (true);
create policy music_royalties_norm_runs_service on public.music_royalties_normalization_runs for all to service_role using (true) with check (true);
create policy music_royalties_lines_service on public.music_royalties_normalized_lines for all to service_role using (true) with check (true);
create policy music_royalties_candidates_service on public.music_royalties_match_candidates for all to service_role using (true) with check (true);
create policy music_royalties_accounts_service on public.music_royalties_accounts for all to service_role using (true) with check (true);
create policy music_royalties_periods_service on public.music_royalties_periods for all to service_role using (true) with check (true);
create policy music_royalties_journals_service on public.music_royalties_journals for all to service_role using (true) with check (true);
create policy music_royalties_entries_service on public.music_royalties_journal_entries for all to service_role using (true) with check (true);
create policy music_royalties_outbox_service on public.music_royalties_outbox_events for all to service_role using (true) with check (true);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('music_royalties_ingestion_enabled', 'Music royalties ingestion', 'Enable royalty statement import and private storage.', false, 0),
  ('music_royalties_matching_enabled', 'Music royalties matching', 'Enable normalization and match review queues.', false, 0),
  ('music_royalties_ledger_enabled', 'Music royalties ledger', 'Enable balanced journals and posting.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

comment on table public.music_royalties_import_batches is 'Idempotent royalty statement imports; raw files private.';
comment on table public.music_royalties_journals is 'Immutable posted journals; corrections use reversal journals.';

commit;
