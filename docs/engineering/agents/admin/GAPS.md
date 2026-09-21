# ADMIN-001 Gaps

## Triage Legend

- **P0 (Blocker)** — Must be resolved before launch; security risk or data integrity risk
- **P1 (High)** — Should be resolved before launch; significant user experience or operational gap
- **P2 (Medium)** — Can be deferred post-launch; known issue or missing feature
- **P3 (Low)** — Nice to have; improvement or cleanup item

---

## G001 — Admin Gate Split Required

**Triage:** P0 (Blocker)
**Evidence:** `docs/DEVELOPMENT_BACKLOG.md` WS-0.8
**Location:** `lib/auth/admin.ts`, `lib/auth/admin-capabilities.ts`, `lib/auth/admin-profile-gates.ts`

**Description:** Admin authorization is currently monolithic. WS-0.8 calls for splitting admin gates to support finer-grained role separation (org admin vs platform admin vs venue admin). This is a security requirement.

**Impact:** Without the split, admin authorization cannot enforce separation of duties at the data boundary. All admin users currently share the same gate logic.

**Related:** WS-0.8 in `docs/DEVELOPMENT_BACKLOG.md`

---

## G002 — Admin Guard Sweep Required

**Triage:** P0 (Blocker)
**Evidence:** `docs/DEVELOPMENT_BACKLOG.md` WS-1.7
**Location:** All admin API routes (`app/api/admin/**/route.ts`), all admin page routes (`app/admin/**/page.tsx`)

**Description:** WS-1.7 calls for a comprehensive sweep of all admin routes to ensure every route has proper authorization guards. Without this sweep, some routes may be unprotected or inconsistently guarded.

**Impact:** Potential for unauthorized access to admin operations if guards are missing or inconsistent across the 289 API routes and 79 page routes.

**Related:** WS-1.7 in `docs/DEVELOPMENT_BACKLOG.md`

---

## G003 — Capability Gate UI Coverage Incomplete

**Triage:** P1 (High)
**Evidence:** `components/admin/capability-gate.tsx` exists but coverage across all admin components is unclear
**Location:** `components/admin/capability-gate.tsx`, various admin components

**Description:** A `capability-gate.tsx` component exists for UI-level capability gating, but it is not clear whether all admin components that should be gated are actually using it. Some components may render admin-only UI without checking capabilities.

**Impact:** Admin users may see or interact with UI elements they should not have access to, even if the API layer is protected.

---

## G004 — Separation of Duties Enforcement Inconsistent

**Triage:** P1 (High)
**Evidence:** `lib/admin/separation-of-duties.ts` exists; test coverage in `__tests__/admin/` is partial
**Location:** `lib/admin/separation-of-duties.ts`, various admin domain files

**Description:** Separation of duties logic exists but is not consistently applied across all admin operations. Some mutation paths may not check SoD constraints.

**Impact:** A user with sufficient privileges could perform conflicting operations (e.g., approve and execute the same financial transaction) without SoD enforcement.

---

## G005 — Data Protection Policy Coverage Gaps

**Triage:** P1 (High)
**Evidence:** `__tests__/admin/protected-data-policy.test.ts`, `__tests__/admin/protected-aggregate-policy.test.ts` exist but coverage is partial
**Location:** `lib/admin/` (various domain files)

**Description:** Protected data and aggregate policy tests exist but do not cover all admin data access paths. Some queries may bypass protection policies.

**Impact:** Sensitive data may be accessible without proper policy enforcement.

---

## G006 — Publication Lifecycle State Machine Gaps

**Triage:** P2 (Medium)
**Evidence:** `lib/admin/publication-lifecycle.ts`, `lib/admin/publication-transactional-publish.service.ts`
**Location:** `lib/admin/publication-lifecycle.ts`, `app/api/admin/publication/`

**Description:** The publication lifecycle is complex and may have edge cases in state transitions that are not fully covered by tests or documented in the codebase. The transactional publish service adds another layer of complexity.

**Impact:** Publication state machine may have undefined behavior in edge cases, potentially allowing invalid state transitions.

---

## G007 — Tour Lifecycle State Machine Gaps

**Triage:** P2 (Medium)
**Evidence:** `lib/admin/tour-lifecycle.ts`, `lib/admin/tour-readiness-engine.ts`
**Location:** `lib/admin/tour-lifecycle.ts`, `app/api/admin/tours/`

**Description:** Similar to G006, the tour lifecycle state machine may have edge cases in state transitions. The readiness engine adds complexity but coverage is unclear.

**Impact:** Tour lifecycle may have undefined behavior in edge cases.

---

## G008 — Event Readiness Engine Coverage

**Triage:** P2 (Medium)
**Evidence:** `lib/admin/event-readiness-engine.ts`, `__tests__/admin/event-readiness-engine.test.ts`
**Location:** `lib/admin/event-readiness-engine.ts`

**Description:** Event readiness checks exist but the test coverage for all readiness conditions is unclear. Some readiness checks may be incomplete or missing.

**Impact:** Events may be marked as ready when they are not, or not ready when they are.

---

## G009 — Admin UI Wiring Gaps (Remote Schema Reconciliation)

**Triage:** P2 (Medium)
**Evidence:** `.agents/admin-ui-wiring/` — W0 remote-schema-reconciliation pending
**Location:** Various admin components and API routes

**Description:** The admin-ui-wiring ledger shows W0 (remote-schema-reconciliation) is still pending. This suggests some admin UI components may not be properly wired to their backend data sources.

**Impact:** Admin UI may show stale or incorrect data for some views.

---

## G010 — Supabase Branch Validation Blocked

**Triage:** P2 (Medium)
**Evidence:** `.agents/admin-ui-wiring/` — W0-supabase-branch-validation blocked
**Location:** Supabase integration layer

**Description:** Supabase branch validation is blocked, preventing verification of database integration for admin features.

**Impact:** Cannot confirm database integration is correct for admin operations.

---

## G011 — Admin Test Coverage Gaps

**Triage:** P2 (Medium)
**Evidence:** 244 test files exist but coverage across all 281 lib files and 258 components is unclear
**Location:** `__tests__/admin/`

**Description:** While there are 244 test files, it is not clear whether all critical admin operations have test coverage. Some domain files may lack tests entirely.

**Impact:** Regressions in untested admin operations may go undetected.

---

## G012 — Generated Maps Staleness

**Triage:** P3 (Low)
**Evidence:** Generated maps created at SHA `a7193116`, working tree dirty with 386/399 entries
**Location:** `docs/engineering/generated/`

**Description:** Generated maps (routes, API routes, components, database objects, permissions) are stale relative to the working tree. They do not reflect the current state of the codebase.

**Impact:** Maps may not accurately represent current admin surface area, leading to incorrect baseline counts or gap analysis.

---

## G013 — Navigation Information Architecture

**Triage:** P3 (Low)
**Evidence:** `__tests__/admin/admin-navigation-ia.test.ts` exists
**Location:** Admin navigation components

**Description:** Navigation IA tests exist but it is unclear whether the current navigation structure is optimal or consistent across all admin views. Some routes may be hard to discover.

**Impact:** Admin users may have difficulty navigating to the correct admin view.

---

## G014 — Legacy Agent Ledger Cleanup

**Triage:** P3 (Low)
**Evidence:** `.agents/admin-dashboard-builder/`, `.agents/admin-feature-spec-builder/`, `.agents/admin-ui-wiring/` — all marked COMPLETE or near-complete
**Location:** `.agents/admin-*/`

**Description:** Legacy agent ledgers are marked COMPLETE but still occupy disk space and may confuse future agents. They should be archived or removed after ADMIN-001 baseline is established.

**Impact:** Future agents may not know these ledgers exist or may re-read stale data.

---

## Gap Count Summary

| Triage | Count | IDs |
|--------|-------|-----|
| P0 (Blocker) | 2 | G001, G002 |
| P1 (High) | 3 | G003, G004, G005 |
| P2 (Medium) | 6 | G006, G007, G008, G009, G010, G011 |
| P3 (Low) | 3 | G012, G013, G014 |
| **Total** | **14** | |

## Acceptance Triage — Missing / Incomplete / Improve

The priority labels above describe urgency. The required gap-type triage is:

| Type | IDs | Basis |
| --- | --- | --- |
| Missing | None | The audited domain had implementation or evidence for every listed concern; the gaps were incomplete coverage or improvement debt rather than absent subsystems. |
| Incomplete | G001–G010 | Existing authorization, policy, lifecycle, wiring, and database-validation mechanisms were present but incomplete or not fully verified at the cited locations. |
| Improve | G011–G014 | Test visibility, generated-map currency, navigation IA, and legacy-ledger hygiene improve confidence or maintainability without representing an absent subsystem. |

This preserves the 2026-09-09 findings. Later implementation evidence belongs
to ADMIN-002, ADMIN-003, ADMUX-0102, and their owner records; it does not erase
the baseline gaps or make unanswered product-policy questions an ADMIN-001
blocker.
