-- Full-chain replays (e.g. supabase db reset) run many idempotent DDL statements.
-- PostgreSQL emits NOTICE for common patterns (DROP/CREATE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS).
-- When the CLI applies the chain in one session, this keeps logs readable without hiding WARNING/ERROR.
set client_min_messages = warning;
