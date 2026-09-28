# QA, observability, migrations, performance, and deployment readiness

## Outcome

Create the delivery system and operational controls required to release the Admin tour platform safely. Production readiness means repeatable builds on the supported runtime, verified migrations and RLS, critical-path role-aware tests, measurable performance/reliability/accessibility, staged rollouts, recoverable failures, and owned incidents.

## Current baseline and validation concerns

- At the audited commit, TypeScript passes after Prisma client generation.
- Targeted Admin/logistics/workforce tests pass 92/95; three readiness tests expose an unresolved product contract about venue profile/staffing blockers.
- Lint exits successfully but emits a very large warning backlog and uses a deprecated Next.js lint path.
- Plain `npm ci` fails due to the `@base-ui/react`/`date-fns` peer conflict; installation required `--legacy-peer-deps`.
- Repository specifies Node 20.x; audit environment used Node 24.14 and emitted an engine warning.
- Production build compiles, completes lint/type checking, and generates all 540 static pages, then repeatedly exits 1 on `.next/export` cleanup with `ENOTEMPTY` in the audit filesystem. Missing Supabase and `NEXT_PUBLIC_SITE_URL` also generate repeated warnings and omit dynamic sitemap articles.
- Large pages/request fanout, silent empty states, migration/RLS drift risk, and duplicated legacy/new paths increase release risk.

## Environment and CI standard

Environments: local/test, ephemeral PR, staging, pilot/preview if needed, and production. Each has separate database/auth/storage/provider credentials and cannot share production secrets or user data by default.

CI required checks:

1. deterministic install on the pinned Node/package-manager version;
2. generated-client/schema drift check;
3. format/lint with an explicit warning budget;
4. TypeScript;
5. unit/contract/integration and database/RLS suites;
6. migration lint/dry run on representative snapshot/synthetic scale;
7. production build;
8. critical browser E2E, accessibility, and security smoke;
9. dependency/secret/static security scans;
10. artifact/SBOM/provenance as appropriate for deployment process.

No required check may pass by suppressing a failed command or converting an error into warnings without an approved, expiring exception.

## Test strategy

### Layers

- **Unit:** state machines, calculations, validators, time/currency, readiness/conflicts, projections.
- **Contract:** API inputs/outputs/errors, capability requirements, idempotency, provider adapters/webhooks.
- **Database:** migrations, constraints, functions/triggers, RLS matrix, query plans.
- **Integration:** multi-table transactions/outbox, storage, realtime, jobs, provider sandboxes.
- **Browser E2E:** role-aware critical user journeys with realistic tour data and error/concurrency scenarios.
- **Nonfunctional:** accessibility, performance/load, security, backup/restore, fault injection, offline/reconnect.

### Required personas

Organization creator/master, organization admin, tour manager, production manager, department manager, finance manager, ticketing manager/scanner, viewer, worker, external venue/vendor/collaborator, revoked member, multi-org user, and unauthenticated user.

### Critical E2E paths

- Acting organization switch and cross-org denial.
- Tour create/edit/concurrent conflict/stops/routing/readiness/publish/change/acknowledge.
- Party/hiring/onboarding/scheduling/travel/lodging/equipment/meal/site map/day sheet/live closeout.
- Ticket configure/allocate/sell/comp/transfer/refund/offline scan/reconcile.
- Budget/PO/expense/vendor/contract/invoice/settlement/profitability.
- Share/export/feed token expiry/revocation and protected-field projection.

## Observability standard

### Correlation

Every request/command/job/publication/provider event includes correlation ID, actor/principal, acting org, target type/id, command, result, duration, source version, and retry/idempotency reference. Logs exclude secrets, raw tokens, payment details, protected personal/medical-like fields, and unnecessary document content.

### Signals

- API latency/error/denied/version-conflict by command/domain.
- Database query/lock/policy error, connection saturation, slow query and migration progress.
- Outbox queue age, retries, dead letters, duplicate suppression, provider error/latency.
- Read-model freshness/rebuild/reconciliation variance.
- Domain risks: impossible routes, uncovered work, travel/room/equipment/meal gaps, overdue advances/obligations, publication failures, ticket reconciliation, budget variance, unsettled shows.
- Frontend route errors, degraded states, bundle/load/interaction metrics, offline sync and client version.

Alerts must have severity, threshold/burn rate, owner, runbook, and deduplication. Audit logs are not a substitute for operational telemetry.

## Detailed task plan

### Phase 0 — stabilize toolchain and establish safety harness

| ID | Task | Acceptance criteria |
|---|---|---|
| REL-001 | Pin and enforce runtime/toolchain | Node 20.x exact strategy and package manager/lockfile are enforced locally/CI; supported install succeeds without `--legacy-peer-deps`. |
| REL-002 | Resolve dependency peer conflict | `@base-ui/react`, `date-fns`, and `react-day-picker` versions have a compatible supported set; clean lockfile install is reproducible. |
| REL-003 | Reproduce/fix production build cleanup failure | Build runs in CI/native supported filesystem from clean checkout and exits 0; if environment-specific, root cause/workaround is documented and guarded by a regression check. |
| REL-004 | Make production env validation intentional | Required/optional/build-time/runtime secrets/URLs are documented; missing required production variables fail once with clear message before expensive build, not repeated warnings. |
| REL-005 | Resolve readiness test/product contract | Product decides venue-profile/staff blockers; implementation/UI/tests/fixtures/migration use one rule contract and all targeted tests pass. |
| REL-006 | Create test-data factory | Deterministic two-org, multi-role, multi-stop tour includes every sensitive parent/child domain and realistic volume/edge dates/currencies. |
| REL-007 | Baseline lint and warning budget | Move to supported ESLint CLI/config; snapshot existing warnings by rule/path; new warnings fail CI and prioritized Admin backlog trends to zero. |
| REL-008 | Establish feature-flag policy | Organization-scoped flags have owner, purpose, environments, default, audit, metrics, rollback, expiry/removal issue and safe unavailable state. |

### Phase 1 — security/migration quality gates

| ID | Task | Acceptance criteria |
|---|---|---|
| REL-101 | Add database/RLS CI environment | Migrations apply from empty and supported prior snapshot; direct-role RLS tests run for all personas and parent/child records. |
| REL-102 | Add migration validation template/tooling | Preflight counts, locks/timing, batching, resume, unresolved rows, constraints/indexes, rollback/forward-fix and postflight queries are required. |
| REL-103 | Add API authorization contract harness | Endpoint inventory declares context/capability/schema/idempotency/audit; CI fails for new unclassified Admin routes. |
| REL-104 | Add secret/dependency/static scans | Prevent committed secrets and known critical vulnerabilities; exceptions have owner/rationale/expiry and production exploitability review. |

### Phase 2–5 — continuous feature assurance

| ID | Task | Acceptance criteria |
|---|---|---|
| REL-201 | Add transaction/outbox fault tests | Inject failure before/after commit and during retry; no partial false success, lost message, duplicate side effect or inaccessible recovery state. |
| REL-202 | Add concurrency/idempotency suite | Autosave, reorder, publish, bulk assignment, inventory, scan, finance posting and provider webhooks behave deterministically under duplicate/racing requests. |
| REL-301 | Add time/currency/location test library | DST, time-zone transitions, local-day boundaries, currencies/exponents/FX/rounding and address/location edge cases are reusable across domains. |
| REL-401 | Add offline/realtime suite | Worker itinerary/day sheet/map/check-in/scan reconnect, stale/superseded/revoked content, queue ordering and permission revocation are tested. |
| REL-501 | Add provider contract sandboxes | Ticketing/signature/email/SMS/map/accounting adapters verify signatures, replay/order, rate limit, timeout, retry, outage and reconciliation before enablement. |

### Phase 6 — release hardening

| ID | Task | Acceptance criteria |
|---|---|---|
| REL-601 | Set performance budgets | Representative datasets establish API p50/p95, database query count/time, page LCP/INP/CLS, JS/bundle, memory, export and job queue targets; CI/staging detect regression. |
| REL-602 | Refactor high-fanout pages | Tour/event/logistics pages use BFF/read models, smaller bundles and typed degraded states; request count and load metrics meet budgets. |
| REL-603 | Complete WCAG 2.2 AA review | Automated and manual keyboard/screen-reader/focus/contrast/zoom/error/table/dialog/mobile checks pass critical Admin/worker/external flows. |
| REL-604 | Create production dashboards/alerts | Platform and domain SLOs, alerts, owners and links to runbooks are live before pilot writes begin. |
| REL-605 | Exercise backup/restore | Database/storage/config restoration to isolated environment meets RPO/RTO target and verifies relational/file/publication consistency. |
| REL-606 | Exercise migration rollback/forward-fix | Representative tenant migration and failure are rehearsed; recovery maintains tenant isolation and no lost/duplicate side effects. |
| REL-607 | Perform security review/penetration test | IDOR/RLS, privilege escalation, token/file/export, realtime, webhook, injection, race and sensitive-data findings are resolved to release policy. |
| REL-608 | Run load/soak/fault tests | Portfolio scale, command center, publication fanout, scanning, notifications, exports and provider/database degradation meet SLO/recovery goals. |
| REL-609 | Produce operational runbooks | Auth/context, migration, RLS, publication backlog, provider outage, ticket scan, data mismatch, compromised token, privacy/security incident and rollback have tested steps/owners. |
| REL-610 | Pilot and GA checklist | Design partners, data migration/reconciliation, flags, support/training, monitoring window, rollback threshold, incident staffing, release notes and legacy cutoff are signed off. |
| REL-611 | Delete dead/legacy code | Telemetry and reconciliation prove safe; old planners/routes/policies/dual writes/flags are removed and dependency/security surface is reduced. |

## Migration execution standard

1. Inventory deployed state and take/verify backup as policy requires.
2. Expand schema with nullable columns/new tables/indexes using lock-safe technique.
3. Deploy compatibility reads and dual-read comparison; avoid dual writes unless explicitly designed.
4. Backfill in resumable organization-keyed batches with counts/checkpoints.
5. Quarantine unresolved rows and make them inaccessible; never assign a guessed organization.
6. Validate parent/child/org consistency, totals, constraints, RLS, query plans and app comparison.
7. Add non-null/foreign-key/check constraints safely and enable canonical writes per organization flag.
8. Monitor, reconcile, and prove rollback/forward-fix.
9. Disable old writes, retain compatibility reads for approved period, then retire old data/code/policies.

## Release severity policy

- **Blocker:** cross-tenant access, privilege escalation, lost/corrupt money/ticket/contract/publication data, build/migration failure, irrecoverable partial write, critical path unavailable.
- **High:** wrong audience/recipient, material reconciliation error, repeated duplicate side effect, unavailable rollback, sensitive-data exposure, major accessibility blocker.
- **Medium/low:** noncritical workflow/performance/polish issue with documented workaround and no integrity/security impact.

No blocker/high issue is waived for GA. Pilot exceptions require explicit owner, tenant scope, mitigation, expiry, alert, and rollback.

## Production readiness sign-off

Required approvers: product, engineering, security/data, QA, operations/support, and domain owner for finance/ticketing/contracts as applicable. Sign-off evidence includes:

- CI and critical E2E run IDs on the release artifact;
- migration dry run and production preflight/postflight queries;
- RLS/role matrix results;
- performance/accessibility/security reports;
- reconciliation and backup/restore evidence;
- dashboards/alerts/runbooks and on-call ownership;
- pilot metrics/incidents and resolved follow-ups;
- feature-flag/rollback and legacy-retirement plan.

## Definition of deployment readiness

- Clean install and production build pass on the pinned supported environment.
- All critical suites, RLS matrix, migrations, accessibility, performance, security and recovery gates pass.
- Observability and runbooks cover every failure mode that can produce false success, data loss, cross-tenant access, or missed operational communication.
- Pilot organizations meet SLOs and reconcile with legacy/canonical sources before GA.
- The release has an exercised rollback/forward-fix path and named incident ownership.
