# QA-005 actor provisioning and QA-006 preview operator packet — 2026-09-22

Status: **prepared; no hosted provisioning or device run**. This packet records inputs and output shape. It is not isolation, database, payment, or actor evidence. Keep credential values and the generated manifest outside the repository in an owner-only evidence directory.

## Gate decision

- RELEASE-007 read-only inspection maps `demo.tourify.live` and `tourify.live` to the same Vercel production deployment `dpl_3tW7rRYa6chWxG7U7FDdLi7ZLngK` and the same advertised Supabase origin `https://auqddrodjezjlypkzfpi.supabase.co`. A 2026-09-22 read-only GET of both `/api/health` endpoints returned 200 but none of `x-tourify-release-sha`, `x-tourify-deployment-id`, `x-tourify-supabase-origin`, or `x-tourify-stripe-mode`.
- All eleven `QA_CAMPAIGN_*` inputs are absent from the current runner. No isolated staging deployment, hosted DB-008 ledger, DB-002 denial packet, DB-010 postflight/denial packet, Stripe test-mode runtime proof, or protected actor credentials is attached here.
- **Do not run** `qa:simulation:provision`, Auth list/create, app actor login, database apply, payment, or mobile preview evidence gate against the public demo alias. The thin web pilot and all 718 coverage rows remain unrun.

## Protected input packet for the staging runner

The operator must load the following names from a protected staging secret store immediately before provisioning. Record secret-store *references* and scope in the operator evidence; never paste values, derived passwords, or credentials into this file. Application runtime environment values do not automatically populate these names.

| Input | Required proof or constraint |
| --- | --- |
| `QA_CAMPAIGN_STAGING_URL` | HTTPS isolated staging app origin; cannot be `demo.tourify.live` or either production alias |
| `QA_CAMPAIGN_PRODUCTION_URL` | HTTPS production comparison origin |
| `QA_CAMPAIGN_STAGING_DEPLOYMENT_ID` | Staging Vercel-generated `dpl_` ID from RELEASE-007 |
| `QA_CAMPAIGN_PRODUCTION_DEPLOYMENT_ID` | Production Vercel-generated `dpl_` ID; distinct from staging |
| `QA_CAMPAIGN_SUPABASE_URL` | Staging Supabase project origin proven distinct from production |
| `QA_CAMPAIGN_PRODUCTION_SUPABASE_URL` | Production Supabase project origin for comparison |
| `QA_CAMPAIGN_SUPABASE_SERVICE_ROLE_KEY` | **Secret:** staging-only service role key; verify its project scope out of band; never publish or use a production key |
| `QA_CAMPAIGN_STRIPE_SECRET_KEY` | **Secret:** protected `sk_test_` key; mode guard only; staging health must also report `test` |
| `QA_CAMPAIGN_DEPLOYED_SHA` | Full 40-character SHA of the staged pilot repairs, matching staging health and RELEASE-007 evidence |
| `QA_CAMPAIGN_EMAIL_DOMAIN` | Synthetic `.test` domain for campaign-owned addresses |
| `QA_CAMPAIGN_PASSWORD_SEED` | **Secret:** at least 32 characters, stable for any partial-run resume; never log it |

Before any Auth request, attach RELEASE-007 separate project/deployment/secret-scope evidence and matching production/staging health headers, DB-008 staging migration history and schema parity, DB-002 anonymous and wrong-tenant denial results, and Stripe `test` header plus protected key reference. Before the worker-action pilot step, also attach DB-010 manual additive application, catalog postflight, and distinct-persona denial results; enable WORK-006 only after that handoff. Use the same exact deployed SHA in every packet. QA-003 certification is a separate release gate and cannot be inferred from this provisioner.

## Fresh campaign and generated actor manifest

Select an unused `SIM-YYYYMMDD-##` ID at execution time. Create an owner-only (`0700`) directory outside the repository and choose a fresh absolute `.json` manifest path. Once all gate evidence is attached, run:

```bash
npm run qa:simulation:provision -- --campaign-id SIM-YYYYMMDD-## --manifest /absolute/protected/path/SIM-YYYYMMDD-##.json
```

The command creates **Auth identities only**. It writes a `0600` manifest with `schemaVersion: 1`, `campaignId`, `stagingUrl`, `deployedSha`, `stagingDeploymentId`, `supabaseUrl`, `stripeMode: "test"`, `fixtureScope: "auth-only"`, and twelve `actors`. Every actor entry must have a unique `userId`, `key`, `intendedRole`, `mode` (`created` or `verified-existing`), and `privilegeStatus` (`none` or `requires-supported-assignment`). Verify all twelve after a successful run; record created/resumed counts, manifest path/mode, command status, redacted errors, and the RELEASE-007/DB-008/DB-002/DB-010/Stripe evidence references in a separate non-secret operator record. The manifest must contain no email addresses, passwords, seed, service key, Stripe key, or tokens.

| Actor key | Intended role | Initial privilege |
| --- | --- | --- |
| `worker-01` | worker | none |
| `worker-02` | worker | none |
| `artist-owner` | artist owner | none |
| `artist-collaborator` | artist collaborator | none |
| `venue-manager` | venue manager | none |
| `second-venue-manager` | second venue manager, foreign venue | none |
| `organization-manager` | organization manager | none |
| `second-tenant-manager` | second tenant manager, foreign tenant | none |
| `customer-01` | customer | none |
| `customer-02` | customer | none |
| `door-staff` | door staff | none |
| `platform-admin-candidate` | platform admin candidate | requires-supported-assignment |

An existing untagged or differently tagged user is a hard refusal. Never adopt, reset, or delete it. If a partial run occurs, diagnose the error and resume only with the same campaign ID, exact release, protected seed, and manifest. The admin candidate receives no admin rights from Auth provisioning. Establish app profiles, memberships, and any supported privileges through the product UI with separate evidence.

## QA-006 mobile preview packet

After release and actor gates, retain iOS and Android preview build IDs, source SHAs, build evidence, and HTTPS API target matching the staged SHA/origin. Record separate production API and Supabase origins plus deployment IDs; Stripe test mode; release isolation/schema/payment evidence files; and QA-005 opaque actor IDs with provision evidence. For all 16 catalog journeys on **each** platform, record a visible-build scope decision (`shipped`, `disabled`, or unresolved `unavailable`) with evidence and owner approval for disabled scope. Run shipped checks on each device, including receiving-actor proof, and retain observations and findings under the protected evidence directory. Run `npm --prefix apps/mobile run simulation:gate -- --manifest <path> --results <path> --evidence-dir <path>`. No mobile coverage is credited from the seven local gate tests.

## First live web pilot once gates clear

1. Record one staging URL, full SHA, deployment ID, separate Supabase origin, Stripe test mode, DB-008/DB-002 proof, and DB-010 postflight/denial proof; enable WORK-006 only after the DB-010 handoff. Keep QA-003 certification separate.
2. Load the eleven protected `QA_CAMPAIGN_*` inputs, choose a fresh campaign ID, run QA-005 once, and verify the twelve-ID non-secret manifest. Establish app personas and memberships through supported UI flows.
3. Follow [`qa004-thin-pilot.md`](../../engineering/qa004-thin-pilot.md) steps 1–8: artist publishes profile/music/merch; customer follows and buys with Stripe test mode; organizer publishes one event and job; worker applies/onboards; manager hires and schedules; worker confirms, checks in/out; manager completes the event.
4. At each handoff, switch to the receiving actor, reload, capture persisted state and wrong-scope denial where specified. Record object IDs, exact UI route, timestamp, before/after state, screenshots/traces, order reference, and finding ID. A bypass remains bypassed.
5. Run `npm run qa:simulation:coverage`; leave the full gate red until every visibly shipped row has real actor evidence. The thin web pilot does not certify ticket purchase, QR admission, tour completion, or mobile journeys.
