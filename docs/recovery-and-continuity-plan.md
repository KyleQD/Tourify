# Tourify recovery and continuity plan

**Status:** DOCUMENTATION COMPLETE — hosted backup/PITR evidence and restore drill execution are **BLOCKED** (see section 8).
**Owner domain:** release (RELEASE-004, P0)
**Last updated:** 2026-09-21

This is the durable recovery and continuity plan that RELEASE-004 acceptance criteria 1, 3, and 4 document locally. Criteria 1, 3, and 4 are complete here; criterion 2 (production backup/PITR settings evidenced AND an isolated restore drill completed) remains open and is documented as a tracked hosted blocker with an operator-executable runbook.

The prior provisional record at `docs/audit-remediation/2026-07-27/RECOVERY_AND_CONTINUITY_PLAN.md` remains valid legacy evidence and is preserved and linked (per CP-004), not replaced. This plan supersedes its operational direction where it conflicts with the promoted P0 topology below.

## Non-destructive invariants (apply to every procedure in this plan)

1. **Never** run `supabase db reset`, `supabase db push --include-all`, a forced/full-chain replay, or any command that drops or recreates a database (CP-051).
2. **Never** rewrite or edit applied migration history. Applied migration bytes are immutable; collisions are resolved by an explicit reviewed replacement in a newer migration or an audited quarantine, never by editing applied files (`scripts/ci/check-active-migration-chain.mjs`).
3. **Never** treat archive-only DDL or an archive-only surface as runtime proof (CP-053). Runtime proof requires the capability to be enabled in the canonical launch manifest and verified behavior, not the existence of dormant schema.
4. Every recovery and drill targets a **separately provisioned isolated project**, never the active production project. Nothing is deleted as part of recovery; retirement is a separate program.

## 1. Required four-project isolated topology (criterion 1)

RELEASE-007 defines the required isolated staging/production topology. Recovery and continuity operate on **four isolated projects**, never a shared one:

| Role | Vercel project | Supabase project | Primary domain |
| --- | --- | --- | --- |
| Staging | `VERCEL_STAGING_PROJECT_ID` | `SUPABASE_STAGING_PROJECT_ID` | `demo.tourify.live` |
| Production | `VERCEL_PRODUCTION_PROJECT_ID` | `SUPABASE_PRODUCTION_PROJECT_ID` | `tourify.live` / `www` |

Staging application code, staging secrets, and staging database are isolated from production application code, secrets, and database. A staging Vercel environment must never resolve production Supabase credentials, and production must never point at the staging database.

**Topology evidence linkage:**

- RELEASE-007 task record: `docs/engineering/tasks/active/RELEASE-007.json` — acceptance criteria require the four-project split, isolated credentials/deployment IDs/release SHA, protected promotion, and per-deployment evidence.
- RELEASE-007 deployed workflow evidence: `.github/workflows/deploy-demo.yml` (exact-SHA controlled staging dispatch with topology validation, prebuilt deploy, and a deployment-evidence artifact) and `.github/workflows/deploy-production.yml` (production deploy gated on CI/E2E).
- **HOSTED TOPOLOGY EVIDENCE — BLOCKED.** As of this write-up RELEASE-007 records: no authorized Vercel, Supabase, DNS, or GitHub environment credentials are available in the workspace; hosted project isolation is unverified; the current live production/demo domains still share the existing deployment. The four isolated projects are **not yet provisioned**. This is tracked as the RELEASE-007 hosted blocker and is the precondition that gates drill execution below.

Every recovery assumption in this plan names the target project by role only; project references are not recorded here to avoid fabrication. When RELEASE-007 provisions the hosted projects, this plan's evidence table (sections 5 and 6) is filled from real Supabase dashboard output only.

## 2. Application rollback (criterion 3)

The primary web/API recovery path is **application rollback**, never a database reset.

### 2.1 Vercel exact-SHA redeploy

1. Confirm the last-known-good release SHA from the deployment evidence artifact produced by `scripts/ci/write-deployment-evidence.mjs` (deployment ID, release SHA, environment, migration evidence, approver) or, at runtime, the `x-tourify-release-sha` header that `/api/health` emits only when Vercel supplies a valid `VERCEL_GIT_COMMIT_SHA` (RELEASE-008 release-identity contract — no invented fallback values).
2. Redeploy the **exact** known-good SHA as a prebuilt artifact: `vercel deploy --prebuilt --prod` from a checkout of that SHA against the **same project** (`VERCEL_PRODUCTION_PROJECT_ID` for production, `VERCEL_STAGING_PROJECT_ID` for staging). Never use a different SHA or a partially patched live flow.
3. Verify with the smoke and critical-path suites for the environment: `/healthz`, readyz, auth/session, and the affected surface (checkout, ticketing, music, etc.). Confirm the release identity header present matches the rolled-back SHA.
4. Record the rollback in the incident record: prior SHA, target SHA, deployment ID, timestamp, verification results.

Vercel's operator-side `vercel rollback` is an emergency convenience; the canonical, repeatable rollback is the exact-SHA prebuilt redeploy above because it is recorded, gated, and reproducible.

### 2.2 Environment variable management

- Secret **values** live only in the approved secret/Vercel environment; env var **names** are documented in `docs/LOCAL_DEPLOYMENT_READINESS.md` (e.g. `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `INTERNAL_API_SECRET`, `CRON_SECRET`) and the release inventory. No values are ever committed to Git.
- A bad-configuration rollback means: correct the environment variable **name/assignment in the target Vercel environment**, then redeploy the exact-SHA artifact. Configured variable names follow the environment splits in section 1 (staging vs production projects) so a misconfigured variable cannot reach the wrong environment's secrets.
- Changing an env assignment is a configuration change: verify the environment already enforces the required contract (`npm run validate:env:production`, `npm run validate:env:local`) before redeploying.

### 2.3 Never destructive reset

Application rollback never involves `supabase db reset`, backup re-import over production, or deleting Docker volumes as incident response (see `docs/LOCAL_DEPLOYMENT_READINESS.md` local rollback notes). If a data problem is suspected, database recovery follows section 3 (forward-only repair) or the isolated restore procedure (section 6) — never a reset.

## 3. Forward-only database repair (criteria 3 and 4)

Database "repair" is **forward-only**: correctness is achieved by applying new additive migrations, never by rewriting history.

1. Apply reviewed migrations **manually and explicitly**, one (or a reviewed batch) at a time, via `supabase migration up`, targeted `db push`, or explicit psql, against the approved target for the environment (CP-051). The production migration workflow intentionally stops after preview; an operator applies the single approved migration and records version, target, timestamp, and postflight evidence (`docs/DEPLOYMENT_ROUTINE.md` §2).
2. **Never rewrite migration history.** Once applied, a migration's bytes are immutable. Migration-chain integrity is verified by:
   - `npm run check:migration-chain` (active-chain duplicate-policy scan; prints the scanned file count at run time — do not trust stale hardcoded counts),
   - `npm run check:migration-validation` and the checksum/target gates against `MIGRATION_CHECKSUM_BASE_SHA`, `SUPABASE_PROJECT_ID`, and `SUPABASE_TARGET_CONFIRMATION`,
   - the authoritative baseline/history evidence in `docs/engineering/migration-validation/` (`history-baseline.json`, `hosted-history-ledger.json`).
3. **Never use archive-only DDL as runtime proof** (CP-053). A dormant table/function/RPC in an archive migration does not prove a runtime surface; runtime proof requires the canonical launch capability to be enabled and verified behavior.
4. Rollback of a schema change is an **application rollback to the prior SHA** (section 2), not a down-migration or a destructive revert. If data must be corrected, write a **new, additive repair migration** that makes forward progress; if that would be destructive, recovery goes through the isolated restore procedure (section 6) after approval.

This discipline matches the transition-plan migration rule and CP-053's owner-approved sequencing; no recovery procedure in this plan depends on destructive reset or migration-history rewriting (criterion 4).

## 4. Incident ownership, recovery objectives, and escalation (criterion 3)

### 4.1 Incident ownership

| Role | Ownership in an incident |
| --- | --- |
| Accountable owner | Overall accountability for recovery decisions and cost approvals (e.g. PITR). Recorded as Kyle Daley in the legacy provisional plan. |
| Incident commander / acknowledged on-call holder | Runs the runbook, drives triage, owns the incident record and escalation timer. Provisioning of the on-call ack/ routing destination is a hosted blocker (RELEASE-003). |
| Deployment owner | Operates Vercel exact-SHA redeploy, migration application, and env variable changes. |
| Database recovery operator | Executes forward-only repair (section 3) or the isolated restore drill (section 6); never resets production. |
| Integration/money-path owner | Webhook signature, idempotency, and order-ledger integrity checks during checkout/payment incidents. |

### 4.2 Recovery objectives aligned to the 99.9% web/API SLO

The public web/API surface is governed by a **99.9% monthly SLO** published under RELEASE-003 in `docs/observability-slo-and-runbooks.md`. Error budget ≈ **43 minutes of downtime per 30-day month**. Recovery objectives are set so the *primary* recovery path resolves within a fraction of that budget.

| Objective | Target | Status |
| --- | --- | --- |
| Database RPO | ≤ 24 h with verified daily backups; ≤ 15 min once PITR is approved and enabled | **BLOCKED** — no approved PITR/dashboard evidence |
| Application RTO (web/API) | Rollback path completes and escalates to the deployment owner within **15 minutes** of confirmed alert; verification within the same incident window | Documented; not yet executed against hosted prod |
| Database RTO (catastrophic path) | Restore and validate an isolated replacement; provisional ≤ 4 h from the legacy plan, and the **achieved time must be measured by the drill** | **BLOCKED** — drill not run |
| Storage-object RPO | ≤ 24 h after an independent object-copy process exists | Not implemented — **BLOCKED** |
| Configuration RTO | Reconstruct Auth, Storage, Realtime, functions, secrets, and deployment configuration within 4 h | Not tested — **BLOCKED** |

**Alignment note (open item — no number fabricated here):** the 43-minute monthly budget is consistent with a rollback-first web/API RTO (minutes) but is of a different class from a multi-hour catastrophic database restore (rare, explicit-approval path). Whether catastrophic-restore downtime is counted against the availability SLO is an owner decision, recorded as open item OR-RECOVERY-01 in section 8, not settled locally.

### 4.3 Escalation paths

Escalation follows `docs/observability-slo-and-runbooks.md` runbooks exactly:

1. Alerts funnel to the acknowledged on-call holder; in the absence of a provisioned routing destination they are recorded as pending owner assignment and **escalate to the deployment owner after 15 minutes**.
2. Elevated error rate / error budget exhaustion: announce incident, **freeze non-essential deploys**, triage to the acknowledged on-call owner, escalate to the deployment owner if unresolved in 15 minutes.
3. Checkout failure is treated as P1; rollback to the previous release rather than partially patching a live checkout flow under load.
4. Persisted webhook delivery failure routes to the integration owner; events are not dropped.

## 5. Production backup/PITR evidence checklist (criterion 2 — **BLOCKED**)

Actual backup/PITR settings require Supabase dashboard access to the approved production project, which is not available in this workspace. The checklist below is what an operator records once RELEASE-007 provisions the production project; nothing is fabricated here.

From Supabase Dashboard → Database → Backups, record:

- [ ] Backup mode: **daily backups** or **PITR** (required to be PITR for the ≤ 15 min RPO target; enabling PITR requires the account owner's explicit approval of displayed cost/retention — decision status per the legacy plan: `PENDING_DASHBOARD_EVIDENCE_AND_COST_APPROVAL`).
- [ ] Most recent successful backup time / latest recovery point.
- [ ] Earliest available restore point.
- [ ] PITR retention window if enabled.
- [ ] Any warning, failed backup, or restore limitation.
- [ ] Confirmation date, dashboard operator, and approving owner.
- [ ] Storage-object backup scope note: Supabase backups cover the database and Storage **metadata**, not the underlying Storage objects; the object inventory/copy process is a separate tracked item.

Do **not** click Restore while collecting evidence. Evidence is recorded in section 8's open-item ledger with the checklist output, not as free-text claims.

## 6. Isolated restore drill runbook (criterion 2 — procedure documented; execution **BLOCKED**)

This runbook is operator-executable only **after** an approved isolated Supabase recovery target is provisioned (RELEASE-007 hosted blocker). It never depends on destructive reset or migration-history rewriting, and it never touches the active production project.

### Preconditions

- [ ] Approved isolated recovery target exists (distinct project reference recorded by operator).
- [ ] Accountable owner approved the drill (non-production; no public traffic).
- [ ] Backup window / PITR statement recorded from section 5 for the **source** project.
- [ ] Operator has operator credentials scoped to the isolated target (never production).

### Steps

1. Record drill start time, source project role, recovery point selected, and operator.
2. Provision a new isolated Supabase project (or approved supported recovery target).
3. Restore the selected backup / recovery point **into that isolated target** using the supported Supabase workflow. Do not connect public production traffic.
4. Reapply required non-database configuration from the configuration registry (Auth redirects/providers/templates, Storage buckets/policies, Realtime publications, extensions, functions, Cron) with non-production test secrets only.
5. Reconcile Storage objects separately against the object inventory (metadata restore alone does not restore objects).
6. Run validation against the isolated target: `npm run check:migration-chain`, `check:migration-validation`, migration-history comparison with `docs/engineering/migration-validation/hosted-history-ledger.json`, schema/grant probes, RLS persona probes, row-count bands, data-integrity checks for the critical surfaces (auth, finance, hiring, feed, admin), and the critical-path smoke suites.
7. Generate and compare database types; confirm no unexplained drift from the source.
8. Run the application stack pointed at the isolated target using a **staging Vercel environment** (section 1) so nothing production-bound reads it.
9. Canary with internal test accounts only.
10. Record achieved RPO/RTO and every manual dependency; retain the isolated target's evidence.

### Drill rollback / stop conditions

- If any step fails or a stop condition below is hit: **abandon the isolated target**, keep production untouched, delete nothing, and record the stop condition and timestamp.
- Stop conditions: ambiguous target/backup/recovery timestamp; Storage objects and database metadata irreconcilable; migration history differs without explanation; any cross-tenant authorization result changes; counts/null/duplicate/orphan checks exceed tolerance; critical auth/upload/feed/hiring/finance/admin journeys fail; monitoring or an application rollback path is unavailable.

### Success criteria

- Another engineer can reproduce the drill from retained evidence alone.
- No unexplained data, schema, authorization, or object difference remains between source and restored target.
- Achieved RPO ≤ target RPO and measured restore+validate time recorded against the RTO target (section 4.2).
- The application rollback path (section 2) was exercised for one restore-point iteration and verified.

### Evidence template (per drill)

| Field | Value |
| --- | --- |
| Drill ID / date / operator |  |
| Source project role + recovery point |  |
| Isolated target project reference |  |
| Backup mode + latest/earliest restore point |  |
| Restore started / completed (timestamps) |  |
| Loopback + smoke + schema + RLS + journey results |  |
| Applied migration versions on target vs source |  |
| Database types drift result |  |
| Storage object reconciliation result |  |
| Achieved RPO / RTO |  |
| Manual dependencies |  |
| Approving owner |  |

Retain this completed template as the hosted evidence for acceptance criterion 2.

## 7. Cadence

- Verify the backup dashboard monthly and before every production database batch (per legacy plan).
- Run the isolated restore drill **quarterly** and after any material Auth, Storage, finance, rights, or hiring migration batch.
- Review this plan after every incident or failed drill.
- Re-run `npm run check:local-docker` and `npm run check:migration-chain` as the read-only local regression checks for this plan's standing assumptions.

## 8. Hosted blockers and open items (tracked, not fabricated)

| ID | Item | Owner | State |
| --- | --- | --- | --- |
| RELEASE-007 hosted | Four isolated Vercel/Supabase staging and production projects provisioned, with scoped secrets and domains | release / ops owner | **BLOCKED** — no authorized hosted credentials in workspace; live domains still share one deployment |
| RELEASE-004 / criterion 2 | Production backup/PITR dashboard evidence (section 5 checklist) | ops owner | **BLOCKED** — dashboard not accessible from this workspace |
| RELEASE-004 / criterion 2 | Isolated restore drill execution (section 6 template) | ops owner | **BLOCKED** — requires approved isolated target + PITR evidence |
| OR-RECOVERY-01 | Owner decision: is catastrophic-restore downtime counted against the 99.9% availability SLO? | account owner | OPEN |
| Storage-object copy | Independent object inventory/export process (object RPO ≤ 24 h) | ops owner | OPEN — not implemented |
| RELEASE-003 hosted | On-call ack/routing destination provisioning (escalation contract destination) | deploy/ops owner | BLOCKED per `docs/observability-slo-and-runbooks.md` |

## 9. References

- `docs/engineering/tasks/active/RELEASE-004.json` — this task record (acceptance criteria 1–4, checkpoints).
- `docs/engineering/tasks/active/RELEASE-007.json` — isolated topology evidence + hosted blocker.
- `docs/observability-slo-and-runbooks.md` — 99.9% monthly SLO, error budget, event routing, runbooks (RELEASE-003).
- `docs/audit-remediation/2026-07-27/RECOVERY_AND_CONTINUITY_PLAN.md` — legacy provisional plan (preserved; superseded in part).
- `docs/LOCAL_DEPLOYMENT_READINESS.md` — local rollback/recovery notes and env-var contract names.
- `docs/DEPLOYMENT_ROUTINE.md` — release sequence, migration gate, rollback line.
- `docs/DEVELOPMENT_WORKFLOW.md` — verification tiers.
- `docs/engineering/DECISIONS.md` — CP-051 (no destructive reset), CP-053 (owner-approved release/schema sequencing).
- `docs/engineering/migration-validation/` — `history-baseline.json`, `hosted-history-ledger.json`, per-migration validation manifests.
- `.github/workflows/deploy-demo.yml`, `.github/workflows/deploy-production.yml` — exact-SHA deploy mechanics and topology vars.
- Checks: `npm run check:local-docker`, `npm run check:migration-chain`, `npm run check:migration-validation`.