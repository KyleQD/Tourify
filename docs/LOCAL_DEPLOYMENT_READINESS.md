# Local deployment readiness

This guide is for local deployment/readiness only. It does not authorize a demo or production promotion.

## Source of truth

- Supabase migrations and the intended Supabase target are authoritative for schema, Auth, Storage, and RLS.
- `docker/local/docker-compose.yml` provides app, Redis, and Postgres process parity. Its Postgres service is not a replacement migration target for Supabase-backed features.
- Do not run legacy bootstrap SQL against an active environment.

## Local environment

Keep secrets in `.env.local` or `.env.development.local`; never commit them. The local validator requires these variable names without printing values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENCRYPTION_KEY`
- `INTERNAL_API_SECRET`
- `CRON_SECRET`

For the Supabase target proof, also set the non-secret target-identification values consumed by `npm run check:supabase-target`: `SUPABASE_PROJECT_ID`, `EXPECTED_SUPABASE_PROJECT_ID`, and `SUPABASE_TARGET_CONFIRMATION`. The confirmation must exactly name the approved project reference.

Local URLs may use loopback HTTP. A local build uses the production contract and therefore needs HTTPS Supabase and site URLs, matching the deployed CSP behavior.

`NEXT_PUBLIC_SENTRY_DSN`/`SENTRY_DSN` are intentionally optional locally. Their absence is reported as an explicit disabled state, never synthesized from a placeholder. Distributed rate limiting is also intentionally disabled unless `RATE_LIMIT_ENFORCE=true` and both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured.

## Readiness commands

Run the static local readiness bundle first. It validates the local environment contract, Vercel cron inventory, and Docker inputs without starting containers or contacting a remote target.

```bash
npm run verify:local
```

Start the local stack only after the static bundle passes:

```bash
docker compose -f docker/local/docker-compose.yml --env-file .env.local up --build
```

Then probe the public health rewrite:

```bash
npm run smoke:healthz
```

The smoke accepts only `localhost`, `127.0.0.1`, or `::1` and checks `/healthz` for `{ "status": "ok" }`. It does not call the privileged readiness path.

For a production-mode build using the local secret file, run:

```bash
npm run build:local
```

This is a build-readiness check only; it neither pulls Vercel configuration nor deploys.

## Cron and observability

`npm run check:cron-route-inventory` compares every `app/api/cron/**/route.ts` against `vercel.json`. It requires each unscheduled route to be explicitly deferred in `scripts/ci/cron-route-inventory.json`. The current deferred route is `event-reminders`, which lacks delivery and replay protection; it must not be scheduled locally or remotely until that contract exists.

All scheduled cron routes must visibly require `CRON_SECRET`. For a local manual invocation, use `Authorization: Bearer <CRON_SECRET>` and target only the desired route after its domain owner has approved its side effects.

Sentry remains local-safe by default: missing DSNs leave it off. When a non-production Sentry project is intentionally configured, use its DSN plus a bounded `SENTRY_TRACES_SAMPLE_RATE`; do not point local work at a production project.

To prove distributed rate limiting with a real local Upstash-compatible endpoint, start the app with `RATE_LIMIT_ENFORCE=true`, configured Upstash REST credentials, and then run:

```bash
RATE_LIMIT_SMOKE=1 npm run smoke:rate-limit
```

The opt-in smoke sends up to 61 GET requests to local `/api/search` under an isolated loopback identity and passes only after a `429`. It is not part of the default bundle because it needs a real rate-limit target.

## Local rollback and recovery

1. Stop the local app and dependency stack; do not delete Docker volumes as an incident response.
2. Record the Git SHA, local environment variable names in use, Supabase project reference, failing route, and timestamp. Do not record secret values.
3. Roll back application code by starting a known-good commit in a separate worktree or image. Do not rewrite Supabase migration history.
4. If a Supabase data problem is suspected, stop local writes and use the database recovery process in `docs/audit-remediation/2026-07-27/RECOVERY_AND_CONTINUITY_PLAN.md`. Restore drills target isolated Supabase projects, never an active project.
5. Re-run `npm run verify:local`, `/healthz`, the relevant cron authorization check, and any affected migration/RLS checks before resuming local writes.

Actual demo or production promotion additionally requires live backups/PITR and restore evidence, configured monitoring and alerts, a real rate-limit 429 proof, scheduled-worker ownership, and the full release gate.
