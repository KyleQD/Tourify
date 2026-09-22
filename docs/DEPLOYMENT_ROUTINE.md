# Tourify deployment routine

This is the release sequence for the web, Supabase, and mobile surfaces. It is
an operational gate, not authorization to deploy a particular environment.

## 1. Release candidate

1. Freeze the reviewed commit SHA in the release record.
2. Reconcile task records, handoffs, agent state, generated maps, and
   `npm run agents:validate`.
3. Confirm the candidate contains no unrelated dirty-worktree changes.
4. Run the applicable focused checks, then the release checks:
   `npm run verify:release`, migration validation and checksums, database-type
   drift, admin/security registries, and mobile checks when mobile paths changed.
5. Require both the main CI workflow and the matching E2E workflow to pass for
   the exact candidate SHA.

## 2. Supabase migration gate

Supabase migrations are the schema source of truth. Under CP-051, migrations
are reviewed and applied manually, one at a time. Never use `supabase db reset`,
`supabase db push --include-all`, a forced replay, or a destructive reset.

Before application:

- verify `SUPABASE_PROJECT_ID` against the approved target and exact confirmation;
- require staging evidence and a release-evidence reference;
- run migration-chain, validation, checksum, and dry-run checks;
- review the SQL and its postflight/RLS probes.

The production migration workflow intentionally stops after preview. An
operator applies the single approved migration through the approved Supabase
administrative path, records the migration version, target, timestamp, and
postflight evidence, then resumes application release validation.

## 3. Demo deployment

After successful CI, E2E, and security `push` runs for the same current `main` SHA, dispatch `deploy-demo.yml` manually from `main` with the full SHA, migration evidence, and approval reference. The protected `staging` GitHub environment must hold its own Vercel token and the registered staging/production project IDs and Supabase origins. The two Vercel projects, Supabase project IDs, and Supabase origins must differ.

1. Pull the demo Vercel environment for the frozen SHA.
2. Build with the pinned Node/dependency contract.
3. Deploy the prebuilt artifact to the demo environment.
4. Require the deployment URL and `demo.tourify.live` to return the same Vercel-generated `dpl_` ID and exact SHA, the registered staging Supabase origin, and Stripe test mode on `/api/health`.
5. Run `/healthz`, auth/session, representative admin, ticketing, hiring,
   messaging, marketplace, and music smoke checks.
6. Retain the staging deployment artifact with its SHA, deployment ID, project fingerprints, migration evidence, run ID, and approver. A URL alone is not a deployment ID.

Run the protected `e2e.yml` launch-certification dispatch for that same current `main` SHA after staging is ready. Its staging health preflight requires the recorded deployment ID, separate production identity and Supabase origin, and Stripe test mode before browsers start. Retain the Playwright report and defect disposition.

## 4. Production deployment

Production additionally requires explicit approval, staging and production
database evidence, backup/PITR and restore-drill evidence, Sentry and uptime
monitoring, alert routing and on-call ownership, Redis-backed 429 evidence,
and cron/worker ownership.

Apply approved migrations first, verify postflight behavior, then dispatch `deploy-production.yml` manually from `main`. Supply the full reviewed SHA, successful staging and launch-certification run IDs, staging `dpl_` ID, production migration evidence, and approval reference. The protected `production` GitHub environment must require manual reviewers and hold a production-only Vercel token. The workflow checks successful matching-SHA CI, E2E, security, staging, and launch-certification runs and verifies the retained staging artifact before deploying. Vercel's Git integration must be configured so a push cannot auto-deploy or reassign the production domains outside this workflow; this hosted setting cannot be proven from repository code.

Run authenticated critical-path, health,
checkout, marketplace/music, rate-limit, and cron authorization smokes. Watch
auth and checkout errors/latency, cron failures, and worker/outbox depth during
the release window.

Rollback application code to the prior known-good deployment or commit when
needed. Do not rewrite migration history; database recovery uses an isolated
restore procedure.

## 5. Mobile release

- JS-only changes use the guarded production OTA workflow after mobile unit,
  typecheck, and lint checks.
- Native-impacting changes use the iOS or Android native workflow and its
  separate build/store approval gates.
- Record mobile release metadata independently from the web deployment.

## Current hold points

Production remains blocked while the required local/runtime values and
operational evidence are absent: `NEXT_PUBLIC_SITE_URL`, `ENCRYPTION_KEY`,
`INTERNAL_API_SECRET`, `CRON_SECRET`, an Upstash-compatible Redis target,
Sentry/uptime configuration, PITR/restore evidence, and hosted required-check
verification.
Staging and production also need separate hosted Vercel/Supabase projects and
secrets, protected GitHub environments, disabled Vercel Git auto-deploy for
production, and Vercel system environment variables exposed at runtime so
`/api/health` can report the authoritative SHA and deployment ID.
