# Organization backlog

The canonical work item is a task JSON. Launch priorities remain in `docs/DEVELOPMENT_BACKLOG.md`.

## Active

- `ORG-006` — disposition the org-scoped event/calendar/status/hold action
  surface, preserve the completed H8 object-level authorization fix, and name
  a consumer or evidence-backed disposition for every export.

## Candidate (from ORG-001 audit — awaiting owner answers in QUESTIONS.md)

- **P1** WS-0.2 completion: org invite revocation column + atomic accept RPC (mirror `accept_tour_collaboration_invitation`), hashed org invite tokens, rate limit + audit on accept. DB-pipeline-gated.
- **P1** Membership lifecycle surface decision: org-owned member list / role change / revoke / leave / transfer vs RBAC page ownership; capability-mapping contract test (`org_role_permissions` ↔ `lib/auth/admin-capabilities.ts` ↔ invite roles).
- **P2** Legacy `/api/tours` GET/POST retirement after confirming zero live clients (WS-2.3); admin parity exists (SEC-201).
- **P2** Acting-context headers on `components/admin/organization/*` panels (wrong-org risk for multi-account users).
- **P2** Public org DTO manage-check parity for confirmed tour team members/collaborators.
- **P3** Extend SEC-103 `withOrgCommand` adoption across remaining `app/api/admin/tours/**` mutations (WS-1.7/SEC-104).
- **P3** Tours RLS final-state reconciliation + multi-org RLS test matrix (WS-1.1).
- **P3** Org test coverage (`tour-access.service`, `org-command`) and public org/tour profile caching (WS-3.4).
- **Housekeeping** Fix `WORKING_SET.json`/`ARCHITECTURE.md` phantom `lib/organization/**` path and re-scope org-vs-admin ownership line (QUESTIONS Q11).

## Done

- Control-plane bootstrap created.
- ORG-001 audit deliverables: `BASELINE.md`, `GAPS.md`, `QUESTIONS.md` produced; `STATE.md` moved to reviewed (2026-09-09).
- ORG-002 through ORG-005 completed the canonical tenant identity and invite
  acceptance/visibility contracts.
