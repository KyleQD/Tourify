# Execution plan: LOCAL-READINESS-20260909 - local Supabase readiness

- Owner: orchestrator
- Base SHA: 7cf660ad8422dbd3adbdb77369d94638cdc2231b
- Status: active
- Related tasks: ORCH-001, DB-003, DB-004, INTG-002, INTG-004, INTG-005, MUSIC-002, ADMIN-002, ADMIN-003, ORG-003, TICKET-003, TICKET-004, WORK-002, DISC-002, QA-002, RELEASE-003, RELEASE-004, RELEASE-005

## Outcome

Tourify can be run and verified locally against the intended Supabase-backed schema with launch-blocking security, money, auth, cron, webhook, search, staffing, QA, and release-readiness checks evidenced. Demo and production promotion are explicitly out of scope for this plan.

## Scope and constraints

- In: local readiness blockers only; Supabase migrations and generated types as source of truth; control-plane evidence; focused QA and local release gates.
- Out: demo deploy, production deploy, P2 product completion, broad refactors, and legacy bootstrap SQL as a schema authority.
- Deployment routine: `docs/DEPLOYMENT_ROUTINE.md` is the handoff for the later demo/production phases; this plan supplies their local-readiness prerequisites only.
- Constraint (CP-051): All SQL migrations are applied MANUALLY — reviewed and explicit, one at a time (`supabase migration up`, targeted push, or explicit psql). `supabase db reset`, `db push --include-all`, forced/full-chain replays, and any destructive DB reset are forbidden. Live verification (table counts, RLS probes, smoke) runs against manually applied migrations only.
- Preserve: unrelated dirty-worktree changes, active specialist task ownership, existing migration history unless the database task proves reconciliation requires a bounded additive change.

## Dependency order

1. Orchestrator locks this execution plan, records current dirty-worktree caveat, and routes only launch-blocking local tasks.
2. Database completes DB-003 and DB-004 before broad app verification relies on generated database types.
3. Integrations and music complete webhook, cron, Stripe-secret, and unsigned-fallback hardening.
4. Admin, organization, ticketing, work, and discover complete local blocker behavior in disjoint working sets.
5. QA drives QA-002 to zero failures or evidence-backed owner assignments for remaining failures.
6. Release validates local env, health, cron inventory, observability-safe local config, local build readiness, and rollback notes.
7. Orchestrator refreshes generated maps, validates the control plane, reviews agent results, and records any remaining blockers.

## Oversight board — 2026-09-13

The orchestrator uses this board as the single queue view for the active domain records:

- Ready: DESIGN-034; DESIGN-033 after its QA visual-check handoff; ADMIN-003 only after an enabling precondition or owner decision.
- Evidence completion: DB-002, DB-005, DB-006, INTG-006, SOCIAL-004, MUSIC-004.
- Provisioning/owner blocked: INTG-003, DISC-002, RELEASE-003, RELEASE-004, RELEASE-005, ARTIST-003, USER-003, MKT-002.
- Decision hold: ADMIN-001, ARTIST-001, ORCH-001.
- Policy blocked: VENUE-002 remains blocked and is not reopened for cleanup without a newly scoped venue seam.

Every lane must update its task record with an owner, exact dependency, next action, and focused verification before orchestration accepts completion. Cross-domain work is dispatched only through the existing domain owner and a recorded handoff. Database and release lanes remain subject to CP-051 manual, additive, one-at-a-time migration application.

## Verification gates

- Control plane: `npm run agents:validate` before and after integration; `npm run agents:generate` after blocker edits settle.
- Supabase truth: `npm run check:migration-chain`, `npm run check:migration-validation`, `npm run check:migration-checksums`, canonical type drift check, and targeted RLS probes.
- Local quality: focused changed-domain tests, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:unit`, then `npm run verify:release` when local blockers are integrated. E2E must run after Vitest and must be a successful matching-SHA gate before a deployment workflow proceeds.
- Local smoke (status updated 2026-09-10): `/healthz` PASS locally (next.config.ts parity rewrite added; smoke exit 0 against booted app); cron unauthorized rejection PASS (401 observed with fake identity, guard fails closed); 429 rate-limit smoke opt-in only — requires a real local Upstash-compatible backend (not provisioned; owner/ops); auth/login, admin forbidden persona, org invite non-member denial, ticket purchase auth requirement, photos webhook idempotency replay, hiring/staffing persona path: runtime smoke pending (covered at unit level by the green QA suite).
- Local env gate: `npm run verify:local` gate 1 (`validate:env:local`) blocks on 4 unprovisioned local-only vars — `NEXT_PUBLIC_SITE_URL`, `ENCRYPTION_KEY`, `INTERNAL_API_SECRET`, `CRON_SECRET`. Owner/ops provisioning required; `.env.local` is gitignored so dev-local values are safe to add; the validator passes when present (Sentry/rate-limit absence are notes, not failures).
- Production migration workflow: preview remains available, but automatic application is intentionally stopped because CP-051 requires reviewed, explicit, one-at-a-time operator application. Production deployment is therefore gated on recorded migration evidence rather than an unrestricted `supabase db push`.

## Rollback or recovery

If a lane produces conflicting edits, keep its task active and record a pending handoff instead of merging blindly. If migration/type reconciliation fails, stop downstream app verification and return to DB-003/DB-004. If local release verification fails on missing external services, record the exact local-safe disabled setting or required secret rather than promoting demo/prod assumptions. Never recover by resetting or replaying the database; roll back at the migration/application level manually and record the manual-apply steps (CP-051).
