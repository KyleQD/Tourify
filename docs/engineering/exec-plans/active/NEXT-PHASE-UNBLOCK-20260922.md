# Next phase unblock packet - 2026-09-22

## Goal

Move QA-004 from local readiness to live, isolated staging simulation without mutating production or crediting bypassed journeys as passes.

## Current status

- Local release and simulation guardrails exist.
- GitHub CLI is authenticated locally with workflow scope.
- Vercel CLI is authenticated locally, but the installed local CLI is `44.7.0`; workflows install pinned `59.19.1`.
- GitHub environments `staging` and `production` exist. The known production comparison variables/secrets have been populated, but the protected staging project IDs, staging secrets, deployment tokens, and smoke credentials are still missing.
- `origin/main` is `76d8389ebf939cee70f7070abf74a6bacc46f5de`; the local candidate is `623b576b7963d4a2eccb2fbf83f24f2011842a83` on `release/clean-snapshot`, so staging dispatch is blocked until the reviewed candidate is merged or otherwise present on `main`.
- `main` branch protection is now configured with required status checks, review, stale review dismissal, last-push approval, conversation resolution, linear history, admin enforcement, and force-push/deletion blocks. Do not bypass this by pushing the candidate directly to `main`; Vercel pulls from GitHub and can auto-deploy from protected branches.
- Read-only Vercel inventory confirms production is project `tourify-beta-k2` / `prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n` and that `demo.tourify.live`, `tourify.live`, and `www.tourify.live` all point at deployment `dpl_3tW7rRYa6chWxG7U7FDdLi7ZLngK`.
- `tourifydemo` exists as Vercel project `prj_ZhATZhgXelKFgAYGSSbyKHDBdOjZ`, but it is not accepted as isolated staging. Read-only Vercel inventory on 2026-09-22 shows:
  - `demo.tourify.live` is not aliased to `tourifydemo`; it remains aliased to `tourify-beta-k2`.
  - `tourifydemo` has production-scoped `SUPABASE_*` and `POSTGRES_*` variables from older deployments.
  - `tourifydemo` preview only lists public Supabase URL/key and site URL, so it cannot run server-side staging flows.
  - The latest `tourifydemo` production deployment is 160 days old and no custom demo alias points to it.
- Isolated Supabase staging project created on 2026-09-22 with owner approval: `tourify-staging` / `dlcqfpabbgltgteqtuko`, org `Tourify` / `fmmzhvydziynzucbczja`, region `us-east-2`, status `ACTIVE_HEALTHY`. The active production/shared project remains `Tourify Demo` / `auqddrodjezjlypkzfpi`; do not mutate it as staging.
- Recent hosted staging and E2E workflow history is stale and failing/skipped; no successful exact-SHA staging deployment exists for the current candidate.
- Supabase CLI is installed (`2.115.0`; latest notice was `2.117.0`). Read-only CLI operations require an unsandboxed run because the CLI writes telemetry under `~/.supabase`; no hosted database mutation was attempted from this session.
- `npm run check:next-phase-readiness` now supports phase-specific checks (`--phase=predeploy`, `--phase=certification`, `--phase=production`, or default full `campaign`) and compares non-secret GitHub environment values, failing if staging and production Vercel project IDs, Supabase project IDs, or Supabase URLs match.
- Non-secret GitHub environment values now record Vercel staging project `tourifydemo` / `prj_ZhATZhgXelKFgAYGSSbyKHDBdOjZ`, Vercel team `team_DHkLPEuhWPBBc0CsKQT9za1c`, staging Supabase ref `dlcqfpabbgltgteqtuko`, and staging Supabase URL `https://dlcqfpabbgltgteqtuko.supabase.co`. The `tourifydemo` production-mode environment was rewired to the staging Supabase keys and staging runtime secrets, and legacy production `POSTGRES_*` / `SUPABASE_JWT_SECRET` entries were removed. Stripe test-mode values are still missing.

## Required order

1. Keep `main` branch protection in force and disable or constrain Vercel Git auto-deploy so `main` cannot promote production outside the protected workflow.
2. Use isolated staging Supabase project `tourify-staging` / `dlcqfpabbgltgteqtuko` for staging database work; never use `auqddrodjezjlypkzfpi` for staging mutation.
3. Finish protected token setup: set `VERCEL_STAGING_TOKEN` and `SUPABASE_STAGING_ACCESS_TOKEN` in the GitHub `staging` environment.
4. Add real Stripe test-mode values before deployment certification; do not fake `sk_test_` values because commerce journeys must execute.
5. Merge or otherwise place the reviewed release candidate on `main` through the protected flow.
6. Run the staging database lane under CP-051 and attach DB-002, DB-008, and DB-010 evidence.
7. Run isolated staging deployment for the exact SHA.
8. Run exact-SHA launch certification.
9. Provision QA-004 campaign actors with a fresh campaign ID.
10. Run the pilot chain before the full event and tour matrix.

## Readiness command

Run the phase-specific gate before the first staging deployment:

```bash
npm run check:next-phase-readiness -- --phase=predeploy
```

After the staging deployment writes retained evidence and the QA fixture values exist, run the full campaign gate:

```bash
npm run check:next-phase-readiness
```

These commands are read-only. They check local candidate identity, required release files, non-secret staging/production isolation values, and GitHub environment variable and secret names. They do not print secret values, deploy, run migrations, provision users, or mutate hosted data.

## Dispatch commands after the readiness check passes

Replace placeholders with the recorded evidence IDs and exact staging project ref:

```bash
gh workflow run supabase-migrations-staging.yml --ref main -f release_evidence='DB-010+DB-002+DB-008 staging apply packet' -f validated_base_sha='<FULL_MAIN_SHA>' -f target_confirmation='<SUPABASE_STAGING_PROJECT_REF>'
gh workflow run deploy-demo.yml --ref main -f release_sha='<FULL_MAIN_SHA>' -f migration_evidence='<STAGING_MIGRATION_EVIDENCE_ID>' -f approval_reference='<RELEASE_APPROVAL_REFERENCE>'
gh workflow run e2e.yml --ref main -f release_sha='<FULL_MAIN_SHA>'
npm run qa:simulation:provision -- --campaign-id SIM-YYYYMMDD-01 --manifest /absolute/protected/path/SIM-YYYYMMDD-01.json
```

## DB lane evidence required before worker actions

Apply and prove the DB-010 migration only in isolated staging:

- `supabase/migrations/20260922155356_worker_actions_scope_reconciliation.sql`
- `supabase/tests/db010_worker_actions_scope_contract.sql`
- worker-owned allowed insert/read probe
- wrong-worker denial probe
- wrong-tenant manager denial probe
- unrelated event or tour denial probe

Keep `FEATURE_WORK_MODE_WORKER_ACTIONS` disabled until that evidence is attached to DB-010 and WORK-006.

## QA pilot chain

Run one thin live chain first:

artist publishes -> customer follows and buys -> organizer creates event -> manager posts job -> worker applies and onboards -> manager hires and schedules -> worker checks in/out -> manager verifies -> event closes.

Only after this passes or produces bounded P0/P1 findings should QA expand to the full single-event and multi-stop tour campaign.

## Refusal conditions

- No live QA actors without exact SHA, deployment ID, distinct Supabase origin, and Stripe test mode from `/api/health`.
- No production deployment or promotion from this packet.
- No production database write.
- No journey pass if a fixture or API bypass replaced a shipped UI path.
- No feature flag enablement for worker actions before DB-010 hosted RLS proof.
