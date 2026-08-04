# Tourify Admin — Dashboard Usability Fixes Plan

**Prepared:** 2025-07-25
**Author:** Plan mode (Bob)
**Purpose:** Fix every admin dashboard page that fires 409 errors or renders incomplete UI when no
organization account is selected. Every fix is purely additive — no existing behavior is removed.

---

## 1. Problem Summary

### Root Cause

When no organization is selected, `resolveActingAdminContext()` returns HTTP 409
(`acting_context_required`). Because `useAdminCapabilities()` calls
`/api/admin/effective-capabilities` which also returns 409 on no-org context,
`capabilities` stays `null` forever. `annotateNavTreeByCapabilities(null)` marks every nav item
`allowed: false` with tooltip `"Checking access to {surface}…"` — causing the entire sidebar to
appear greyed out and non-interactive.

Separately, **six client-side pages** fire their API calls immediately on mount with no
`isActingReady` guard and no `actingHeaders`, causing those pages to 409 or show persistent
loading spinners even after the user selects an org.

### What Works Today

- `AdminActingContextBar` shows `"No organization selected"` and two CTA buttons
  (`"Manage organization"` → `/admin/dashboard/organization`, `"Roles & access"` → `/admin/dashboard/rbac`)
- `useActingContext()` exports `{ isActingReady, actingHeaders }` — a ready-to-use guard + headers
- `tours`, `finances`, `ticketing`, `features`, `events/create`, `tours/builder`, `tours/[id]`
  pages all correctly guard on `isActingReady` before fetching

### Broken Pages (confirmed by code audit)

| Page file | Symptom |
|---|---|
| `events/events-page-client.tsx` | Fetches `/api/admin/events` with no guard, no `actingHeaders` |
| `hooks/use-admin-calendar.ts` | Fetches `/api/admin/calendar` with no guard, no `actingHeaders` |
| `analytics/page.tsx` | Fetches without `actingHeaders`, no `isActingReady` guard |
| `logistics/logistics-page-client.tsx` | Uses `useMultiAccount` only; no `useActingContext` at all |
| `rbac/page.tsx` | Delegates to RBAC hooks that fetch without acting context |
| `contracts/page.tsx` | Pure static mount of child panels; those panels fetch without context |

### Secondary Issues

- The context bar CTAs link to pages that themselves have no guard (circularity)
- `AdminActingContextBar` has no prompt to switch accounts — users must know to use the global
  top-nav `AccountSwitcher`; there is no in-dashboard CTA explaining this

---

## 2. Hard Constraints

| Constraint | Rule |
|---|---|
| No DB reset | `supabase db reset` is forbidden |
| Additive only | Never delete or rewrite working code |
| No mock data | Show explicit `unavailable` states — never fake counts |
| Design consistency | `AdminEmptyState`, card token `bg-slate-900/60 border border-slate-700/50 backdrop-blur-sm rounded-sm` |
| TS build stays clean | `NODE_OPTIONS='--max-old-space-size=8192' tsc --noEmit` must pass 0 errors after each sub-task |
| Ledger updates | Update this file's Status field + append to `.agents/admin-feature-spec-builder/TASK_LOG.md` after each task |
| No commits | Unless explicitly requested |

---

## 3. Correct Pattern to Follow

**Source: `app/admin/dashboard/tours/tours-page-client.tsx` line 113**

```tsx
// 1. Import the hook
import { useActingContext } from "@/hooks/use-acting-context"

// 2. Destructure at the top of the component
const { actingContextKey, actingHeaders, isActingReady } = useActingContext()

// 3. Guard every fetch
const fetchData = useCallback(async () => {
  if (!isActingReady) return           // ← guard
  // ...
  const response = await fetch(`/api/admin/...`, {
    credentials: "include",
    cache: "no-store",
    headers: { "Cache-Control": "no-cache", ...actingHeaders },  // ← spread headers
  })
}, [isActingReady, actingHeaders, /* other deps */])

// 4. Re-fetch when context changes
useEffect(() => {
  void fetchData()
}, [fetchData])

// 5. Render loading/empty state when not ready
if (!isActingReady) {
  return <AdminEmptyState
    icon={Building2}
    title="No organization selected"
    description="Select an organization from the account switcher in the top navigation to continue."
  />
}
```

---

## 4. Sub-Tasks

---

### U1 — Fix Events Page

- **Status:** `[ ] pending`
- **File:** `app/admin/dashboard/events/events-page-client.tsx`
- **Problem:** `buildNoStoreInit()` at line 54–59 does not include `actingHeaders`. `fetchEvents`
  at line 71 fires immediately with no guard. No `useActingContext` import.
- **Intent:** Add `useActingContext()` destructure, guard `fetchEvents` on `isActingReady`, spread
  `actingHeaders` into fetch init, add `actingContextKey` to dependency array so data re-fetches
  on context switch, and add a no-org empty state.
- **Acceptance Criteria:**
  - `[ ]` `useActingContext` imported from `@/hooks/use-acting-context`
  - `[ ]` `const { actingContextKey, actingHeaders, isActingReady } = useActingContext()` added
  - `[ ]` `fetchEvents` callback guards on `if (!isActingReady) return` before any `fetch()`
  - `[ ]` `fetch(...)` headers spread `...actingHeaders`
  - `[ ]` `fetchEvents` dependency array includes `isActingReady` and `actingHeaders`
  - `[ ]` `useEffect` depends on `actingContextKey` so data re-fetches when org switches
  - `[ ]` When `!isActingReady`, component renders `AdminEmptyState` with `Building2` icon,
    `"No organization selected"` title, and `"Select an organization to view events."` description
  - `[ ]` `buildNoStoreInit` function either removed (if unused after change) or extended — do
    not leave a dead unused helper
  - `[ ]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/admin/dashboard/events/events-page-client.tsx` in full to understand all fetch
     call sites and `buildNoStoreInit` usage
  2. Add `useActingContext` import and destructure
  3. Add `isActingReady` guard to `fetchEvents` + add `actingHeaders` to the fetch init
  4. Add `actingContextKey` to the outer `useEffect` dependency for auto-refetch on context switch
  5. Add no-org empty state render before the main return
  6. Run `tsc --noEmit`
  7. Mark U1 `[x] done`, append log entry
- **Key files:**
  - `app/admin/dashboard/events/events-page-client.tsx` — target
  - `app/admin/dashboard/tours/tours-page-client.tsx` lines 110–130 — correct pattern reference

---

### U2 — Fix Calendar Hook

- **Status:** `[ ] pending`
- **File:** `hooks/use-admin-calendar.ts`
- **Problem:** `useAdminCalendar` at line 88–90 calls `fetch('/api/admin/calendar?...')` with no
  `actingHeaders` and no `isActingReady` guard. The hook exposes an `enabled` prop but has no
  concept of acting context readiness.
- **Intent:** Add `useActingContext()` to the hook; add `actingHeaders` to the fetch init; gate the
  fetch on `isActingReady && enabled`; expose `isActingReady` as part of the return value so
  callers can render an appropriate empty state.
- **Acceptance Criteria:**
  - `[ ]` `useActingContext` imported and destructured inside `useAdminCalendar`
  - `[ ]` `fetch('/api/admin/calendar...')` init spreads `actingHeaders` in its `headers` object
  - `[ ]` `refetch` early-returns when `!isActingReady || !enabled`
  - `[ ]` `actingContextKey` added to `refetch`'s `useCallback` dependency array so data
    automatically re-fetches when the org switches
  - `[ ]` `UseAdminCalendarResult` interface gains `isActingReady: boolean` field
  - `[ ]` `isActingReady` included in the hook's return object
  - `[ ]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `hooks/use-admin-calendar.ts` full file (already read — 145 lines)
  2. Read `components/admin/admin-calendar-view.tsx` lines 1–50 to understand how the hook is
     consumed so the new `isActingReady` return value can be used downstream
  3. Apply changes to `hooks/use-admin-calendar.ts`
  4. Add no-org empty state handling in `components/admin/admin-calendar-view.tsx` using the new
     `isActingReady` from the hook
  5. Run `tsc --noEmit`
  6. Mark U2 `[x] done`, append log entry
- **Key files:**
  - `hooks/use-admin-calendar.ts` — target (145 lines)
  - `components/admin/admin-calendar-view.tsx` — consumer, needs empty-state guard
  - `app/admin/dashboard/calendar/calendar-page-client.tsx` — thin wrapper (12 lines, no change needed)

---

### U3 — Fix Analytics Page

- **Status:** `[ ] pending`
- **File:** `app/admin/dashboard/analytics/page.tsx`
- **Problem:** No `useActingContext` import; multiple fetch calls (confirmed: to
  `/api/admin/analytics/...` routes) fire without `actingHeaders` or `isActingReady` guard. Also
  directly imports `supabase` client at line 4 and queries directly (bypasses org context).
- **Intent:** Add `useActingContext()`, guard all fetch calls, spread `actingHeaders`, remove or
  replace the direct Supabase client import with the acting-context-aware API pattern, add no-org
  empty state.
- **Acceptance Criteria:**
  - `[ ]` `useActingContext` imported and destructured
  - `[ ]` Direct `supabase` client import at line 4 removed — all data fetched through API routes
    instead (if any Supabase-direct queries exist, replace them with the appropriate
    `/api/admin/...` call)
  - `[ ]` All `fetch()` calls in the component guard on `isActingReady` and spread `actingHeaders`
  - `[ ]` `actingContextKey` in `useEffect` dependency arrays so data refreshes on org switch
  - `[ ]` When `!isActingReady`, renders `AdminEmptyState` with appropriate message
  - `[ ]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/admin/dashboard/analytics/page.tsx` in full (the file is large — read in chunks:
     lines 1–150, then 150–300, etc.) to locate every `fetch()` and every direct `supabase` call
  2. Check if supabase-direct queries can be replaced with existing API routes; if not, note them
     as out-of-scope and leave with a comment
  3. Apply `useActingContext` + guard + headers pattern to all API `fetch()` calls
  4. Add no-org empty state
  5. Run `tsc --noEmit`
  6. Mark U3 `[x] done`, append log entry
- **Key files:**
  - `app/admin/dashboard/analytics/page.tsx` — target (large file)
  - `app/api/admin/analytics/freshness/route.ts` — existing API to reuse

---

### U4 — Fix Logistics Page

- **Status:** `[ ] pending`
- **File:** `app/admin/dashboard/logistics/logistics-page-client.tsx`
- **Problem:** Uses `useMultiAccount` (line 38) for context but not `useActingContext`. The
  sub-hooks `useLogistics`, `useLodging`, `useTravelCoordination`, `useRentalAgreements` etc.
  likely fetch without acting headers.
- **Intent:** Verify which sub-hooks fire API calls and whether they pass `actingHeaders`. Add
  `useActingContext` to the page component; gate the initial render on `isActingReady`; thread
  `actingHeaders`/`isActingReady` into hooks that accept them. Add no-org empty state.
- **Acceptance Criteria:**
  - `[ ]` `useActingContext` imported and destructured in `logistics-page-client.tsx`
  - `[ ]` When `!isActingReady`, page renders `AdminEmptyState` before mounting any sub-components
    that trigger fetches
  - `[ ]` Any direct `fetch()` calls in the page component guard on `isActingReady` and spread
    `actingHeaders`
  - `[ ]` `useLogistics` hook (and other sub-hooks that accept context params) receive
    `isActingReady` / `actingHeaders` if their interface supports it; otherwise the guard at the
    page level prevents them mounting
  - `[ ]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/admin/dashboard/logistics/logistics-page-client.tsx` in full (it is large — read
     in sections)
  2. Read `hooks/use-logistics.ts` lines 1–60 to understand if it accepts acting context params
  3. Read `hooks/use-lodging.ts` lines 1–30 for the same
  4. Determine the minimal fix: a guard at the page component level preventing mounting of all
     sub-components until `isActingReady` is the simplest approach (no changes needed to hooks)
  5. Apply `useActingContext` + early return empty state at page level
  6. Run `tsc --noEmit`
  7. Mark U4 `[x] done`, append log entry
- **Key files:**
  - `app/admin/dashboard/logistics/logistics-page-client.tsx` — target
  - `hooks/use-logistics.ts` — check interface
  - `hooks/use-lodging.ts` — check interface

---

### U5 — Fix RBAC Page

- **Status:** `[ ] pending`
- **File:** `app/admin/dashboard/rbac/page.tsx`
- **Problem:** Page uses `useRoleManagement` and `useRolesAndPermissions` from `@/hooks/use-rbac`
  (line 18–20) but no `useActingContext`. Those RBAC hooks likely fetch without acting context.
- **Intent:** Add `useActingContext()` to the page; render a no-org empty state before any RBAC
  content when `!isActingReady`; thread `actingHeaders` into the RBAC hooks or guard them at the
  page level.
- **Acceptance Criteria:**
  - `[ ]` `useActingContext` imported and destructured in `rbac/page.tsx`
  - `[ ]` When `!isActingReady`, page renders `AdminEmptyState` with `Shield` icon,
    `"No organization selected"` title
  - `[ ]` RBAC hooks only receive context when `isActingReady` is true (either via prop or via
    conditional mounting of sub-components)
  - `[ ]` No breaking changes to the existing RBAC tab structure
  - `[ ]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/admin/dashboard/rbac/page.tsx` in full (beyond the first 80 lines) to understand
     which hooks are called at top level vs. inside tab panels
  2. Read `hooks/use-rbac.ts` lines 1–60 to understand `useRoleManagement` and
     `useRolesAndPermissions` — do they accept context params?
  3. Apply minimal fix: guard at page level with empty state; conditionally render RBAC content
     only when `isActingReady`
  4. Run `tsc --noEmit`
  5. Mark U5 `[x] done`, append log entry
- **Key files:**
  - `app/admin/dashboard/rbac/page.tsx` — target
  - `hooks/use-rbac.ts` — check interface for acting context params

---

### U6 — Fix Contracts Page Child Panels

- **Status:** `[ ] pending`
- **File:** `app/admin/dashboard/contracts/page.tsx` + child panels
- **Problem:** `contracts/page.tsx` mounts `<VendorMasterPanel>`, `<ContractWorkspacePanel>`,
  `<ObligationsPanel>` directly. These panels internally fetch data; check whether they use
  `useActingContext` or not.
- **Intent:** Check the three child panels. If any panel is missing the acting context guard,
  add `useActingContext` to that panel and apply the guard pattern. If all panels already have it,
  add a guard at the page level as a cheap safety net.
- **Acceptance Criteria:**
  - `[ ]` `VendorMasterPanel`, `ContractWorkspacePanel`, `ObligationsPanel` are each audited
  - `[ ]` Any panel missing `useActingContext` / `isActingReady` guard has it added
  - `[ ]` The page-level component (`contracts/page.tsx`) also gets a top-level guard that renders
    `AdminEmptyState` when `!isActingReady` before mounting any panels
  - `[ ]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `components/admin/vendors/vendor-master-panel.tsx` lines 1–60
  2. Read `components/admin/vendors/contract-workspace-panel.tsx` lines 1–60
  3. Read `components/admin/vendors/obligations-panel.tsx` lines 1–60
  4. Apply guards to any panel missing them; add page-level guard to `contracts/page.tsx`
  5. Run `tsc --noEmit`
  6. Mark U6 `[x] done`, append log entry
- **Key files:**
  - `app/admin/dashboard/contracts/page.tsx` — page-level guard
  - `components/admin/vendors/vendor-master-panel.tsx` — audit
  - `components/admin/vendors/contract-workspace-panel.tsx` — audit
  - `components/admin/vendors/obligations-panel.tsx` — audit

---

### U7 — Upgrade AdminActingContextBar: Add Account Switch Prompt

- **Status:** `[ ] pending`
- **File:** `app/admin/dashboard/components/admin-acting-context-bar.tsx`
- **Problem:** When `!isActingReady && !actingAccount`, the bar shows `"No organization selected"`
  but offers no explanation of *how* to select one. The account switcher lives in the global top
  nav (`components/nav.tsx`) — users who don't know this are stuck.
- **Intent:** When `!actingAccount` (no org selected), add a small helper line under the org label
  explaining where to find the switcher, and optionally surface a direct link to the accounts
  list. Keep the existing `"Manage organization"` and `"Roles & access"` CTAs unchanged.
- **Acceptance Criteria:**
  - `[ ]` When `!actingAccount`, an explanatory line renders below the `"No organization selected"`
    label: `"Use the account switcher in the top navigation to select an organization."` as a
    `text-xs text-slate-400` paragraph
  - `[ ]` The existing badge, CTA buttons, and layout are unchanged when an account IS selected
  - `[ ]` No new dependencies — all logic derived from `actingAccount` already in scope
  - `[ ]` TypeScript build passes 0 errors
- **Todo:**
  1. Read `app/admin/dashboard/components/admin-acting-context-bar.tsx` full file (already read —
     69 lines)
  2. Add the conditional `<p>` hint below the label `<div>` block (lines 36–39) when `!actingAccount`
  3. Run `tsc --noEmit`
  4. Mark U7 `[x] done`, append log entry
- **Key files:**
  - `app/admin/dashboard/components/admin-acting-context-bar.tsx` — target (69 lines)

---

### U8 — Final Verification

- **Status:** `[ ] pending`
- **Intent:** Run a full TypeScript build, confirm all 6 affected pages now have the guard pattern,
  and update all ledgers.
- **Acceptance Criteria:**
  - `[ ]` `NODE_OPTIONS='--max-old-space-size=8192' tsc --noEmit` passes 0 errors
  - `[ ]` All 6 broken pages (events, calendar, analytics, logistics, rbac, contracts) have
    `isActingReady` guards and `actingHeaders` spreads
  - `[ ]` `AdminActingContextBar` shows the account-switch hint when no org is selected
  - `[ ]` No new `TODO` comments or mock data left in shipped code
  - `[ ]` All sub-task statuses in this plan are `[x] done`
  - `[ ]` `.agents/admin-feature-spec-builder/TASK_LOG.md` has an entry for every U1–U8 sub-task
- **Todo:**
  1. Run `NODE_OPTIONS='--max-old-space-size=8192' tsc --noEmit`
  2. Fix any remaining type errors
  3. Spot-check each fixed page in dev mode: load without org selected → should show empty state;
     select org → should load data correctly
  4. Mark all statuses `[x] done`
  5. Append final summary entry to `.agents/admin-feature-spec-builder/TASK_LOG.md`

---

## 5. Files Changed

| File | Change | Task |
|---|---|---|
| `app/admin/dashboard/events/events-page-client.tsx` | Add `useActingContext` guard + `actingHeaders` | U1 |
| `hooks/use-admin-calendar.ts` | Add `useActingContext` guard + `actingHeaders`, expose `isActingReady` | U2 |
| `components/admin/admin-calendar-view.tsx` | Add no-org empty state using hook's `isActingReady` | U2 |
| `app/admin/dashboard/analytics/page.tsx` | Add `useActingContext` guard + `actingHeaders`, remove direct supabase import | U3 |
| `app/admin/dashboard/logistics/logistics-page-client.tsx` | Add `useActingContext` guard + page-level empty state | U4 |
| `app/admin/dashboard/rbac/page.tsx` | Add `useActingContext` guard + page-level empty state | U5 |
| `app/admin/dashboard/contracts/page.tsx` | Add `useActingContext` guard | U6 |
| `components/admin/vendors/vendor-master-panel.tsx` | Add guard if missing (TBD audit in U6) | U6 |
| `components/admin/vendors/contract-workspace-panel.tsx` | Add guard if missing (TBD audit in U6) | U6 |
| `components/admin/vendors/obligations-panel.tsx` | Add guard if missing (TBD audit in U6) | U6 |
| `app/admin/dashboard/components/admin-acting-context-bar.tsx` | Add account-switch hint when no org | U7 |

---

## 6. Files NOT Changed (already correct)

| File | Reason |
|---|---|
| `app/admin/dashboard/tours/tours-page-client.tsx` | ✅ Already has guard at line 113 |
| `app/admin/dashboard/finances/page.tsx` | ✅ Already has guard |
| `app/admin/dashboard/ticketing/page.tsx` | ✅ Already has guard |
| `app/admin/dashboard/features/page.tsx` | ✅ Already has guard |
| `app/admin/dashboard/events/create/page.tsx` | ✅ Already has guard |
| `app/admin/dashboard/tours/builder/page.tsx` | ✅ Already has guard |
| `app/admin/dashboard/tours/[id]/page.tsx` | ✅ Already has guard |
| `app/admin/dashboard/hiring/page.tsx` | ✅ Server-side `resolveAdminWorkforceEmployer` guard |
| `app/admin/dashboard/hiring/roster/page.tsx` | ✅ Server-side guard |
| `app/admin/dashboard/organization/page.tsx` | ✅ Uses acting context (org profile hub) |

---

## 7. Empty State Design

All `!isActingReady` states use:

```tsx
import { AdminEmptyState } from "../components/admin-empty-state"
import { Building2 } from "lucide-react"

if (!isActingReady) {
  return (
    <AdminEmptyState
      icon={Building2}
      title="No organization selected"
      description="Select an organization from the account switcher in the top navigation to continue."
    />
  )
}
```

---

## 8. Completion Checklist

- `[ ]` U1 — Events page guard
- `[ ]` U2 — Calendar hook guard + headers
- `[ ]` U3 — Analytics page guard
- `[ ]` U4 — Logistics page guard
- `[ ]` U5 — RBAC page guard
- `[ ]` U6 — Contracts page + vendor panels guard
- `[ ]` U7 — Context bar account-switch hint
- `[ ]` U8 — Final verification + ledger sync
