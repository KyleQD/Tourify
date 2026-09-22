# Tour Creation UX Overhaul — Plan

## Top-Level Overview

**Goal:** Streamline the tour and event creation user flow, make the Tour Builder's Events tab a fully functional event-creation workspace (not just a search drawer), remove the Route tab from the Tour Builder, and elevate the visual design of both builders to match the existing futuristic/sleek glassmorphic platform aesthetic already established in `artistEventUI` and `BuilderShell`.

**Scope:**
1. Remove the "Route" tab from the Tour Builder's Plan-mode nav.
2. Upgrade the "Events" tab in the Tour Builder from a simple attach-only search drawer into a dual-mode panel that lets the user **create** new events directly inside the builder (using the existing `ArtistEventProducerFormState` + `/api/admin/tours/[id]/events` POST endpoint) and **also** attach existing events — with every created event automatically linked to the tour.
3. Apply consistent design tokens from `artistEventUI` to the Tour Builder's `Panel`, `Field`, `TourHandoffPanel` local components and the `BuilderShell` primitives, closing gaps between the builder shells.
4. Refine the `BuilderShell` header, section nav, and bottom bar to eliminate inconsistencies between the Tour Builder and Event Producer.

**Non-goals / constraints:**
- Do not reset or migrate the database. All changes are frontend + API orchestration only.
- Do not rewrite the autosave logic, plan versioning, or reconcile-preview flow.
- Do not change existing API contracts — use only existing endpoints.
- Build additively on top of the current file structure.

---

## Architecture Diagram (mental model)

Tour Builder Events Tab (before):
  [Attach existing events only via EntitySearchDrawer]

Tour Builder Events Tab (after):
  [Tab: Create New Event] ← inline mini-form using ArtistEventProducerFormState
                         → POST /api/admin/tours/:id/events (creates & attaches in one step)
  [Tab: Attach Existing] ← existing EntitySearchDrawer (unchanged logic)

---

## Sub-Tasks (Phase 1 — COMPLETE)

All five original sub-tasks were completed in the prior session:

### Sub-Task 1 — Remove Route Tab from Tour Builder
**Status:** [x] done

### Sub-Task 2 — Upgrade the Events Tab: Inline Event Creation
**Status:** [x] done

### Sub-Task 3 — Visual Design Consistency: Tour Builder Panels and Fields
**Status:** [x] done

### Sub-Task 4 — BuilderShell Design Polish
**Status:** [x] done

### Sub-Task 5 — UX Flow Polish: Overview Tab and Summary Bar
**Status:** [x] done

---

## Phase 2 Sub-Tasks (Continuation)

The previous session left several items incomplete or newly discovered. This phase addresses them.

---

### Sub-Task 6 — Dead Code Cleanup: Remove Unused `TourFormState` and `initialTourForm` [x] done

**Intent:** The builder file at `app/admin/dashboard/tours/builder/page.tsx` still contains a locally-defined `TourFormState` interface (lines 81–110) and `initialTourForm` constant (lines 112–141) that are completely unused — the builder correctly uses `TourBuilderFormState` and `initialTourBuilderForm` from `lib/admin/tour-builder.ts`. Removing these eliminates confusion and dead code.

**Expected Outcomes:**
- `interface TourFormState { … }` (lines 81–110) is deleted.
- `const initialTourForm: TourFormState = { … }` (lines 112–141) is deleted.
- No other code references either symbol (confirmed by grep).
- TypeScript still compiles cleanly.

**Todo List:**
1. Delete lines 81–141 (the `TourFormState` interface and `initialTourForm` constant) from `app/admin/dashboard/tours/builder/page.tsx`.
2. Verify no remaining references to `TourFormState` or `initialTourForm`.

**Relevant Context:**
- File: [`app/admin/dashboard/tours/builder/page.tsx`](app/admin/dashboard/tours/builder/page.tsx), lines 81–141.
- `TourBuilderFormState` and `initialTourBuilderForm` (the replacements already in use) live in [`lib/admin/tour-builder.ts`](lib/admin/tour-builder.ts).

**Status:** [x] done

---

### Sub-Task 7 — Event Tab: "Created Events" List — Add Link to Edit Full Event

**Intent:** After an inline event is created in the Events tab, the user sees a "Created this session" list of emerald-badged cards. Each card currently shows only the name, date, and venue — but has no way to navigate to the full event edit page. Adding a chevron-right link (opens the event's admin hub page) closes this workflow gap: user creates the event inline, then clicks through to fill in the full details.

**Expected Outcomes:**
- Each card in `createdEvents` list has a small "Open" action button/link that navigates to `/admin/dashboard/events/${ev.id}`.
- The link opens in the same tab (no `target="_blank"`).
- Styling: small `ExternalLink` or `ArrowRight` icon, `text-cyan-300 hover:text-white`, consistent with `artistEventUI.interactive`.

**Todo List:**
1. In `app/admin/dashboard/tours/builder/page.tsx`, in the `createdEvents.map()` JSX block (lines 905–915), add a small `<a>` or `<button onClick={() => router.push(...)}` that navigates to `/admin/dashboard/events/${ev.id}`.
2. Import `ArrowRight` from `lucide-react` if not already imported.
3. Style the link using `artistEventUI` hover tokens.

**Relevant Context:**
- File: [`app/admin/dashboard/tours/builder/page.tsx`](app/admin/dashboard/tours/builder/page.tsx), lines 905–915.
- `router` is already available in scope.

**Status:** [x] done

---

### Sub-Task 8 — Tour Builder Review Panel: Apply `artistEventUI.inset` to Review Cards

**Intent:** The Review section at `activeSection === "review"` (lines 1180–1194) uses hard-coded `rounded-md border-slate-800 bg-slate-950/60 p-4` on each readiness card. This does not match `artistEventUI.inset` (`rounded-xl border-slate-800/80 bg-slate-950/55`) already applied elsewhere in the builder. A one-line class update creates visual consistency.

**Expected Outcomes:**
- Each readiness card in the Review tab uses `rounded-xl border-slate-800/80 bg-slate-950/55 p-4` instead of `rounded-md border-slate-800 bg-slate-950/60 p-4`.

**Todo List:**
1. In `app/admin/dashboard/tours/builder/page.tsx` lines 1184, update the class on the review card `div` to `cn(artistEventUI.inset, "p-4")`.

**Relevant Context:**
- File: [`app/admin/dashboard/tours/builder/page.tsx`](app/admin/dashboard/tours/builder/page.tsx), line 1184.
- Token: `artistEventUI.inset = "rounded-xl border border-slate-800/80 bg-slate-950/55"` from [`components/events/artist-event-ui.ts`](components/events/artist-event-ui.ts).

**Status:** [x] done

---

### Sub-Task 9 — TourHandoffPanel: Show Tour-Specific Links Only When Tour Exists

**Intent:** The `TourHandoffPanel` at the bottom of the sidebar always shows links to Logistics, Finance, Comms etc. However, when `tourId` is null (new unsaved tour), the Logistics link points to a broken URL because `buildAdminLogisticsHref({ tourId: null })` will produce a generic fallback path. The panel should be hidden (or show a "Save the tour to unlock these links" message) when there's no `tourId`.

**Expected Outcomes:**
- When `tourId` is null, `TourHandoffPanel` renders a small faded placeholder: "Save the draft to unlock hub links."
- When `tourId` is set, shows the full 5-link grid as-is.
- Styling of the placeholder uses `artistEventUI.muted` (small, slate-400 text).

**Todo List:**
1. In `TourHandoffPanel` (lines 1266–1291), wrap the link grid in a conditional: if `!tourId`, render a small placeholder paragraph instead.
2. Use `<p className={cn(artistEventUI.muted, "text-center text-xs py-2")}>Save the draft to unlock hub links.</p>` as the placeholder.

**Relevant Context:**
- File: [`app/admin/dashboard/tours/builder/page.tsx`](app/admin/dashboard/tours/builder/page.tsx), lines 1266–1291.
- `buildAdminLogisticsHref` is imported from [`lib/admin/admin-ops-context`](lib/admin/admin-ops-context.ts).

**Status:** [x] done

---

### Sub-Task 10 — Events Tab: "Attach existing" Panel Header Consistency

**Intent:** When `inlineEventMode === "attach"`, the `EntitySearchDrawer` renders with a plain label (`"Attach existing events"`). The "Create new" mode has a sub-header (`"New event"`) and description text. For visual symmetry, the attach mode should have a brief description line explaining what it does.

**Expected Outcomes:**
- Below the mode toggle (when in "attach" mode), a brief `<p className="text-xs text-slate-400">` reads: "Find and attach events that already exist in your organization."
- Styling matches the create mode's description text exactly.

**Todo List:**
1. In `app/admin/dashboard/tours/builder/page.tsx`, in the `inlineEventMode === "attach"` block (around line 1031), add a description `<p>` before the `EntitySearchDrawer`.

**Relevant Context:**
- File: [`app/admin/dashboard/tours/builder/page.tsx`](app/admin/dashboard/tours/builder/page.tsx), line 1031.

**Status:** [x] done

---

### Sub-Task 11 — Tour Builder: `panel` class in main content wrapper (BuilderShell)

**Intent:** The main content area of `BuilderShell` (in primitives) wraps `children` in a `rounded-[1.35rem] border border-slate-700/60 bg-slate-950/65 p-4 shadow-xl shadow-slate-950/30 backdrop-blur-xl sm:p-5` div (line 161 of primitives). Meanwhile, `Panel` local component in the tour builder adds another `artistEventUI.panelPadded` wrapper on top — resulting in a doubled-border glass effect. The Panel's outer wrapper should be borderless since the shell already provides the container. Only a minor class adjustment is needed to the local `Panel` component to remove the duplicate border/background.

**Expected Outcomes:**
- `Panel` function in the tour builder uses `"w-full"` (no border/background) as its outer `<section>` wrapper, since `BuilderShell` already wraps `children` in the glass container.
- The icon well and heading remain as-is.
- Visual result: one consistent glass panel, not nested glass-in-glass.

**Todo List:**
1. In `app/admin/dashboard/tours/builder/page.tsx`, in the `Panel` component (line 1294–1308), change the `<section>` className from `cn(artistEventUI.panelPadded)` to `"w-full"`.

**Relevant Context:**
- File: [`app/admin/dashboard/tours/builder/page.tsx`](app/admin/dashboard/tours/builder/page.tsx), lines 1294–1308.
- [`components/admin/operations-builder/primitives.tsx`](components/admin/operations-builder/primitives.tsx), line 161 — the shell's inner `main` wrapper already provides the panel frame.

**Status:** [x] done

---

## Implementation Order (Phase 2)

Process sub-tasks in this order:
1. **ST6** (Dead code cleanup) — zero risk, immediate
2. **ST11** (Panel double-border) — purely visual, changes one class
3. **ST8** (Review cards token) — one-liner visual fix
4. **ST9** (TourHandoffPanel null-tourId) — simple conditional render
5. **ST10** (Attach mode description) — single line addition
6. **ST7** (Created events link to edit) — adds navigation feature, slightly more involved

## Database

**Migration already applied:** `migrations/add_event_version_to_events_v2.sql` — `event_version integer NOT NULL DEFAULT 1` is confirmed present in `events_v2`. No further SQL required.

## No Further Database Changes Required

All Phase 2 work is frontend-only.
