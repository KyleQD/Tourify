# Admin Feature Spec Revalidation — Progress

The original `.agents/admin-feature-spec-builder` ledger is retained as historical evidence but is read-only in this workspace. This ledger tracks the requested strict rerun from Phase 0 against the current integrated codebase.

**Current pointer:** `SEC-104`
**Started:** 2026-07-21
**Completion rule:** A task is revalidated only when every applicable persistence, RLS, API, UI, accessibility, recovery, and acceptance-test criterion is implemented. Pure models/tests alone are backend contracts, not finished operator features.
**Database rule:** SQL is generated for manual review/push only. No reset, truncate, destructive migration, or hosted execution.

## Phase 0

| ID | Status | Evidence |
|---|---|---|
| `ADR-001` | done | Decision corrected to prohibit all membership-derived selection; resolver returns 409 without verified header/session context; focused tests cover no fallback |
| `ADR-002` | done | ADR defines one owner, accepted transfer, org-scoped parents/children, and delegated collaboration; enforcement gaps are assigned to SEC-105/SEC-604 rather than hidden |
| `ADR-003` | done | Known role defaults are additive, custom roles remain explicit-only, documented manager aliases are aligned in code and manual SQL; focused tests/lint/migration scan pass |
| `ADR-004` | done | Canonical empty plans no longer revive legacy links; canonical read errors surface; create-with-stops preserves lifecycle semantics; 33 focused tests and touched lint pass |
| `ADR-005` | done | Manual migration makes committed snapshot content immutable, gates direct assembly to drafts, preserves validated lifecycle transitions; 22 focused tests/lint/safety scan pass |
| `ADR-006` | done | ADR and shared rule catalog agree on default blockers/warnings/override authority; implementation gaps are explicitly assigned to PLAN-206/PUB-201; 16 focused tests pass |
| `ADR-007` | done | ADR now fails cutover closed on unavailable sources and requires persisted org cutover evidence; existing RLS/command/reconciliation contracts pass 38 focused tests |
| `ADR-008` | done | ADR explicitly preserves separation of duties, audited threshold override, immutable approved/posted/final records, and compensating corrections; 77 focused tests pass |
| `ADR-009` | done | ADR now states archive cannot weaken retention and purge must be scoped, previewed, idempotent, audited, and fail closed; 60 focused lifecycle/retention tests pass |
| `ADR-010` | done | ADR now forbids silent DST shifts, unknown currency exponents, and zero/drop fallback for missing FX; current time/currency contracts pass 103 focused tests |
| `ADR-011` | done (supplemental) | Shared commands now persist mutation intent before invoking handlers and return 503 without mutation when audit storage is unavailable; 22 focused tests/lint pass |
| `PLAN-001` | done | ADR-004 now explicitly covers new/existing/shared events, non-show stops, detach, cancel, archive, draft delete, and settled/protected impact handling |
| `PLAN-002` | done | Inventory now reflects canonical tour_stops authority and maps all route, stop, compatibility, operational-intent, and free-text fields with cutover/retirement ownership |
| `PLAN-003` | done | Venue identity is blocker; missing venue profile/staffing are warnings; UI/server share stable rule IDs/remediation; 33 focused tests pass |
| `PUB-001` | done | Publication ADR locks immutable snapshots, supported types, readiness/override authority, evaluated audiences, acknowledgement, versioned correction, retraction, and retention; ADR-005 database guards are queued as manual SQL |
| `PUB-002` | done | Canonical section defaults classify every nested leaf; protected fields elevate access; unknown custom sections fail closed unless explicitly classified; manifest records resolved field map; 23 focused tests/lint pass |
| `PUB-101` | done | Manual corrective SQL scopes worker mutations by org, recovers stale claims, rejects conflicting idempotency reuse, resets replay budget, and preserves retry/dead-letter/correlation contracts; 31 tests/lint/scanner pass |
| `PUB-102` | done | Manual SQL derives child org ownership from canonical parents, quarantines ambiguity, adds composite org FKs, and restricts snapshot/PII/token direct reads; 47 tests/lint/scanner pass |
| `PUB-103` | done (early Phase 1 hardening) | Adapters preserve Resend/Twilio/Expo receipt IDs, expose normalized state/retry/cost/consent, and fail consent closed; 10 focused tests/lint pass |
| `TIX-001` | done | ADR now decides canonical tables, append-only inventory, provider boundary, explicit capacity source, audited refunds/reversals, persisted cutover evidence, and ADR-009 retention; 41 tests pass |
| `TIX-002` | done | Repository inventory maps bridge/canonical/inactive tables, all consumer families, missing workers, reconciliation queries/evidence, owners, and retirement gates; bridge-anchor contradiction remains explicit; 33 tests pass |
| `FIN-001` | done | ADR defines authoritative subledger records, lifecycle/posting, currency/FX/rounding, approval/separation, settlement, corrections, retention, and ERP boundary; 142 tests pass |
| `FIN-002` | blocked | Repository inventory and read-only evidence pack complete; hosted Tourify Demo migration/policy/grant/row/quarantine/advisor output is required and cannot be inferred or executed without production access |
| `CONT-101` | done | ADR decides canonical types/states, immutable template/version evidence, approvals/SoD, signature modes/providers, executed semantics, amendments, obligations, seven-year retention/legal hold, and fail-closed provider/webhook boundary; 64 tests pass |
| `SEC-001` | blocked | Canonical SELECT-only database exporter, deterministic drift comparator, secure evidence rules, and manual runbook are complete; isolated-branch and Tourify Demo exports/advisors/sign-off are required |
| `SEC-002` | done | ADR now fixes the signed envelope/server-session format, epoch/CAS switching, stale-tab contract, full cache key, expiry/revocation, support grants, typed responses, and threat model; current header-first code remains explicitly assigned to SEC-101 |
| `SEC-003` | blocked | Every canonical sidebar leaf and registered API method now resolves to catalog capabilities/default roles with fail-closed unknown navigation and high-risk overlays; generated review artifact still requires named product/security sign-off |
| `SEC-004` | blocked | Deterministic valid UUIDs, symmetric roles, explicit multi-org memberships, and distinct parent/child identities now cover all 11 audited domains; canonical contract persistence and isolated DB seed/RLS execution are still absent |
| `SEC-005` | done | Process/template now include reusable row/orphan/quarantine/constraint/RLS/grant/history/advisor checks; scanner covers tracked/staged/untracked/base SQL and unsafe DDL/DML/constraints; hosted workflows require base evidence, history list, and dry-run before push |
| `REL-001` | done | Node 20.x, npm declaration, lockfile v3, engine strictness, no legacy-peer bypass, preinstall/main-CI enforcement, and deterministic toolchain tests are in place |
| `REL-002` | done | DayPicker upgraded to compatible v9, obsolete peer overrides and Vercel legacy flag removed, three calendar wrappers migrated, clean disposable npm ci and peer graph pass, CI peer gate added |
| `REL-003` | blocked | Historical ENOTEMPTY does not reproduce and clean-CI build is the regression guard, but current integrated Admin/API/service TypeScript errors prevent an exit-0 production build |
| `REL-004` | done | One canonical contract classifies production build/runtime/conditional/optional values; build fails once before Next compilation, runtime asserts once per process, partial adapters fail clearly, and focused tests/lint pass |
| `REL-005` | done | Venue identity stays a blocker while venue-profile/staffing stay warnings; builder, persisted evidence, UI, publish command, overrides, fixtures, and tests now use the shared rule catalog; 33 focused tests and touched lint pass |
| `REL-006` | blocked | Deterministic minimal/realistic/edge/cross-tenant scenarios now cover 13 parent/child domains, realistic volumes, DST, currencies, protected projections, stale/replay/access edges, and forbid Demo/prod targets; canonical contract persistence plus isolated seed/RLS execution remain required |
| `REL-007` | done | Direct ESLint CLI replaces next lint; deterministic Admin/CI path+rule baseline records 101 warnings, reductions are automatic, growth/errors/invalid or expired exceptions fail CI, and comparator tests/check pass |
| `REL-008` | blocked | Governed registry/resolver, acting-context capability APIs, immutable reasoned assignment model, safe unavailable UI, tests, and expand-only manual SQL are complete; isolated branch migration/RLS execution and hosted promotion evidence remain required |
| `REP-001` | done | Typed catalog defines 24+ governance fields, eight canonical seed KPIs, and explicit legacy-conflict coverage for all 60 inventoried reporting consumers; duplicate candidates and unresolved source/access/currency/time-zone/failure/org-scope semantics are flagged and tests pass |
| `REL-101` | blocked | Reset-free ephemeral migration workflow and real direct-client core RLS suite replace the placeholder; structural tests/YAML pass, but all-domain parent/child execution, prior-snapshot migration, and hosted CI evidence await contract persistence and an isolated runner |
| `REL-102` | blocked | Versioned per-migration manifests now machine-require owner/reviewer, representative snapshot, preflight counts, lock/timeout/batch/resume/idempotency, quarantine, constraints/indexes, recovery, postflight, and governed exceptions; staging/production gates reject insufficient evidence, but representative isolated timing/resume/advisor artifacts are intentionally pending |
| `REL-103` | blocked | TypeScript-AST CI now enforces exact 232 route and route-method parity, rejects duplicates/stale entries, materializes acting context/capability mode/schema IDs/idempotency/audit/owner per method, and prevents growth beyond 122 legacy routes; those legacy handlers still require shared runtime schema/auth/idempotency/audit enforcement and contract tests |
| `REL-104` | blocked | Dedicated workflow now runs full-history Gitleaks, CodeQL security-extended, critical PR dependency review, CycloneDX SBOM retention, and machine-governed expiring exploitability exceptions; successful hosted runs, GitHub security settings, required-check enforcement, and retained artifacts remain external evidence blockers |
| `SEC-101` | blocked | Expand-only manual SQL adds per-auth-session profile/org/epoch/expiry/revocation/version state, restricted own-session CAS/resolve/revoke RPCs, and immutable audit; HMAC envelope/session binding/full cache-key primitives and 7 tests pass, but isolated SQL evidence, signing-key configuration, server route cutover, and client switch/stale-tab integration remain |
| `SEC-102` | done | Capability resolver now combines catalog-filtered system/custom roles and active creator/master invariant, fails closed for every non-active/invalid/expired membership, applies only non-revoked/non-expired exact-scope grants, and passes 35 focused authorization/lifecycle tests |
| `SEC-103` | done | New-command wrapper requires auth, acting context, capability, schema, explicit organization/entity target, all-ID bulk ownership checks, correlation, declared idempotency, fail-closed audit intent, and structured errors; 20 focused tests and touched lint pass |
| `SEC-104` | in_progress | Existing Admin endpoint migration revalidation |

All remaining IDs follow the canonical order in `../../../../.agents/admin-feature-spec-builder/INVENTORY.md` and are pending strict revalidation.
