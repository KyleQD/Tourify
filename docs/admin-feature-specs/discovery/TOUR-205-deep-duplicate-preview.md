# TOUR-205 — Create deep-duplicate preview

## Acceptance criteria

User selects metadata, stops/events, team roles, vendors, templates, budgets, documents, logistics skeletons, and permissions; preview lists copies, links, exclusions, and conflicts.

## Shipped

1. **Preview service** — `lib/admin/tour-duplicate-preview.ts`
   - Selectable domains + defaults
   - Inventory collection + pure `buildTourDuplicatePreview`
   - `planToken` for TOUR-206 execute

2. **API** — `POST /api/admin/tours/:id/duplicate-preview`
   - `tour.manage` + `assertAdminTourAccess`
   - Body: `{ selection?, proposedName? }` → `{ preview }`

3. **UI** — `TourDuplicatePreviewDialog` on command-center Duplicate control
   - Domain checkboxes, proposed name, copies/links/exclusions/conflicts lists
   - Confirm creates metadata shell (existing POST) and stores plan for TOUR-206

## Verify

- `npx vitest run __tests__/admin/tour-duplicate-preview.test.ts`

## Follow-ups

- TOUR-206 resumable duplication job consuming `planToken`
