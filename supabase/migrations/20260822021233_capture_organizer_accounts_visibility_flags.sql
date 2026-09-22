set client_min_messages = warning;

-- Baseline capture: organizer_accounts.is_public existed on the live
-- reference databases (referenced by the global search vector index) but
-- was never captured by a tracked migration. Guarded, additive.

alter table public.organizer_accounts
  add column if not exists is_public boolean not null default false;
