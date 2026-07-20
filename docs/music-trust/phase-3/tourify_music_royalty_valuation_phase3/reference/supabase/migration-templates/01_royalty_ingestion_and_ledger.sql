-- REFERENCE ONLY. Create the real migration with `supabase migration new` after audit.
-- Adapt UUID/ID types and capability functions to the repository.

create schema if not exists music_royalties;

create table if not exists music_royalties.royalty_import_batches (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id),
  provider text not null,
  source_statement_id text,
  source_sha256 text not null,
  status text not null check (status in ('received','quarantined','processing','review_required','accepted','rejected','posted')),
  parser_version text,
  currency text,
  period_start date,
  period_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, provider, source_sha256)
);

create table if not exists music_royalties.royalty_journals (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid references music_royalties.royalty_import_batches(id),
  status text not null check (status in ('draft','approved','posted','reversed')),
  currency text not null,
  posted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists music_royalties.royalty_journal_entries (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references music_royalties.royalty_journals(id),
  account_code text not null,
  debit_minor bigint not null default 0 check (debit_minor >= 0),
  credit_minor bigint not null default 0 check (credit_minor >= 0),
  source_line_id uuid,
  created_at timestamptz not null default now(),
  check ((debit_minor = 0) <> (credit_minor = 0))
);

alter table music_royalties.royalty_import_batches enable row level security;
alter table music_royalties.royalty_journals enable row level security;
alter table music_royalties.royalty_journal_entries enable row level security;

-- Add repository-specific SELECT/INSERT/UPDATE policies after auditing ownership and admin capabilities.
