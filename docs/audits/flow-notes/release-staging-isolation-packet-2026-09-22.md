# RELEASE-007 isolated staging packet — 2026-09-22

Read-only snapshot at 2026-09-22T16:15:02Z. This is a blocked gate, not a staging certification or permission to deploy. No production mutation, actor provisioning, payment, or migration apply occurred.

| Required field | Observed value | Evidence and limit |
| --- | --- | --- |
| Staging URL | `https://demo.tourify.live` is the intended alias; isolated staging URL is **not established** | Vercel `inspect` resolves it to the current production deployment. |
| Exact deployed SHA | **Unknown** | Public `/api/health` omits `x-tourify-release-sha`; do not substitute local HEAD `623b576b7963d4a2eccb2fbf83f24f2011842a83`. |
| Vercel deployment ID | `dpl_3tW7rRYa6chWxG7U7FDdLi7ZLngK` on both demo and production aliases | Read-only Vercel `inspect`; this is the shared current production deployment, not an isolated staging ID. Public health omits `x-tourify-deployment-id`. |
| Vercel project | `tourify-beta-k2`, `prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n` on both aliases | Vercel `inspect` and `project inspect`; no distinct staging project/alias binding proven. |
| Staging Supabase origin / ref | No isolated origin or ref proven. Demo template and public CSP advertise `https://auqddrodjezjlypkzfpi.supabase.co` / `auqddrodjezjlypkzfpi`. | CSP is a browser connection allowance, not proof of the server's database target. Health omits `x-tourify-supabase-origin`. |
| Production Supabase origin / ref | Production template, local linked ref, and public CSP identify `https://auqddrodjezjlypkzfpi.supabase.co` / `auqddrodjezjlypkzfpi`; hosted runtime target is **not independently verified**. | No protected project/environment readback or health origin header. |
| Stripe mode | **Unknown** on both public aliases | Health omits `x-tourify-stripe-mode`; no staging test-key evidence. |
| Health response | Both `/api/health` requests returned HTTP 200. Neither returned the four `x-tourify-*` release, deployment, Supabase-origin, or Stripe-mode headers. | `x-vercel-id` request IDs differ and do not identify separate deployments. |
| Workflow evidence | Current local staging workflow is manual, checks exact current main SHA and successful matching-SHA push CI/E2E/security, validates topology, and records an evidence artifact. Production workflow is manual with staging/certification artifact checks. | These workflow edits are uncommitted in the dirty master workspace and are not hosted enforcement evidence. Latest listed staging runs are skipped. |
| GitHub governance | `staging` and `production` environments exist with zero environment variables, secrets, or protection rules; `main` branch protection returns 404. | Read-only GitHub API. Repository secrets list contains only `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`; no Vercel environment token found. |

## Exact missing hosted items

1. A distinct Vercel staging project and `demo.tourify.live` alias bound to its own `dpl_` deployment, with its project ID recorded against the production project ID above; verify Vercel Git integration cannot auto-assign production domains outside the protected workflow.
2. A distinct Supabase staging project/origin and project ref. Record independent staging and production project readbacks, environment values, and secret scopes. The current demo and production templates both point at `auqddrodjezjlypkzfpi` and cannot establish isolation.
3. Protected GitHub `staging` variables `VERCEL_STAGING_ORG_ID`, `VERCEL_STAGING_PROJECT_ID`, `VERCEL_PRODUCTION_PROJECT_ID`, `SUPABASE_STAGING_PROJECT_ID`, `SUPABASE_PRODUCTION_PROJECT_ID`, `SUPABASE_STAGING_URL`, `SUPABASE_PRODUCTION_URL`; secret `VERCEL_STAGING_TOKEN` and optional `VERCEL_STAGING_AUTOMATION_BYPASS_SECRET`. Protected `production` equivalents and `VERCEL_PRODUCTION_TOKEN` are needed before promotion. Require environment reviewers and main required checks.
4. Staging runtime Vercel system identity exposed to `/api/health`: exact `VERCEL_GIT_COMMIT_SHA` and generated `VERCEL_DEPLOYMENT_ID`, plus the staging Supabase-origin and Stripe test-mode headers. Confirm a `sk_test_` key through protected configuration without recording its value.
5. A clean, reviewed current-main SHA with successful same-SHA CI, E2E, and security push runs; CP-051 staging migration ledger/postflight and DB-002 anonymous-denial evidence; an approval and migration evidence reference. Current local HEAD and uncommitted changes are not a deployable release candidate.
6. After staging verification, protected `QA_CERT_*` synthetic actor, fixture, webhook, deployment-identity, and Stripe test inputs; successful no-skip exact-SHA certification and retained report. QA-005 actor creation and QA-006 mobile preview evidence follow isolation proof.

## Next operator checklist

1. Provision and independently read back separate Vercel/Supabase projects and protected GitHub environment values. Rebind `demo.tourify.live` only after the isolated target and test payment mode are confirmed. Do not alter `tourify.live` during staging setup.
2. Apply reviewed additive migrations manually to staging one at a time under CP-051; attach DB-008 ledger, DB-002 denial probes, checksums, advisors, and forward-repair evidence.
3. Curate/commit a clean candidate on current `main`, require successful `ci.yml`, `e2e.yml`, and `security-scans.yml` push runs for that full SHA, then dispatch `deploy-demo.yml` from `main` with `release_sha`, `migration_evidence`, and `approval_reference`.
4. Download the retained `staging-deployment-<sha>` artifact. Confirm both deployment URL and demo alias return the exact SHA, same generated staging `dpl_` ID, independent staging Supabase origin, and `test` Stripe mode. Compare to independently read back production project/deployment/origin IDs.
5. Only then provision campaign actors, run protected QA-003 certification and QA-006 preview/device checks, and begin QA-004 live rows. Keep all 718 rows unpassed until actor evidence exists.

Local checks at this snapshot: 11 focused deployment contract tests passed; `npm run check:public-surface` passed; `npm run qa:simulation:coverage` passed with 718 valid rows, 0 shipped, 0 passed, 718 awaiting UI classification. Supabase CLI read-only inspection could not run in this sandbox because it attempted to write telemetry under `~/.supabase`; no Supabase CLI action or database query followed.
