-- REFERENCE ONLY. Do not run without adapting to the real Phase 2 rights snapshot IDs.

create table if not exists music_royalties.royalty_allocation_runs (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references music_royalties.royalty_journals(id),
  rights_snapshot_version text not null,
  allocation_policy_version text not null,
  status text not null check (status in ('draft','review','approved','posted','reversed')),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists music_royalties.royalty_allocations (
  id uuid primary key default gen_random_uuid(),
  allocation_run_id uuid not null references music_royalties.royalty_allocation_runs(id),
  journal_entry_id uuid not null references music_royalties.royalty_journal_entries(id),
  rights_interest_id uuid not null,
  payee_party_id uuid not null,
  currency text not null,
  gross_minor bigint not null,
  deductions_minor bigint not null default 0,
  recouped_minor bigint not null default 0,
  held_minor bigint not null default 0,
  payable_minor bigint not null,
  explanation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists music_royalties.payout_instructions (
  id uuid primary key default gen_random_uuid(),
  payee_party_id uuid not null,
  provider text not null,
  provider_recipient_id text not null,
  currency text not null,
  amount_minor bigint not null check (amount_minor > 0),
  status text not null check (status in ('draft','approved','submitted','paid','failed','reversed','held')),
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  submitted_at timestamptz
);
