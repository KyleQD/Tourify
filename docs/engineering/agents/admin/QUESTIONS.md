# ADMIN-001 Questions

## Priority Legend

- **P1** — Blocking; must be answered before other agents can proceed
- **P2** — Important; affects sequencing or scope
- **P3** — Clarifying; helps with prioritization or direction

---

## Q001 — Admin Gate Split Scope (WS-0.8)

**Priority:** P1
**Category:** Security / Architecture
**Blocks:** WS-0.8 implementation, all admin authorization work

**Question:** What is the exact scope of the admin gate split (WS-0.8)? Should we split into:
- (a) Platform admin vs org admin only?
- (b) Platform admin vs org admin vs venue admin?
- (c) More granular roles (e.g., finance admin, logistics admin, etc.)?

**Why this matters:** The split determines the authorization model for all 289 admin API routes and 79 page routes. If we split too coarse, we miss security requirements. If we split too fine, we over-engineer.

**Recommended answer format:** Specify the exact role taxonomy and which routes/operations map to which roles.

---

## Q002 — Admin Guard Sweep Scope (WS-1.7)

**Priority:** P1
**Category:** Security / Authorization
**Blocks:** WS-1.7 implementation, all admin route hardening

**Question:** For WS-1.7 (admin guard sweep), should we:
- (a) Audit every admin route and add guards where missing?
- (b) Rebuild all admin route auth middleware from scratch?
- (c) Use a combination — audit first, then fix gaps?

**Why this matters:** The approach determines effort and risk. Option (a) is surgical but may miss patterns. Option (b) is thorough but high-risk. Option (c) is balanced.

**Recommended answer format:** Specify the approach and any existing guard patterns to follow.

---

## Q003 — Platform Admin Role Definition

**Priority:** P1
**Category:** Authorization / Role Design
**Blocks:** `lib/auth/platform-admin.ts` changes, admin gate split

**Question:** What defines a "platform admin" in Tourify? Is it:
- (a) A user with no org membership who can manage all orgs?
- (b) A user with a special platform-level role across all orgs?
- (c) A user who can switch between org contexts freely?

**Why this matters:** The platform admin role is distinct from org admin and determines how `platform-admin.ts` and `admin-profile-gates.ts` should work.

**Recommended answer format:** Define the platform admin role, its capabilities, and how it differs from org admin.

---

## Q004 — Admin Feature Spec Builder Legacy

**Priority:** P2
**Category:** Process / Cleanup
**Blocks:** None directly

**Question:** The admin-feature-spec-builder ledger shows 362 spec items (phases 0-6) all marked COMPLETE. Should we:
- (a) Archive the ledger and treat it as historical evidence?
- (b) Keep it active and use it for ongoing admin feature work?
- (c) Delete it and rely on the new task system?

**Why this matters:** The ledger is large and may confuse future agents. It contains spec items that may or may not be implemented.

**Recommended answer format:** Specify the disposition of the legacy ledger.

---

## Q005 — Admin Dashboard Builder Legacy

**Priority:** P2
**Category:** Process / Cleanup
**Blocks:** None directly

**Question:** The admin-dashboard-builder ledger is marked COMPLETE. Should we:
- (a) Archive it and reference it from ADMIN-001 BASELINE?
- (b) Keep it active for ongoing dashboard work?
- (c) Delete it?

**Why this matters:** Same as Q004 — legacy ledger disposition.

**Recommended answer format:** Specify the disposition.

---

## Q006 — Admin UI Wiring Legacy

**Priority:** P2
**Category:** Process / Cleanup
**Blocks:** W0 remote-schema-reconciliation, W0 supabase-branch-validation

**Question:** The admin-ui-wiring ledger shows W0 remote-schema-reconciliation pending and W0 supabase-branch-validation blocked. Should we:
- (a) Treat these as open tasks and create new task records?
- (b) Mark them as known issues and defer to future work?
- (c) Investigate and resolve them now?

**Why this matters:** These are the only non-COMPLETE items in the legacy ledgers and may represent real gaps.

**Recommended answer format:** Specify whether to pursue, defer, or investigate.

---

## Q007 — Admin Test Coverage Priority

**Priority:** P2
**Category:** Quality / Testing
**Blocks:** ADMIN-001 completion, future admin work

**Question:** Should we prioritize adding test coverage for untested admin operations before launch, or is the existing 244 test files sufficient?

**Why this matters:** Test coverage affects confidence in admin operations. Some domain files may lack tests entirely.

**Recommended answer format:** Specify minimum test coverage requirements for admin operations.

---

## Q008 — Publication Lifecycle Edge Cases

**Priority:** P2
**Category:** Business Logic / Edge Cases
**Blocks:** Publication lifecycle hardening

**Question:** Are there known edge cases in the publication lifecycle (event/tour publication) that need attention? For example:
- Concurrent publication attempts?
- Publication rollback scenarios?
- Partial publication failures?

**Why this matters:** The publication lifecycle is complex and may have undefined behavior in edge cases.

**Recommended answer format:** List known edge cases or confirm they are handled.

---

## Q009 — Tour Lifecycle Edge Cases

**Priority:** P2
**Category:** Business Logic / Edge Cases
**Blocks:** Tour lifecycle hardening

**Question:** Are there known edge cases in the tour lifecycle that need attention? For example:
- Tour state transitions that are not allowed?
- Tour deletion eligibility edge cases?
- Tour route constraint violations?

**Why this matters:** Similar to Q008 — tour lifecycle is complex.

**Recommended answer format:** List known edge cases or confirm they are handled.

---

## Q010 — Data Protection Policy Scope

**Priority:** P2
**Category:** Security / Data Protection
**Blocks:** Protected data policy enforcement

**Question:** What data is considered "protected" in the admin context? Should we:
- (a) Protect all financial data?
- (b) Protect all PII?
- (c) Protect all org-scoped data?
- (d) Something else?

**Why this matters:** Protected data policies (`protected-data-policy.test.ts`, `protected-aggregate-policy.test.ts`) exist but the scope is unclear.

**Recommended answer format:** Define the protected data scope.

---

## Q011 — Separation of Duties Scope

**Priority:** P2
**Category:** Security / Compliance
**Blocks:** SoD enforcement

**Question:** What separation of duties constraints should be enforced? For example:
- Approve vs execute financial transactions?
- Create vs publish events?
- Assign vs approve staff?

**Why this matters:** `lib/admin/separation-of-duties.ts` exists but the exact constraints are unclear.

**Recommended answer format:** List the SoD constraints to enforce.

---

## Q012 — Generated Maps Refresh

**Priority:** P3
**Category:** Process / Documentation
**Blocks:** None

**Question:** Should we refresh the generated maps before completing ADMIN-001, or treat them as stale but reference them as-is?

**Why this matters:** Maps are stale (SHA `a7193116`, working tree dirty). Refreshing them may change baseline counts.

**Recommended answer format:** Specify whether to refresh or reference as-is.

---

## Q013 — Admin Navigation IA

**Priority:** P3
**Category:** UX / Navigation
**Blocks:** None directly

**Question:** Is the current admin navigation structure (79 routes across many domains) optimal? Should we:
- (a) Reorganize navigation for better discoverability?
- (b) Keep current structure and focus on other gaps?
- (c) Add a global admin search to compensate?

**Why this matters:** `admin-navigation-ia.test.ts` exists, suggesting navigation is a known concern.

**Recommended answer format:** Specify navigation priorities.

---

## Question Count Summary

| Priority | Count | IDs |
|----------|-------|-----|
| P1 (Blocking) | 3 | Q001, Q002, Q003 |
| P2 (Important) | 6 | Q004, Q005, Q006, Q007, Q008, Q009, Q010, Q011 |
| P3 (Clarifying) | 2 | Q012, Q013 |
| **Total** | **11** | |

---

## Blocking Questions for Other Agents

The following P1 questions block work in other domains:

1. **Q001 (Admin Gate Split)** — Blocks any agent working on admin authorization, role-based access, or API route guards.
2. **Q002 (Admin Guard Sweep)** — Blocks any agent hardening admin routes or adding authorization middleware.
3. **Q003 (Platform Admin Role)** — Blocks any agent working on platform-level admin features or cross-org authorization.
