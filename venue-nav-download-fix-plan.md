# Venue Nav — Page Download Bug Fix Plan

## Top-Level Overview

**Bug:** Clicking certain nav items in the venue operations shell causes the browser to treat the destination as a file download / redirect to a public venue profile page (`/venues/[segment]`) instead of navigating to the correct authenticated app page (`/venue/[segment]`).

**Root cause:** [`lib/venue/routing.ts`](lib/venue/routing.ts) — `getLegacyVenueProfileRedirect()` redirects any single-segment `/venue/[segment]` path that is **not** in the `VENUE_ACCOUNT_APP_SEGMENTS` allowlist to `/venues/[segment]`. This function runs in [`middleware.ts`](middleware.ts) on every request. Several legitimate venue app route segments are simply missing from the allowlist, so they get treated as legacy public profile slugs and hard-redirected.

**Missing segments (causing the bug):**
| Segment | Nav link | Incorrectly redirected to |
|---------|----------|--------------------------|
| `messages` | `/venue/messages` | `/venues/messages` |
| `overview` | `/venue/overview` | `/venues/overview` |
| `teams` | `/venue/teams` (exists as route) | `/venues/teams` |

**Why it looks like a "download":** When the browser hard-redirects to `/venues/messages` (which may not exist or returns a 404/non-HTML response), Chromium and Safari can interpret the response as a file and trigger a download dialog, especially if the URL path has no extension and the response type is ambiguous.

**Fix scope:** One file, three missing strings added to the Set. No logic changes required.

---

## Sub-Tasks

---

### Sub-Task 1 — Add missing segments to the routing allowlist

**Status**: `[ ] pending`

**Intent**
Add the three missing route segments to `VENUE_ACCOUNT_APP_SEGMENTS` in [`lib/venue/routing.ts`](lib/venue/routing.ts) so that `getLegacyVenueProfileRedirect()` correctly passes them through to the authenticated venue app instead of redirecting to the public venue directory.

**Expected Outcomes**
- Clicking "Messages" in the nav navigates to `/venue/messages` correctly
- Clicking "Profile" in the nav navigates to `/venue/overview` correctly
- `/venue/teams` routes through to the app page
- No other `/venue/*` routes are affected
- All existing public venue profile slug redirects (e.g. `/venue/the-fillmore` → `/venues/the-fillmore`) continue to work correctly

**Todo List**
1. Open [`lib/venue/routing.ts`](lib/venue/routing.ts)
2. Add `"messages"`, `"overview"`, and `"teams"` to the `VENUE_ACCOUNT_APP_SEGMENTS` Set
3. Do a full audit of all first-level directories under `app/venue/` and cross-check every one against the updated set — add any other missing segments found
4. Write a comment on the Set explaining the invariant: *every authenticated app segment under `/venue/` must be listed here; omitting one causes it to be treated as a public profile slug*
5. Verify the fix by tracing the logic: confirm `/venue/messages` → `match[1] = "messages"` → `VENUE_ACCOUNT_APP_SEGMENTS.has("messages") = true` → returns `null` (no redirect)

**Relevant Context**
- File: [`lib/venue/routing.ts`](lib/venue/routing.ts) — the `VENUE_ACCOUNT_APP_SEGMENTS` Set (lines 6–25) and `getLegacyVenueProfileRedirect` function (lines 27–32)
- Called from: [`middleware.ts`](middleware.ts) line 81 — runs on every request before auth checks
- Nav shell links: [`app/venue/components/operations/venue-operations-shell.tsx`](app/venue/components/operations/venue-operations-shell.tsx) — `buildNavGroups()` function defines all href values

---

### Sub-Task 2 — Add a safety lint guard

**Status**: `[ ] pending`

**Intent**
Add a comment-based invariant note to `VENUE_ACCOUNT_APP_SEGMENTS` so future developers know they must add new venue route segments here. This prevents the bug from silently reappearing when new venue pages are added.

**Expected Outcomes**
- The Set has a clear explanatory comment stating the invariant
- The comment links to the `getLegacyVenueProfileRedirect` usage so the consequence of omitting a segment is obvious

**Todo List**
1. Add a multi-line comment above `VENUE_ACCOUNT_APP_SEGMENTS` explaining: "Every first-level path segment of an authenticated venue app page must be listed here. Any segment NOT in this set will be treated as a public venue profile slug and redirected to /venues/[segment]."
2. Add inline note: "When adding a new app/venue/[segment]/ directory, add the segment name here."

**Relevant Context**
- File: [`lib/venue/routing.ts`](lib/venue/routing.ts) lines 6–25

---

## Out of Scope

- Changing the redirect logic itself — it is correct for its purpose (public profile slugs)
- Adding tests — out of scope for this targeted bug fix
- Investigating the "download" browser behaviour further — it is a symptom of the redirect, fixing the redirect eliminates it

---

## Priority

Fix is entirely in one file, ~3 lines of change. Sub-Task 1 is the complete fix. Sub-Task 2 is a one-minute follow-on.
