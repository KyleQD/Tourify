# ADM-B01 local-stack tooling artifact

Captured 2026-09-08 while attempting to rerun the full Supabase CLI local-stack fresh apply that the previous `EVD-B01-FRESH-MIGRATION-LOCAL-FAIL.md` record could not rerun (Docker socket unavailable).

## Observations

- `postgres` runs as a non-superuser in the current Supabase CLI platform role model (`is_superuser = off`; `rolsuper = f` on the base image). `create extension if not exists pgcrypto` appears in ~30 migrations that apply fine, and `pgcrypto` is preinstalled in the base image, so the failure is not a repository statement.
- CLI 2.22.6 (the CI pin): freshly-pulled `public.ecr.aws/supabase/realtime:v2.34.47` no longer self-initializes and fails its own internal migration (`relation "migrations" does not exist`) during `supabase start`. Image-tag content has drifted since the 2026-09-07 rehearsal; the CLI also refused to download on 2026-09-07.
- CLI 2.115.0 (brew): applies repo migrations through the platform image's migration-ingest path and hits `permission denied for function pg_read_file (SQLSTATE 42501)` at `create extension if not exists pgcrypto` in `20260415210006_signup_profile_and_email_confirmation.sql`. Everything before it (through `20260415140000_stripe_connect_option_b_parallel.sql`) applies cleanly.

## Classification

Local tooling / image-drift artifact. Not a repository SQL defect and not introduced by the ADM-B01 reconciliations. Reproducing the full CLI local-stack apply in this environment is not currently possible without pinning image digests from the working era.

## Impact

The source-level chain verification is recorded in `EVD-B01-FRESH-MIGRATION-RECONCILED-REHEARSAL.md`. The authoritative fresh-apply and RLS evidence must come from CI (`admin-rls-ci.yml`) and staging, which use clean runners and the cloud role model respectively.