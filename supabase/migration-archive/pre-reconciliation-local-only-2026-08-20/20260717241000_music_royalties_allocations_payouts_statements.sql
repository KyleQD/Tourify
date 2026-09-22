-- Phase 3 P3-03/P3-04: allocations, statements, payout readiness.

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

create table public.music_royalties_rights_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  passport_version_id uuid,
  passport_public_id uuid,
  snapshot_version text not null,
  snapshot jsonb not null,
  snapshot_sha256 text not null check (length(snapshot_sha256) = 64),
  issued_at timestamptz not null,
  freeze_status text not null default 'active' check (freeze_status in ('active', 'frozen', 'superseded')),
  freeze_reason text,
  created_at timestamptz not null default now(),
  unique (owner_user_id, snapshot_sha256)
);

create table public.music_royalties_allocation_runs (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  journal_id uuid not null references public.music_royalties_journals(id) on delete restrict,
  rights_snapshot_id uuid not null references public.music_royalties_rights_snapshots(id) on delete restrict,
  allocation_policy_version text not null default '1.0.0',
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'posted', 'reversed')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null
);

create table public.music_royalties_allocations (
  id uuid primary key default gen_random_uuid(),
  allocation_run_id uuid not null references public.music_royalties_allocation_runs(id) on delete cascade,
  journal_entry_id uuid references public.music_royalties_journal_entries(id) on delete set null,
  rights_interest_id text not null,
  payee_party_id text not null,
  currency text not null,
  gross_minor bigint not null check (gross_minor >= 0),
  deductions_minor bigint not null default 0 check (deductions_minor >= 0),
  recouped_minor bigint not null default 0 check (recouped_minor >= 0),
  held_minor bigint not null default 0 check (held_minor >= 0),
  payable_minor bigint not null check (payable_minor >= 0),
  explanation jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.music_royalties_recoupment_ledgers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  payee_party_id text not null,
  rights_interest_id text,
  currency text not null,
  opening_minor bigint not null default 0,
  recouped_minor bigint not null default 0,
  remaining_minor bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.music_royalties_holds (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  allocation_id uuid references public.music_royalties_allocations(id) on delete set null,
  hold_type text not null check (hold_type in ('dispute', 'suspense', 'legal', 'sanctions', 'kyc', 'manual')),
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null,
  status text not null default 'open' check (status in ('open', 'released', 'forfeited')),
  reason text,
  created_at timestamptz not null default now(),
  released_at timestamptz
);

create table public.music_royalties_participant_statements (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  payee_party_id text not null,
  payee_user_id uuid references auth.users(id) on delete set null,
  period_id uuid references public.music_royalties_periods(id) on delete set null,
  currency text not null,
  gross_minor bigint not null default 0,
  deductions_minor bigint not null default 0,
  recouped_minor bigint not null default 0,
  held_minor bigint not null default 0,
  payable_minor bigint not null default 0,
  statement_hash text not null,
  storage_bucket text default 'music-royalty-exports',
  storage_path text,
  status text not null default 'draft' check (status in ('draft', 'issued', 'superseded')),
  issued_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.music_royalties_payee_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  party_id text not null,
  linked_user_id uuid references auth.users(id) on delete set null,
  provider text not null default 'stripe_connect',
  provider_account_id text,
  status text not null default 'pending' check (status in ('pending', 'onboarding', 'ready', 'restricted', 'disabled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, party_id, provider)
);

create table public.music_royalties_payout_readiness (
  id uuid primary key default gen_random_uuid(),
  payee_account_id uuid not null unique references public.music_royalties_payee_accounts(id) on delete cascade,
  tax_status text not null default 'unknown' check (tax_status in ('unknown', 'incomplete', 'ready', 'blocked')),
  kyc_status text not null default 'unknown' check (kyc_status in ('unknown', 'pending', 'passed', 'failed')),
  sanctions_status text not null default 'unknown' check (sanctions_status in ('unknown', 'clear', 'hit', 'review')),
  payout_ready boolean not null default false,
  blockers jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.music_royalties_payout_batches (
  id uuid primary key default gen_random_uuid(),
  public_id uuid not null default gen_random_uuid() unique,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  currency text not null,
  status text not null default 'draft' check (status in (
    'draft', 'pending_approval', 'approved', 'submitted', 'partially_paid', 'paid', 'failed', 'cancelled'
  )),
  maker_user_id uuid references auth.users(id) on delete set null,
  checker_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  submitted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.music_royalties_payout_instructions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.music_royalties_payout_batches(id) on delete cascade,
  payee_account_id uuid not null references public.music_royalties_payee_accounts(id) on delete restrict,
  payee_party_id text not null,
  provider text not null default 'stripe_connect',
  provider_recipient_id text not null,
  currency text not null,
  amount_minor bigint not null check (amount_minor > 0),
  status text not null default 'draft' check (status in (
    'draft', 'approved', 'submitted', 'paid', 'failed', 'reversed', 'held'
  )),
  idempotency_key text not null unique,
  provider_transfer_id text,
  failure_reason text,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  submitted_at timestamptz,
  paid_at timestamptz
);

create table public.music_royalties_payout_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payout_instruction_id uuid references public.music_royalties_payout_instructions(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table public.music_royalties_payout_reconciliations (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.music_royalties_payout_batches(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'matched', 'variance', 'closed')),
  expected_minor bigint not null default 0,
  paid_minor bigint not null default 0,
  variance_minor bigint not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'music-royalty-exports',
  'music-royalty-exports',
  false,
  52428800,
  array['application/pdf', 'application/json', 'text/csv', 'application/zip']
)
on conflict (id) do update set public = excluded.public;

-- RLS
alter table public.music_royalties_rights_snapshots enable row level security;
alter table public.music_royalties_allocation_runs enable row level security;
alter table public.music_royalties_allocations enable row level security;
alter table public.music_royalties_recoupment_ledgers enable row level security;
alter table public.music_royalties_holds enable row level security;
alter table public.music_royalties_participant_statements enable row level security;
alter table public.music_royalties_payee_accounts enable row level security;
alter table public.music_royalties_payout_readiness enable row level security;
alter table public.music_royalties_payout_batches enable row level security;
alter table public.music_royalties_payout_instructions enable row level security;
alter table public.music_royalties_payout_provider_events enable row level security;
alter table public.music_royalties_payout_reconciliations enable row level security;

revoke all on
  public.music_royalties_rights_snapshots,
  public.music_royalties_allocation_runs,
  public.music_royalties_allocations,
  public.music_royalties_recoupment_ledgers,
  public.music_royalties_holds,
  public.music_royalties_participant_statements,
  public.music_royalties_payee_accounts,
  public.music_royalties_payout_readiness,
  public.music_royalties_payout_batches,
  public.music_royalties_payout_instructions,
  public.music_royalties_payout_provider_events,
  public.music_royalties_payout_reconciliations
from anon, authenticated;

grant select, insert, update on
  public.music_royalties_rights_snapshots,
  public.music_royalties_allocation_runs,
  public.music_royalties_recoupment_ledgers,
  public.music_royalties_holds,
  public.music_royalties_participant_statements,
  public.music_royalties_payee_accounts,
  public.music_royalties_payout_batches
to authenticated;
grant select, insert on
  public.music_royalties_allocations,
  public.music_royalties_payout_instructions,
  public.music_royalties_payout_reconciliations
to authenticated;
grant select on public.music_royalties_payout_readiness to authenticated;
grant select, update on public.music_royalties_payout_readiness to authenticated;
grant select on public.music_royalties_payout_provider_events to authenticated;

grant all on
  public.music_royalties_rights_snapshots,
  public.music_royalties_allocation_runs,
  public.music_royalties_allocations,
  public.music_royalties_recoupment_ledgers,
  public.music_royalties_holds,
  public.music_royalties_participant_statements,
  public.music_royalties_payee_accounts,
  public.music_royalties_payout_readiness,
  public.music_royalties_payout_batches,
  public.music_royalties_payout_instructions,
  public.music_royalties_payout_provider_events,
  public.music_royalties_payout_reconciliations
to service_role;

create policy music_royalties_snapshots_owner on public.music_royalties_rights_snapshots
for all to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy music_royalties_alloc_runs_owner on public.music_royalties_allocation_runs
for all to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy music_royalties_allocs_owner on public.music_royalties_allocations
for all to authenticated using (exists (
  select 1 from public.music_royalties_allocation_runs r where r.id = allocation_run_id and r.owner_user_id = (select auth.uid())
)) with check (exists (
  select 1 from public.music_royalties_allocation_runs r where r.id = allocation_run_id and r.owner_user_id = (select auth.uid())
));
create policy music_royalties_recoup_owner on public.music_royalties_recoupment_ledgers
for all to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy music_royalties_holds_owner on public.music_royalties_holds
for all to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy music_royalties_statements_owner on public.music_royalties_participant_statements
for select to authenticated using (
  owner_user_id = (select auth.uid()) or payee_user_id = (select auth.uid())
);
create policy music_royalties_statements_owner_write on public.music_royalties_participant_statements
for insert to authenticated with check (owner_user_id = (select auth.uid()));
create policy music_royalties_statements_owner_update on public.music_royalties_participant_statements
for update to authenticated using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));
create policy music_royalties_payee_owner on public.music_royalties_payee_accounts
for all to authenticated using (
  owner_user_id = (select auth.uid()) or linked_user_id = (select auth.uid())
) with check (owner_user_id = (select auth.uid()));
create policy music_royalties_readiness_owner on public.music_royalties_payout_readiness
for all to authenticated using (exists (
  select 1 from public.music_royalties_payee_accounts a
  where a.id = payee_account_id and (a.owner_user_id = (select auth.uid()) or a.linked_user_id = (select auth.uid()))
)) with check (exists (
  select 1 from public.music_royalties_payee_accounts a
  where a.id = payee_account_id and a.owner_user_id = (select auth.uid())
));
create policy music_royalties_payout_batches_owner on public.music_royalties_payout_batches
for all to authenticated using ((select auth.uid()) = owner_user_id) with check ((select auth.uid()) = owner_user_id);
create policy music_royalties_payout_instr_owner on public.music_royalties_payout_instructions
for all to authenticated using (exists (
  select 1 from public.music_royalties_payout_batches b where b.id = batch_id and b.owner_user_id = (select auth.uid())
)) with check (exists (
  select 1 from public.music_royalties_payout_batches b where b.id = batch_id and b.owner_user_id = (select auth.uid())
));
create policy music_royalties_provider_events_service_select on public.music_royalties_payout_provider_events
for select to authenticated using (false);
create policy music_royalties_recon_owner on public.music_royalties_payout_reconciliations
for all to authenticated using (
  batch_id is null or exists (
    select 1 from public.music_royalties_payout_batches b where b.id = batch_id and b.owner_user_id = (select auth.uid())
  )
) with check (
  batch_id is null or exists (
    select 1 from public.music_royalties_payout_batches b where b.id = batch_id and b.owner_user_id = (select auth.uid())
  )
);

create policy music_royalties_snapshots_service on public.music_royalties_rights_snapshots for all to service_role using (true) with check (true);
create policy music_royalties_alloc_runs_service on public.music_royalties_allocation_runs for all to service_role using (true) with check (true);
create policy music_royalties_allocs_service on public.music_royalties_allocations for all to service_role using (true) with check (true);
create policy music_royalties_recoup_service on public.music_royalties_recoupment_ledgers for all to service_role using (true) with check (true);
create policy music_royalties_holds_service on public.music_royalties_holds for all to service_role using (true) with check (true);
create policy music_royalties_statements_service on public.music_royalties_participant_statements for all to service_role using (true) with check (true);
create policy music_royalties_payee_service on public.music_royalties_payee_accounts for all to service_role using (true) with check (true);
create policy music_royalties_readiness_service on public.music_royalties_payout_readiness for all to service_role using (true) with check (true);
create policy music_royalties_payout_batches_service on public.music_royalties_payout_batches for all to service_role using (true) with check (true);
create policy music_royalties_payout_instr_service on public.music_royalties_payout_instructions for all to service_role using (true) with check (true);
create policy music_royalties_provider_events_service on public.music_royalties_payout_provider_events for all to service_role using (true) with check (true);
create policy music_royalties_recon_service on public.music_royalties_payout_reconciliations for all to service_role using (true) with check (true);

insert into public.feature_flags (key, name, description, enabled, rollout_percentage)
values
  ('music_royalties_statements_enabled', 'Music royalty statements', 'Enable participant statement generation.', false, 0),
  ('music_payouts_enabled', 'Music royalty payouts', 'Enable Stripe Connect royalty payout orchestration.', false, 0),
  ('music_royalties_admin_ops_enabled', 'Music royalties admin ops', 'Enable admin royalty operations queues.', false, 0)
on conflict (key) do update set name = excluded.name, description = excluded.description;

comment on table public.music_royalties_rights_snapshots is 'Issued historical rights snapshots for allocation; never draft claims.';
comment on table public.music_royalties_payout_instructions is 'Payout instructions via provider IDs; no raw bank data.';

commit;
