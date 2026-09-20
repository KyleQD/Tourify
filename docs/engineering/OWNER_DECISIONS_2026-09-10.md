# Owner decisions and orchestration direction — 2026-09-10

These decisions record the product-owner answers to `questions.md` and the
follow-up recommendations the owner approved. They are sequencing decisions,
not evidence that external services or production gates are provisioned.

## Database and authorization

- Release evidence requires both staging and production evidence (DB Q1-C).
- Keep the hybrid persona/RLS matrix, with `docs/organization-personas.md` as
  the canonical human-readable source and database evidence as the enforcement
  authority (DB Q2-D).
- Reconcile ticketing additively before cutover; no destructive reset or replay
  (DB Q3-B).
- `events_v2` is the canonical events table; migrate callers additively and
  remove hot-path schema probing after cutover (DB Q5 / Q4-B).
- Staged migrations are approved for gated manual application and postflight
  verification (DB Q6-A). CP-051 remains in force.
- MFA verification-code persistence is explicitly deferred until Database/Auth
  provide an authoritative migration, RLS/privilege model, generated contract,
  and server-only access boundary (Integrations Q-003 / MFA Q5-C).

## Music, marketplace, and workers

- Promote or repair the archived rights, royalty, trust, and certification
  schema additively; do not schedule workers against archive-only DDL (Music Q1).
- Launch Music with catalog and playback first; rights, royalties, certification,
  licensing, and advanced analytics remain gated by schema and evidence (Music Q3-A).
- Feature flags are default-deny, with pilot allowlists/org flags; no auth or
  ownership check may be bypassed by a flag (Music Q4 recommendation).
- Build the worker framework first. Use a hybrid deployment: pg_cron for short
  database maintenance, a durable worker runtime for long-running or
  retry-heavy outbox/processing work, and Vercel cron only as a trigger where
  appropriate. Count/cadence/DLQ targets remain a follow-up reconciliation
  (Music Q2, Release Q4; owner approved recommendation over Q21-C).
- Marketplace schema discrepancies are documented and must be landed through an
  additive, phased reconciliation before enabling dependent features (MKT Q1-C).
- Entitlement enforcement uses account type plus acting-context/resource
  ownership, not account type alone (MKT Q4; owner approved recommendation over
  Q11-A).

## Design, accessibility, and work

- Use a centralized token registry as the target authority, with CSS variables
  as runtime truth and Tailwind as a projection; migrate in stages (Design Q2
  recommendation).
- The core accessibility gate is automated checks plus keyboard/focus coverage
  and governed VoiceOver/TalkBack review now; target WCAG AA for designated core
  flows as the durable standard (Design Q4; owner approved recommendation over
  Q15).
- Preserve intentional responsive-hook differences while migrating remaining
  callers toward the canonical contract; do not bulk-delete compatibility files
  without consumer evidence (Design Q1-C).
- Keep the shared design-system boundary distinct from venue domain behavior;
  venue wrappers may add domain presentation but must not fork shared
  interaction/state contracts (Design Q8-B).
- Hiring surfaces remain separate where their roles differ, with an explicit
  parity/ownership contract rather than a risky bulk consolidation (Work Q2/Q4
  direction).
- Staffing data-model selection remains provisional until Database validates the
  exact canonical tables: use assignment tables for shift placement, keep
  employment records separate, and converge on one onboarding, application, and
  job-posting model with compatibility bridges only where evidenced (Work Q4
  recommendation).

## Release and observability

- Use Sentry for web and mobile, uptime monitors for `/healthz` plus auth/session
  and checkout paths, separate auth/checkout latency and error alerts, a 99.9%
  monthly web/API target, and a documented on-call destination. Actual DSNs,
  provider configuration, and alert routing remain provisioning work (Release
  Q2 recommendation).
- Keep e2e as a required deploy check only after the Vitest baseline is green;
  use scoped typechecks while the repository-wide typecheck remains resource
  constrained (Release Q3 / CP-047).
- Enforce production rate limiting with provisioned Upstash credentials and a
  real 429 smoke; Supabase built-ins remain relied upon for authentication
  primitives (Release Q5-A).
- Keep demo/production split, PITR, restore drill, cron/worker monitoring, and
  production promotion deferred until owner/ops provisioning supplies the
  required evidence.

## Explicit recommendation differences

The owner’s raw selections differed from the approved recommendation on three
points. The recorded direction is the recommended one: entitlement checks use
account type plus acting context/resource ownership (not account type alone);
webhooks use shared signature/idempotency primitives with route-local handlers
before any full framework; and worker deployment is hybrid rather than pg_cron
for every workload. These choices reduce over-broad authorization, preserve
provider-specific webhook behavior, and avoid running long retry-heavy jobs in
database scheduling.
