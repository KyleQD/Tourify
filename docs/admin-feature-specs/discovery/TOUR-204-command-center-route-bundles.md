# TOUR-204 — Split command-center route bundles

## Acceptance criteria

Tabs load independently with stable typed contracts; opening overview does not download every editor or trigger duplicate calls.

## Shipped

1. **Typed contracts** — `lib/admin/tour-command-center-tabs.ts`
   - `TourCommandCenterTabId`, per-tab `bundles`, `summaryHydration`, `onActivateEndpoints`, `domainKey`
   - Helpers: visible tabs, active-tab resolution, workflow fanout gate, deferred bundle list

2. **Independent mounts** — `app/admin/dashboard/tours/[id]/page.tsx`
   - Editor panels render only when `activeTab` matches
   - `GrantTourAdminsPanel` moved into dynamic barrel (`TourGrantAdminsPanel`)
   - Tabs filtered by TOUR-203 `domainAccess`

3. **No duplicate calls on overview**
   - Workflow 4-call fanout runs only for overview (or activity dialog)
   - Finances panel accepts `initialTransactions` from summary (skips GET when seeded)
   - Calendar panel accepts `initialCalendarToken` from summary tour row

4. **Bundle barrel** — `components/admin/tours/panels/index.tsx` documents TOUR-204 chunk split

## Verify

- `npx vitest run __tests__/admin/tour-command-center-tabs.test.ts`

## Follow-ups

- TOUR-205 deep-duplicate preview
- TOUR-601 cache/ETag for summary (optional)
- Fold workflow summary into summary BFF to remove overview-side fanout entirely
