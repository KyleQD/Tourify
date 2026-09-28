# SEC-202 — Introduce state-aware authorization

**Date:** 2026-07-20  
**Spec:** `01_Platform_Tenancy_RBAC_and_Audit.md`

## Acceptance criteria

Published, active, settled, archived, and legally retained records enforce stronger actions and approval/separation-of-duties rules.

## Authorization formula (complete)

`authenticated actor` + `acting organization` + `required capability` + `target belongs to organization` + **`record state permits action`**

## What shipped

### Core modules

| Module | Role |
|---|---|
| `lib/admin/state-aware-authorization.ts` | Domain × state × action matrix (tour, event, finance_transaction, finance_settlement) |
| `lib/admin/separation-of-duties.ts` | Shared SoD predicate (approve / pay / settle) |

### Tour rules

| State | Stronger behavior |
|---|---|
| published / active / completed | Metadata/plan require `tour.manage`; **direct status writes denied** (lifecycle transitions only) |
| settled | Metadata requires `finance.approve` or `tour.archive`; plan edits denied |
| archived / cancelled | Read-only for metadata/plan |
| legally retained (`settings.legal_hold` / `legal_retention` / `retention_until`) | Delete + archive blocked |
| hard delete | Draft only |

### Separation of duties

- Tour **settle** transition: actor ≠ publisher/creator when prior actor known
- Finance **pay** (status → paid/refunded): actor ≠ `created_by`
- Finance settlement finalize/pay: SoD when `settled_by` present

### Mutation wiring

- `AdminTourEventOperationsService.updateTour` / `deleteTour` / `updateEvent` / `deleteEvent`
- Admin routes pass `admin.capabilities`
- `evaluateTourTransition` — legal retention on archive + SoD on settle
- `finance-command.service` — pay/approve state gates

## Tests

`__tests__/admin/state-aware-authorization.test.ts` — allow/deny matrix by state × action + SoD

## Follow-ups

- `SEC-203` field-level protected-data policy
- Stamp `settings.lifecycle.published_by` on publish so settle SoD always has a prior actor
- Event domain still lacks a full lifecycle command surface (status updates remain `event.manage`-gated)
