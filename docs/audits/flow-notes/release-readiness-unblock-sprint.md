# Release readiness unblock sprint

## Status on 2026-09-22

This packet moves QA-004 from local repair work into the hosted proof phase. It is deliberately narrow: prove isolated staging, prove hosted database scope, provision only campaign-owned actors, then run one thin pilot chain before the full event and tour matrix.

Current hosted evidence blocks live simulation:

- `https://demo.tourify.live/api/health` and `https://tourify.live/api/health` both return `200` with no `x-tourify-release-sha`, no `x-tourify-deployment-id`, no `x-tourify-supabase-origin`, and no `x-tourify-stripe-mode`.
- Both public health responses advertise `https://auqddrodjezjlypkzfpi.supabase.co` in CSP, so the public demo and production surfaces still do not prove separate Supabase origins.
- This workspace has no `.vercel/project.json`, so Vercel project identity is not locally linked.
- Supabase CLI is linked to project `auqddrodjezjlypkzfpi` named `Tourify Demo`. Treat that target as unsafe for staging mutation until RELEASE-007 proves it differs from production.
- Local Docker is unavailable, so local Supabase runtime probes cannot replace hosted proof.
- Read-only Vercel inventory confirms production project `tourify-beta-k2` / `prj_H9Dgawpmj2dAuwfcuuiy1O7kXS1n`, serving deployment `dpl_3tW7rRYa6chWxG7U7FDdLi7ZLngK` for `demo.tourify.live`, `tourify.live`, and `www.tourify.live`.
- Vercel project `tourifydemo` / `prj_ZhATZhgXelKFgAYGSSbyKHDBdOjZ` exists, but it is not accepted as staging until it owns the demo alias, has isolated environment variables, and reports a distinct Supabase origin plus Stripe test mode. Read-only Vercel environment inventory on 2026-09-22 found production-scoped `SUPABASE_*` and `POSTGRES_*` variables on `tourifydemo`; preview has only public Supabase/site values and cannot run server-side staging flows.
- Isolated Supabase staging now exists: `tourify-staging` / `dlcqfpabbgltgteqtuko`, org `Tourify` / `fmmzhvydziynzucbczja`, region `us-east-2`, status `ACTIVE_HEALTHY`. Production/shared Supabase remains `Tourify Demo` / `auqddrodjezjlypkzfpi`; use this distinction for every topology and denial probe.
- GitHub `main` branch protection is configured as of 2026-09-22 with required checks, review, last-push approval, conversation resolution, linear history, admin enforcement, and force-push/deletion blocks. Vercel pulls from GitHub, so the candidate must still enter `main` through the protected flow and staging/prod deployment must remain workflow-gated.
- The readiness gate now compares non-secret staging and production Vercel/Supabase identifiers and blocks when a staging project ID, Supabase project ref, or Supabase URL matches production. It also supports phase-specific gates so `predeploy` does not require deployment IDs that can only exist after the first staging deploy.
- Non-secret GitHub environment values have been updated for Vercel staging project `prj_ZhATZhgXelKFgAYGSSbyKHDBdOjZ`, Vercel team `team_DHkLPEuhWPBBc0CsKQT9za1c`, staging Supabase ref `dlcqfpabbgltgteqtuko`, and staging Supabase URL `https://dlcqfpabbgltgteqtuko.supabase.co`. `tourifydemo` production-mode env now points at staging Supabase and staging runtime secrets; legacy production `POSTGRES_*` / `SUPABASE_JWT_SECRET` entries were removed. This does not certify staging because automation tokens, Stripe test-mode values, exact-SHA deployment evidence, and QA actors are still missing.

No actor provisioning, database migration apply, payment action, preview-build run, or simulation pass is authorized from this state. The next allowed external mutation is setting protected automation tokens and Stripe test-mode values, then merging the reviewed candidate through protected `main` and running the staging workflows.

## Lane 1: Release isolation packet

Owner: `release` through `RELEASE-007` and `QA-003`.

Required hosted evidence before database or QA mutation:

| Field | Required evidence |
| --- | --- |
| Staging app URL | HTTPS URL for isolated staging, normally `https://demo.tourify.live` after alias cutover. Current alias evidence still points `demo.tourify.live` at production and is not accepted. |
| Production app URL | `https://tourify.live` or current production canonical |
| Git SHA | Full 40-character SHA returned by staging `/api/health` as `x-tourify-release-sha` |
| Staging deployment ID | Vercel-generated `dpl_...` from staging URL and alias health checks |
| Production deployment ID | Vercel-generated `dpl_...`, different from staging |
| Staging Supabase URL | Staging Supabase origin returned by `x-tourify-supabase-origin` |
| Production Supabase URL | Production Supabase origin returned by production health, different from staging |
| Stripe mode | `x-tourify-stripe-mode: test` on staging |
| Evidence artifact | Deployment evidence JSON from `.github/workflows/deploy-demo.yml` or equivalent retained artifact |
| Protected environments | GitHub `staging` and `production` environment secret/protection screenshots or API output |

Release checks to run after deployment:

```bash
npm run check:deployment-topology
npm run check:public-surface
node scripts/ci/verify-deployed-release.mjs --url "$STAGING_URL" --sha "$DEPLOYED_SHA" --deployment-id "$STAGING_DEPLOYMENT_ID"
```

Do not continue to database apply or QA actor provisioning if any required health header is missing or if staging and production share deployment ID or Supabase origin.

## Lane 2: Database hosted proof packet

Owner: `database` through `DB-008`, `DB-002`, and `DB-010`.

Use CP-051: one explicit additive operation at a time. Do not run `supabase db reset`, do not run a blanket `supabase db push`, and do not mutate production from this packet.

Before applying anything, capture read-only history from the verified isolated staging target:

```bash
supabase migration list --project-ref "$STAGING_SUPABASE_PROJECT_REF"
supabase db query --project-ref "$STAGING_SUPABASE_PROJECT_REF" "select version, name, statements from supabase_migrations.schema_migrations order by version"
```

Required staging applies, in this order after RELEASE-007 isolation proof:

1. `supabase/migrations/20260914090000_revoke_public_execute_db002.sql`
2. `supabase/migrations/20260922155356_worker_actions_scope_reconciliation.sql`

Postflight SQL:

```bash
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/db002_security_grants.sql
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/db010_worker_actions_scope_contract.sql
```

Required DB-010 persona probes after the catalog contract:

| Probe | Expected result |
| --- | --- |
| Assigned worker inserts acknowledgement for published packet in audience | Insert succeeds once; replay is idempotent or rejected without duplicate state |
| Same worker inserts check-in and check-out with `check_in_out` permission | Inserts succeed and worker can read only own rows |
| Wrong worker attempts acknowledgement or check-in | RLS denial or zero mutation |
| Foreign organization manager reads or mutates worker action rows | Denied through API and database policy |
| Published packet for unrelated event or tour | Insert denied |
| Packet with unmatched audience or required permission | Insert denied |

Evidence fields to attach to `DB-008`, `DB-002`, `DB-010`, and `WORK-006`:

- staging app URL, deployed SHA, deployment ID
- staging Supabase project ref and origin
- migration history before and after
- exact migration file SHA-256
- DB-002 postflight output
- DB-010 contract output, with zero violation rows and `worker_actions_scope_ready = true`
- denial probe actor IDs, request IDs, API status, and database before/after row counts
- Supabase advisor output for security and performance after apply

Do not enable `FEATURE_WORK_MODE_WORKER_ACTIONS` until this packet is complete.

## Lane 3: QA actor and mobile packet

Owner: `qa` through `QA-005` and `QA-006`.

Run actor provisioning only after Lane 1 and Lane 2 pass on the same deployed SHA.

```bash
npm run qa:simulation:provision -- --campaign-id SIM-YYYYMMDD-01 --manifest /absolute/protected/path/SIM-YYYYMMDD-01.json
```

Required protected inputs:

- `QA_CAMPAIGN_STAGING_URL`
- `QA_CAMPAIGN_PRODUCTION_URL`
- `QA_CAMPAIGN_STAGING_DEPLOYMENT_ID`
- `QA_CAMPAIGN_PRODUCTION_DEPLOYMENT_ID`
- `QA_CAMPAIGN_SUPABASE_URL`
- `QA_CAMPAIGN_PRODUCTION_SUPABASE_URL`
- `QA_CAMPAIGN_SUPABASE_SERVICE_ROLE_KEY`
- `QA_CAMPAIGN_STRIPE_SECRET_KEY` using `sk_test_`
- `QA_CAMPAIGN_DEPLOYED_SHA`
- `QA_CAMPAIGN_EMAIL_DOMAIN` using a synthetic `.test` domain
- `QA_CAMPAIGN_PASSWORD_SEED`

Mobile preview builds must use the same staging URL and SHA. Run:

```bash
npm run simulation:gate --prefix apps/mobile -- --manifest /absolute/path/mobile-manifest.json --results /absolute/path/mobile-results.json --evidence-dir /absolute/path/evidence
```

No mobile row can pass from a web result, API fixture, or unavailable screen.

## Lane 4: Thin pilot chain

Owner: `qa` through `QA-004`.

Run only after the release, database, actor, Stripe-test, and preview-build packets are present.

Pilot order:

1. Artist creates campaign identity, EPK/profile, and discoverable content.
2. Customer discovers artist, follows, messages, and completes one Stripe test purchase.
3. Organizer or venue creates one campaign event and books or links the artist.
4. Manager posts one job tied to the campaign event.
5. Worker applies and completes onboarding.
6. Manager hires worker and assigns one shift.
7. Worker confirms, checks in, checks out, and reloads work history.
8. Manager verifies canonical staff roster, shift status, and attendance history.
9. Customer or door staff verifies ticket/wallet/admission state where supported.
10. Organizer closes or completes the event and verifies retained records.

Every step needs origin actor evidence, receiving actor evidence, route/API trace, deployed SHA, object IDs, before/after state, and a row update in `docs/audits/flow-notes/agent-user-simulation-coverage.csv`.

If a step fails, file a finding packet before continuing. A bypass can help debug, but it cannot count as a passed journey.
