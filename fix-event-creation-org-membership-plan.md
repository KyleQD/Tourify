# Fix: Admin Event Creation — "No organization membership" Error

## Top-Level Overview

**Goal:** Fix the "Could not save event / No organization membership is available for this account" error that occurs when admin users try to create events.

**Root cause (confirmed):** The admin event creation page (`app/admin/dashboard/events/create/page.tsx`) calls `POST /api/admin/events` **without the required acting-context headers** (`x-acting-profile-id`, `x-acting-account-type`, `x-acting-org-id`). Every other admin page in the app uses the `useActingContext()` hook and spreads `actingHeaders` into its fetch calls. This one page was never wired up.

**Auth flow (background):**
```
POST /api/admin/events
  → withAdminCapability("event.manage")         [lib/auth/api-auth.ts]
    → resolveActingAdminContext(request, auth)   [lib/auth/admin-context.ts]
      1. Checks x-acting-profile-id header     ← if missing, falls through
      2. Checks user_sessions table            ← if no persisted session, falls through
      3. Queries org_members for the user      ← if empty, 403 "No organization membership"
```

Without the headers the middleware tries the `org_members` fallback. If the user's `organizer_account` is not yet linked to an `org_members` row the request fails at the boundary.

**Approach:** Non-destructive. Wire `useActingContext()` into the event creation page exactly as every other admin page does it. No database changes, no schema changes, no data migration.

**Non-goals:**
- Do not alter the server-side auth middleware.
- Do not reset or modify any database rows.
- Do not change the form's logic, validation, or layout.
- Do not refactor unrelated code.

---

## Sub-Tasks

### Sub-task 1 — Wire acting-context headers into the event creation fetch calls

**Status:** `[x] done`

**Intent:**
The event creation page makes two fetch calls without acting headers:
1. `GET /api/admin/events/${id}` — loads a draft on page hydration (line ~240)
2. `POST /api/admin/events` / `PATCH /api/admin/events/${eventId}` — saves the event (line ~493)

Both calls need the acting headers so the server can resolve the org context. The same hook (`useActingContext`) and the same spread pattern (`...actingHeaders`) used across all other admin pages must be applied here.

**Expected Outcomes:**
- The event creation page imports and calls `useActingContext()`.
- Both fetch calls spread `actingHeaders` into their `headers` object.
- An `isActingReady` guard prevents the save from firing before the acting context is resolved (matching the pattern in tours/builder/page.tsx and tours-page-client.tsx).
- No other logic, layout, or validation changes.

**Todo List:**
1. Add `import { useActingContext } from "@/hooks/use-acting-context"` to the imports section of `app/admin/dashboard/events/create/page.tsx`.
2. Destructure `actingHeaders` and `isActingReady` from `useActingContext()` inside the component body.
3. In the draft-hydration `fetch` (line ~240), spread `...actingHeaders` into the `headers` object alongside the existing headers.
4. In the `persistEvent` `fetch` (line ~493–497), spread `...actingHeaders` into the `headers` object alongside `"Content-Type": "application/json"`.
5. Optionally guard the save button / autosave trigger so it waits for `isActingReady` (prevents a race on initial page load where acting context hasn't resolved yet), consistent with the pattern in other builders.

**Relevant Context:**
- File to change: `app/admin/dashboard/events/create/page.tsx` lines 240, 493-498
- Reference implementation: `app/admin/dashboard/tours/builder/page.tsx` lines 63, 189-198 — imports hook, destructures `actingHeaders` + `isActingReady`, builds a `buildNoStoreInit` helper, spreads into fetch
- Hook: `hooks/use-acting-context.ts` — `actingHeaders` is a `Record<string, string>` ready to spread
- The `x-acting-org-id` header is included automatically by the hook when the current account is an organization type

---

## Additional Context for Implementation

- The fix is isolated to a single file.
- Only two `fetch()` calls in the file need to be updated.
- The acting headers carry: `x-acting-profile-id`, `x-acting-account-type`, `x-correlation-id`, and (when applicable) `x-acting-org-id`.
- When the server receives `x-acting-profile-id` it short-circuits the `org_members` fallback entirely (line 231-232 of `lib/auth/admin-context.ts`), which is the correct and reliable path.
- No Supabase migrations, no data changes, no other files need to change.
