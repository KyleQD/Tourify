# Current State Reconciliation

> Historical working note only. Its status language is not authoritative. Canonical status is derived from `docs/admin-audit/registry/`; UX traceability is recorded in `docs/admin-audit/registry/ux-audit-program.json`.

**Audited commit:** `14842ad3dc65b5c9a70e8abff9d12475a1782d63`
**Current commit:** `a7193116c5a677b1c2939aa4a66e9415dac6eed1`
**Current branch:** `codex/admin-master-remediation`
**Commits since audit:** 103

## Summary of Changes Since Audit

The repository has progressed substantially since the audited commit. Key changes include:

### Venue Identity & RBAC (Major)
- Canonical venue identity bridge
- Entity RBAC, permission vocabulary
- Venue access provisioning hardening
- Staff DTOs

### Ticketing
- Owner resolution, permission catalog
- Pricing projection, door check-in
- Offline queue, sale state machine

### Hiring & Workforce
- Canonical hiring lifecycle
- Compliance-gated transactions
- Application pipeline, onboarding convergence
- Roster management, work mode permissions

### Scheduling
- Open-shift creation, timezone-safe window math
- Swap/triage, templates, CSV export

### Finance
- Server-owned venue money truth
- Snapshot DTO, share slicing
- Exports/payouts

### Analytics
- Metric catalog, server snapshot, observable rollup

### Events
- Canonical PATCH update, event-ops CTAs
- Event site map, advancing/day-sheets

### Logistics
- Site maps (bridge, collaboration, optimistic-concurrency save)
- Transport, catering, equipment

### Communications
- DB-level messaging isolation
- Participant validation

### Calendar
- Unified layers (reservations/holds/blocks/bookings/events)

### Refactoring
- Massive retirement of duplicate venue UI components (~23,000 lines deleted)
- Dead staff profile services removal

## Findings Reconciliation

### ALREADY RESOLVED (by commits since audit)

| Finding | Evidence | Resolution |
|---|---|---|
| AUX-COM-008 (Attachment privacy/trust) | Signed URL view/download commits | Server-side signed URLs implemented |
| AUX-IA-005 (Internal navigation) | SPA routing improvements in recent commits | Some window.location replaced |

### PARTIALLY ADDRESSED

Many findings relate to the same structural problems that persist:
- Sidebar IA unchanged (AUX-IA-001)
- Tab wall architecture unchanged (AUX-EVT-009, AUX-ORG-001, AUX-TIX-001)
- Data state truthfulness still has false-zero patterns
- URL state still inconsistent across domains

### NEEDS RUNTIME VERIFICATION

| Finding | Notes |
|---|---|
| AUX-ORG-006 | Active tab validation for unauthorized deep links |
| AUX-FLOW-010 | Runtime end-to-end continuity across personas |

### REMAINING OPEN FINDINGS

All 158 findings have been reviewed. The vast majority remain open because:
1. No UI/UX-focused changes were made since the audit (all changes were domain/backend)
2. The architectural problems (IA overload, URL inconsistency, false-zero states, component duplication) persist
3. Mobile/a11y issues remain unaddressed

## Key Architectural Observations

1. **The sidebar/navigation is structurally unchanged** - same feature-inventory approach
2. **Tab walls remain** - Event 13, Org 16, Ticketing 12, Tour 9, Logistics 8, Hiring 7
3. **URL state is still inconsistent** - some domains URL-synced, others local state
4. **False-zero/false-empty patterns persist** in catch blocks across domains
5. **Component duplication persists** - Admin vs Workforce parallel families
6. **Nested `<main>` landmarks** still present in WorkforcePageShell
7. **Client-side exports** still incomplete for Ticketing/Finance
8. **Saved views** still use browser prompt
9. **Event detail** is still ~76KB monolith
10. **Tour detail** is still ~80KB monolith

## Implementation Priority

Given the 103 commits of domain work since audit, the implementation must:
1. Preserve all new venue, RBAC, ticketing, hiring, finance, logistics functionality
2. Build shared architecture primitives FIRST
3. Migrate domains onto shared primitives incrementally
4. Never regress existing domain capabilities

## Recommendation

Proceed with all workstreams. No findings have been resolved to the point of closure. The few partially addressed items (signed URLs, some SPA routing) should be verified but not relied upon.
