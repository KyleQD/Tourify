# Implementation Roadmap

> Historical working note only. Checked boxes below are not completion evidence. Canonical execution and status authority lives in `docs/admin-audit/registry/`; UX traceability is recorded in `docs/admin-audit/registry/ux-audit-program.json`.

## Phase 0 — Baseline & Reconciliation (COMPLETE)

- [x] Read all audit documents
- [x] Compare current HEAD vs audited commit
- [x] Create CURRENT_STATE_RECONCILIATION.md
- [x] Create this roadmap
- [x] Create FINDING_STATUS_MATRIX.md

## Phase A — Architecture Foundation (IN PROGRESS)

### A1: Data State Contract
- Create `lib/admin/data/admin-data-state.ts`
- Create `lib/admin/data/admin-data-state-helpers.ts`
- Create `components/admin/states/admin-data-state-renderer.tsx`
- Create `components/admin/states/admin-metric-state.tsx`

### A2: Navigation Model
- Create `lib/admin/navigation/admin-navigation-model.ts`
- Create `lib/admin/navigation/admin-vocabulary.ts`
- Create `components/admin/navigation/admin-sidebar.tsx`

### A3: URL/Scope Contract
- Create `lib/admin/navigation/admin-route-state.ts`
- Create `lib/admin/navigation/admin-link-builder.ts`

### A4: Admin Design System Primitives
- Create `components/admin/ui/admin-page-header.tsx` (enhanced)
- Create `components/admin/ui/admin-workspace-nav.tsx`
- Create `components/admin/ui/admin-data-table.tsx`
- Create `components/admin/ui/admin-scope-breadcrumb.tsx`
- Create `components/admin/ui/admin-attention-queue.tsx`
- Create `components/admin/ui/icon-action-button.tsx`
- Create `components/admin/ui/admin-skeleton.tsx`
- Create `components/admin/actions/critical-action-dialog.tsx`

### A5: Workspace Navigation
- Create `components/admin/workspace/admin-workspace-nav.tsx`
- Create `lib/admin/workspace/workspace-navigation-config.ts`

## Phase B — Domain Migration (PENDING)

### B1: Admin Sidebar & IA (Workstream 1)
### B2: Dashboard Command Center (Workstream 6)
### B3: Event Operations (Workstream 7)
### B4: Tour Operations (Workstream 8)
### B5: Workforce & Hiring (Workstream 9)
### B6: Organization Governance (Workstream 10)
### B7: Logistics (Workstream 11)
### B8: Ticketing (Workstream 12)
### B9: Finance (Workstream 13)
### B10: Vendors & Contracts (Workstream 14)
### B11: Communications (Workstream 15)
### B12: Analytics (Workstream 16)

## Phase C — Cross-Cutting (PENDING)

### C1: Mobile & Accessibility (Workstream 17)
### C2: Action Semantics (Workstream 18)
### C3: Runtime Verification (Workstream 19)
