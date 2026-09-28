# Work packet: `RELEASE-LOCAL-PARITY`

## Goal

- Goal: Establish repeatable local deployment/readiness checks while treating the selected Supabase target as the source of truth.
- Out of scope: Demo or production promotion, provisioning secrets, external uptime/alert configuration, worker implementation, and changing Supabase schema.
- Owner/status: `release` / `in_progress`

## Context

- Affected subsystem: Local environment validation, Docker/Vercel build readiness, health smoke, cron inventory, observability posture, rate-limit proof path, and local recovery notes.
- Routes/components/services: `/healthz` rewrite, `app/api/health`, `app/api/cron/**`, `lib/config/environment-contract.ts`, `docker/local/**`, `vercel.json`.
- References to read first: `docs/engineering/agents/release/CHARTER.md`, `STATE.md`, `docs/DEVELOPMENT_WORKFLOW.md`, `docs/LOCAL_DEPLOYMENT_READINESS.md`.
- Known constraints: Supabase migrations and the explicitly confirmed target are authoritative; preserve the shared dirty worktree; no real secrets or hosted calls are permitted for this pass.

## Checklist

- [x] Confirm local configuration without exposing values.
- [x] Add static cron/Docker readiness checks and opt-in local smoke paths.
- [x] Add focused environment-contract coverage.
- [x] Record live blockers from the current `.env.local` and unstarted app.
- [ ] Supply local secrets/settings and approved Supabase target identifiers.
- [ ] Start the local stack and run `/healthz` plus the opt-in distributed rate-limit smoke when a compatible target is available.

## Acceptance criteria

- [x] Local validator enforces Supabase, server-secret, and cron requirements without printing values.
- [x] Every cron route is scheduled or explicitly deferred with an owner and next action.
- [x] Docker/Vercel parity inputs are checked statically and documented.
- [x] Local rollback/recovery procedure is documented.
- [ ] Current local configuration and runtime health evidence pass.

## Verification

- Tier: `feature` (release-owned configuration and deployment inputs; no remote promotion)
- Commands: `npm run agents:validate`; focused Vitest env tests; `npm run check:cron-route-inventory`; `npm run check:local-docker`; `npm run validate:env:local`; `npm run check:supabase-target`; `npm run check:migration-chain`; `npm run build:local`; `npm run smoke:healthz`.
- Evidence: Static checks and focused tests passed on 2026-09-09. Local env/build stopped before secret values were read; target confirmation and a running local app are absent.

## Handoff

- Changed areas: Local validation and smoke scripts, cron inventory, package scripts, local readiness guide, release task/state records.
- Failures and pre-existing failures: Missing local `NEXT_PUBLIC_SITE_URL`, `ENCRYPTION_KEY`, `INTERNAL_API_SECRET`, and `CRON_SECRET`; missing Supabase target confirmation variables; no app listening on local port 3000.
- Blockers: Secret/configuration provisioning and an explicitly approved Supabase project ref.
- Next action: Configure the documented local variables, run `npm run verify:local`, start the stack, then run `npm run smoke:healthz` and the opt-in rate-limit smoke.
