# QA-004 campaign actor bootstrap

`provision-campaign-actors.ts` creates only Supabase Auth identities. It does not create app personas, venue or organization membership, platform privileges, events, tours, tickets, or payments. Those journeys must be exercised through the UI and recorded as UI evidence. The second venue manager is a separate foreign-venue actor and starts without venue membership. The platform admin candidate starts without admin privileges; assignment requires the supported, separately verified admin workflow.

Supply these values through a protected staging secret store, not a committed `.env` file:

| Variable | Required value |
| --- | --- |
| `QA_CAMPAIGN_STAGING_URL` | HTTPS app origin for isolated staging |
| `QA_CAMPAIGN_PRODUCTION_URL` | Production app origin for comparison |
| `QA_CAMPAIGN_STAGING_DEPLOYMENT_ID` | Vercel-generated staging `dpl_...` deployment ID |
| `QA_CAMPAIGN_PRODUCTION_DEPLOYMENT_ID` | Vercel-generated production `dpl_...` deployment ID; must differ |
| `QA_CAMPAIGN_SUPABASE_URL` | Staging Supabase project URL |
| `QA_CAMPAIGN_PRODUCTION_SUPABASE_URL` | Production Supabase project URL; must differ |
| `QA_CAMPAIGN_SUPABASE_SERVICE_ROLE_KEY` | Staging-only protected service key |
| `QA_CAMPAIGN_STRIPE_SECRET_KEY` | Protected `sk_test_` key; used only as a mode guard |
| `QA_CAMPAIGN_DEPLOYED_SHA` | Full 40-character SHA also returned by staging `/api/health` in `x-tourify-release-sha` |
| `QA_CAMPAIGN_EMAIL_DOMAIN` | Synthetic `.test` domain, such as `tourify.test` |
| `QA_CAMPAIGN_PASSWORD_SEED` | Protected value of at least 32 characters; keep stable for a campaign rerun |

These `QA_CAMPAIGN_*` inputs are the provisioner's separate operator contract. Application runtime variables in `lib/config/environment-contract.ts` do not supply them automatically. The runner intentionally does not load a local `.env` file.

## Operator gate and packet

1. Attach RELEASE-007 evidence for separate staging and production Vercel projects, generated `dpl_` deployment IDs, exact deployed staging SHA, separate Supabase project origins and secret scopes, and matching HTTPS `/api/health` headers. The production hostnames `tourify.live` and `www.tourify.live` are refused as staging origins. `demo.tourify.live` becomes eligible only after it is rebound to independently verified isolated staging; its current shared production deployment fails the identity gate.
2. Attach DB-008 staged migration-history/schema ledger and DB-002 hosted authorization denial probes for that staging project. Keep the QA-004 campaign blocked until both owners have recorded their hosted evidence. Include DB-010/WORK-006 hosted proof before enabling worker actions, and QA-006 matching-SHA preview build evidence before any mobile journey credit.
3. Load all eleven variables above from the protected staging runner. Confirm the service key belongs only to the independently verified staging Supabase project and Stripe is `sk_test_`. Do not print variable values in logs or store them in the repository.
4. Choose a previously unused campaign ID. Create an owner-only (`0700`) directory outside the repository for the manifest and retained evidence; use a fresh manifest path. Record the directory location in QA-005 without committing its contents.
5. Run the command below only after the preceding evidence exists. A failed preflight must produce no Auth request. If Auth creation fails partway through, retain the same protected seed and manifest and rerun against the same release only after diagnosing the failure; do not reset or delete users.

Run only after deployment, database, and credential isolation have been independently confirmed in RELEASE-007 and the QA-004 campaign header. Staging `/api/health` must return the matching `x-tourify-release-sha`, `x-tourify-deployment-id`, `x-tourify-supabase-origin`, and `x-tourify-stripe-mode: test` headers. The production health endpoint must also return its matching deployment ID and database origin. Missing production headers refuse actor creation. These checks run before any Auth request:

```bash
npm run qa:simulation:provision -- --campaign-id SIM-20260922-OP01 --manifest /absolute/protected/path/SIM-20260922-OP01.json
```

Use a fresh campaign ID and a fresh manifest for each run. The script verifies the exact release SHA before any Auth request, rejects an existing user unless its immutable admin metadata matches the same campaign and actor, and never updates passwords or deletes users. A partial run can be resumed with the same protected seed and manifest. The manifest contains non-secret IDs, target identities, and role intent only; it is written with mode `0600`. Passwords are deterministically derived from the protected seed and campaign/actor keys and are never printed or saved. The manifest is not proof that a UI onboarding journey passed.

Expected manifest: `schemaVersion: 1`, campaign ID, staging URL, deployed SHA, staging deployment ID, staging Supabase origin, `stripeMode: test`, `fixtureScope: auth-only`, and twelve actor entries with actor key, intended role, Auth user ID, creation/resume mode, and privilege status. It contains no email addresses, passwords, password seed, service key, or Stripe key. Confirm file mode `0600` and twelve distinct Auth IDs before marking QA-005 actor bootstrap ready. The platform admin candidate must still show `requires-supported-assignment`.

Retain a separate non-secret operator evidence record alongside the manifest: timestamp, operator, campaign ID, deployed SHA, staging/production deployment IDs and Supabase origins, RELEASE-007 evidence reference, DB-008 ledger reference, DB-002 denial-probe reference, Stripe test-mode header observation, command exit status, created/resumed actor counts, manifest path and mode, and any redacted error. Link that record from QA-005 and QA-004. Do not count Auth bootstrap as a web/mobile simulation pass.

For app login, a protected runner may import `actorEmail` and `actorPassword` from the script and use the same secret seed. Never paste a derived password into a report. Do not run the older West Coast or multi-persona seed commands for this campaign; they can modify existing users.

Focused verification: `npx vitest run __tests__/qa/campaign-actor-provisioner.test.ts`. No hosted database is required for these tests.
