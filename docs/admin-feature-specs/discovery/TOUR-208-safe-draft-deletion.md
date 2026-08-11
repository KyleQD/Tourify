# TOUR-208 — Implement safe draft deletion

## Acceptance criteria

Eligibility blocks deletion when published, ticketed, contracted, paid, staffed, or referenced; authorized deletion is transactional and audited.

## Shipped

1. **Eligibility** — `lib/admin/tour-delete-eligibility.ts`
   - Blockers: state, legal hold, published events, ticketed, contracted, paid, staffed, vendors/grants/logistics/documents/jobs
   - Draft event links alone do not block (detached, not cascade-deleted)

2. **Execute** — `deleteTour` runs eligibility → detach `tour_events` → delete tour → `logAuditEvent` → `tour.deleted` outbox (best-effort after commit)

3. **Preview API** — `POST /api/admin/tours/:id/delete-preview`

4. **UI** — `TourDeletePreviewDialog` on command center (Delete enabled for drafts only)

## Verify

- `npx vitest run __tests__/admin/tour-delete-eligibility.test.ts`

## Follow-ups

- TOUR-209 tags/owners/saved views
- Optional DB RPC for single-transaction hard delete under heavy FK graphs
