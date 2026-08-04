# REL-004 — Production env validation

**Status:** Complete  
**Date:** 2026-07-21

## Classes

| Class | Examples | Failure mode |
|-------|----------|--------------|
| Required build and runtime | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` | Included in the single pre-build validation and checked again at production process bootstrap |
| Required server runtime | `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `INTERNAL_API_SECRET`, `CRON_SECRET` | Included in the pre-build gate so a deploy cannot compile an artifact with an incomplete production contract; checked once per runtime process |
| Conditionally required | Marketplace/social and workforce credential encryption secrets | The corresponding credential-bearing workflow remains unavailable until configured; these secrets are never exposed to browser code |
| Optional adapters | Email, maps, flights, AI, Stripe, Redis/KV, OAuth, Sentry | Absence is allowed; partial paired configuration fails clearly instead of producing a degraded half-configured adapter |

## Enforcement

- `lib/config/environment-contract.ts` is the canonical machine-readable classification and validator.
- `npm run validate:env:production` loads production environment files using non-overwriting precedence and reports every issue in one message before `next build` starts.
- Both production build commands invoke the validation gate first. Main CI supplies explicitly labeled, non-secret build fixtures so CI verifies wiring without depending on hosted credentials.
- `instrumentation.ts` validates once per production runtime process. The React root layout performs no environment logging, eliminating render/build warning loops.
- Validation output contains variable names and remediation only. Secret values are never logged.
- HTTPS URL format, the 64-hex-character encryption key, public/service-role key separation, and paired optional integrations are validated deterministically.

## Deployment boundary

The repository does not create, read, or rotate hosted secrets. Operators configure real production values in the deployment secret store. Missing optional providers must render the shared `unavailable` request state; they must never return mock live data.
