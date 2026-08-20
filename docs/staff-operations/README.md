# Tourify Admin Staff Operations

This folder is the repo-owned execution point for the Staff Operations suite from:

`/Users/kyledaley/Downloads/tourify_admin_staff_operations_plan_suite`

## Current State

- Current implementation pass: `P0 Discovery and Safety`.
- Current audit: `docs/staff-operations/current-state-audit.md`.
- Current execution ledger: `docs/staff-operations/progress-checklist.json`.
- Read-only integrity SQL: `docs/staff-operations/sql/baseline-integrity-counts.sql`.
- Latest integrity evidence: `docs/staff-operations/integrity-counts-2026-08-12.csv`.
- Source suite version: `1.0`, generated `2026-08-07T00:43:35.798090+00:00`.
- Repo branch observed at kickoff: `codex/eslint-generated-ignores`.

## Operating Rules

- Do not reset Supabase.
- Do not delete active tables or records.
- Do not expose service role or sensitive onboarding data.
- Do not trust URL employer display names or permission claims.
- Add nullable schema first, backfill separately, and add constraints last.
- Keep feature flags and rollback notes current before enabling new behavior.
- Do not mark tasks complete without evidence in the ledger.

## Resume Procedure

1. Read `current-state-audit.md`.
2. Open `progress-checklist.json` and continue the first `not_started` or `blocked` task in sequence.
3. For every task, update status, targets, acceptance criteria, commands, tests, evidence, notes, and blocker reason.
4. Preserve existing `/admin/dashboard/staff`, `/api/hiring/*`, and `/api/admin/staffing/*` behavior until the replacement path has parity and rollback.
5. For future integrity checks, rerun the read-only SQL against a confirmed local/linked Supabase target and save the new output beside the latest evidence CSV.
