# Plan: Debug "Create & Open Builder" Sitemap Flow

## Top-Level Overview

Users cannot successfully open the sitemap builder after clicking "Create & open builder" on either:
1. **Logistics tab** (`/admin/dashboard/logistics?tab=site-maps`) — SiteMapManager embedded directly
2. **Event / Logistics tab** (`/admin/dashboard/events/[id]`) — EventSiteMapTab component

Both entry points share the same underlying `SiteMapManager` component but fail to transition the user into the `SiteMapEditor` after sitemap creation.

Two distinct bugs are responsible:

**Bug A** — In `SiteMapManager`, the `selectedSiteMap` memo resolves `null` when `openSiteMap()` is called because React batches state updates asynchronously. The 400ms loading overlay timer fires and clears before the memo re-evaluates with the newly upserted sitemap, so the editor never mounts.

**Bug B** — In `EventSiteMapTab`, the "Create Site Map" button uses a full `window.location.href` redirect to the logistics page instead of calling `setShowBuilder(true)` to enable the inline `SiteMapManager`.

---

## Sub-Tasks

---

### Sub-Task 1 — Fix race condition in `SiteMapManager.openSiteMap()`

**Intent**  
Prevent the 400ms loading overlay from dismissing before `selectedSiteMap` has resolved. Currently `openSiteMap()` sets a hard timeout that clears `openingBuilder` regardless of whether the sitemap has appeared in state. The fix should tie the overlay dismissal to actual state convergence rather than an arbitrary timer.

**Root Cause (confirmed)**  
- `upsertSiteMap(data.data)` calls `setSiteMaps(...)` (async React state update)
- `openSiteMap(data.data.id)` is called immediately after — it sets `selectedMapId` and starts a 400ms timer
- `selectedSiteMap` is a `useMemo(() => siteMaps.find(id === selectedMapId))` — this cannot resolve until React re-renders with the new `siteMaps` array committed
- If the 400ms timer fires before that re-render, `openingBuilder` becomes `false` and `selectedSiteMap` is still `null`, so neither the overlay nor the editor shows

**Expected Outcomes**
- After `handleCreateSiteMap` succeeds, the `SiteMapEditor` mounts and is visible to the user
- The loading overlay disappears only after `selectedSiteMap` is truthy (i.e., the newly created map is in state)
- No arbitrary timeout drives UI visibility

**Todo List**
1. In `openSiteMap()` (`site-map-manager.tsx` line 93–99): remove the `window.setTimeout` that clears `openingBuilder`
2. Add a `useEffect` that watches `selectedSiteMap` — when it becomes truthy AND `openingBuilder` is true, set `openingBuilder = false`
3. Verify the overlay still appears briefly during the transition (it will, because `openingBuilder` starts `true` and `selectedSiteMap` starts `null`)
4. Confirm the editor mounts once `selectedSiteMap` resolves

**Relevant Context**
- `components/admin/logistics/site-map/site-map-manager.tsx` — `openSiteMap()` (line 93), `selectedSiteMap` memo (line 49), `openingBuilder` state (line 41), overlay render (line 613), editor render (line 620)
- `hooks/use-site-maps.ts` — `upsertSiteMap` (line 85), `setSiteMaps` (line 88)

**Status** — `[x] done`

---

### Sub-Task 2 — Fix `EventSiteMapTab` "Create Site Map" button

**Intent**  
The "Create Site Map" button in `EventSiteMapTab` does a full-page `window.location.href` redirect to the logistics page instead of transitioning the user into the inline `SiteMapManager` on the event page. This is the wrong flow — users should stay on the event page and the inline builder should open.

**Root Cause (confirmed)**  
- `app/admin/dashboard/events/[id]/components/event-site-map-tab.tsx` line 98: `onClick={() => { window.location.href = \`/admin/dashboard/logistics?tab=site-maps&eventId=${eventId}\` }}`
- The component already has a `showBuilder` state and a `<SiteMapManager>` mounted when `showBuilder || hasMaps` is true — the button just needs to call `setShowBuilder(true)` to reveal it inline
- The same full-redirect also exists at line 72 for the "Open Builder" button (when maps already exist)

**Expected Outcomes**
- Clicking "Create Site Map" on the event page opens the inline `SiteMapManager` on the same page (sets `showBuilder = true`)
- User stays on the event page, not redirected to the logistics page
- The "Open Builder" button (line 72, shown when maps exist and `!showBuilder`) also transitions inline instead of redirecting

**Todo List**
1. In `event-site-map-tab.tsx` line 98: replace `window.location.href = ...` with `setShowBuilder(true)`
2. In `event-site-map-tab.tsx` line 72: replace `window.location.href = ...` with `setShowBuilder(true)` (this button is shown when maps exist but builder is not yet open)
3. Verify `<SiteMapManager>` receives the correct `eventId` and `compact` props when `showBuilder` becomes true

**Relevant Context**
- `app/admin/dashboard/events/[id]/components/event-site-map-tab.tsx` — `showBuilder` state (line 29), "Create Site Map" button (line 97–103), "Open Builder" button (line 69–77), `SiteMapManager` mount (line 80)

**Status** — `[x] done`

---

### Sub-Task 3 — Verify end-to-end flow after fixes

**Intent**  
Confirm both flows work correctly after the fixes are applied. This is a manual verification checklist, not code changes.

**Expected Outcomes**
- Logistics tab: user creates a sitemap → builder opens inline without redirect
- Event/Logistics tab: user clicks "Create Site Map" → stays on event page → builder opens inline → sitemap creation → editor mounts

**Todo List**
1. Test "Create & open builder" from the Logistics tab (`/admin/dashboard/logistics?tab=site-maps`)
2. Test "Create Site Map" from an event's site map tab that has NO existing maps
3. Test "Open Builder" from an event's site map tab that HAS existing maps
4. Confirm the 400ms race condition is resolved — editor mounts immediately after creation
5. Confirm no console errors during the create + open flow

**Relevant Context**
- All changes are in the two files modified by Sub-Tasks 1 and 2

**Status** — `[x] done`
