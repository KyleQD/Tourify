# SEC-205 — Enforce capability-aware UI

**Date:** 2026-07-20  
**Spec:** `01_Platform_Tenancy_RBAC_and_Audit.md`

## Acceptance criteria

Navigation and controls reflect capability but never replace server enforcement; denied actions explain how to request access without revealing protected data.

## What shipped

| Piece | Role |
|---|---|
| `lib/admin/capability-aware-ui.ts` | Nav→capability rules, denial copy, annotate tree |
| `GET /api/admin/effective-capabilities` | Acting-org capabilities for UI (`enforcement: server_only`) |
| `hooks/use-admin-capabilities.ts` | Client loader |
| `components/admin/capability-gate.tsx` | Control gate + safe denial notice |
| `optimized-sidebar.tsx` | Disabled nav + tooltip request copy; shortcuts skip denied |

## Safety

- Denial messages name capabilities / surface labels only — never passport, tokens, or existence of protected records.
- Client capabilities are explicitly non-authoritative.

## Tests

`__tests__/admin/capability-aware-ui.test.ts`

## Follow-ups

- Apply `CapabilityGate` to high-risk action buttons (pay, publish, settle) on finance/tour panels
- SEC-604 access review can deep-link “request access” to org owners
