# TOUR-207 — Implement archive/restore

## Acceptance criteria

Impact preview identifies shares/jobs/upcoming work; archive makes tour read-only, revokes eligible shares, and preserves legal/financial records.

## Shipped

1. **Impact preview** — `lib/admin/tour-archive-preview.ts` + `POST .../archive-preview`
   - Buckets: blockers, shares (revoke), jobs, upcoming work, preserved (finance/settlements/contracts)

2. **Side effects** — `lib/admin/tour-archive-side-effects.ts` wired into `executeTourTransition`
   - Archive: revoke `entity_grants`, revoke publication share tokens, clear calendar/share tokens, stamp `pre_archive_state` + preserved counts in settings/audit
   - Restore: target `pre_archive_state` when completed/settled/cancelled; shares not re-created
   - Read-only already enforced via `isTourLifecycleReadOnly` / state-aware auth

3. **UI** — `TourArchivePreviewDialog` on command center (Archive / Restore buttons)

## Verify

- `npx vitest run __tests__/admin/tour-archive-preview.test.ts`

## Follow-ups

- TOUR-208 safe draft deletion
- Broader publication-token scope matching if schema differs per env
