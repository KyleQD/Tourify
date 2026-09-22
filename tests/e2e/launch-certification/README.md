# Launch certification

Run only against an isolated staging deployment with a matching immutable Git SHA:

```sh
QA_CERT_FIXTURE_PATH=tests/e2e/launch-certification/fixture.example.json \
PLAYWRIGHT_BASE_URL=https://demo.tourify.live \
QA_CERT_EXPECTED_SHA=<40-character-staging-sha> \
QA_CERT_SUPABASE_URL=<staging-url> \
QA_CERT_SUPABASE_ANON_KEY=<staging-anon-key> \
QA_CERT_STAGING_DEPLOYMENT_ID=<staging-dpl-id> \
QA_CERT_PRODUCTION_DEPLOYMENT_ID=<different-production-dpl-id> \
QA_CERT_PRODUCTION_URL=https://tourify.live \
QA_CERT_PRODUCTION_SUPABASE_URL=<production-supabase-url> \
QA_CERT_STRIPE_SECRET_KEY=<protected-sk_test-key> \
QA_CERT_MEMBER_EMAIL=<synthetic-member> \
QA_CERT_MEMBER_PASSWORD=<synthetic-member-password> \
QA_CERT_OPERATOR_EMAIL=<synthetic-operator> \
QA_CERT_OPERATOR_PASSWORD=<synthetic-operator-password> \
QA_CERT_FOREIGN_ORG_PROFILE_ID=<organization-the-member-cannot-access> \
QA_CERT_STRIPE_WEBHOOK_SECRET_MARKETPLACE=<staging-marketplace-webhook-secret> \
QA_CERT_MARKETPLACE_LISTING_ID=<synthetic-purchasable-listing> \
QA_CERT_RUN_ID=<unique-run-id> \
npm run test:e2e:launch
```

The committed fixture uses application-backed contracts for cross-organization denial, marketplace webhook replay, and marketplace checkout concurrency. It contains environment-variable names only; synthetic credentials, fixture identifiers, and webhook signing material must live in the protected GitHub `staging` environment.

Before a hosted run, validate the fixture without credentials or browsers:

```sh
npm run test:e2e:launch:contract
```

Manual workflow dispatch checks out the requested 40-character SHA, requires it to be on `main`, and runs only the protected staging certification job. The harness refuses missing variables, localhost by default, non-HTTPS targets, shared app or Supabase origins, shared or invalid deployment IDs, a non-test Stripe key, health metadata mismatches, placeholder fixture content, and any skipped test.

The `/api/health` response emits `x-tourify-release-sha` only when Vercel supplies a valid `VERCEL_GIT_COMMIT_SHA`. It also emits `x-tourify-deployment-id` only for a valid Vercel-generated `VERCEL_DEPLOYMENT_ID`. The public demo and production probes on 2026-09-22 did not return a release SHA, so certification still fails closed until the isolated staging deployment exposes and records both identities.
