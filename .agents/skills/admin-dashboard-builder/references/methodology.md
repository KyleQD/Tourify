# Admin Builder — Deep Research & Sequential Thinking

Read this once per task before implementing.

## Research checklist

For the current inventory item:

1. **Page entry** — `page.tsx`, client wrappers, layouts under `app/admin/`.
2. **Mounted components** — every import that renders; note tabs, sheets, dialogs.
3. **APIs** — matching routes in `app/api/admin/**`; auth wrapper (`withAdminAuth` or equivalent); account/entity scope.
4. **Data hooks** — `hooks/`, `lib/admin/`, React Query / SWR / server loaders.
5. **Nav** — is it in `optimized-sidebar.tsx`? Orphan? Redirect?
6. **Duplicates** — parallel surfaces (e.g. `messages` vs `communications`, `jobs` vs `hiring`).
7. **Disconnected assets** — audit registry in `docs/architecture/admin-audit.md` (re-verify imports; status may be stale).
8. **Related platform** — non-admin apps/routes that organizers or staff already use; admin should deep-link or share data models.
9. **Phase plans** — relevant file under `.agents/plans/phase-*.md`.

Record findings briefly in sequential-thinking thoughts; do not paste huge dumps into `TASK_LOG.md`.

## Sequential-thinking protocol

Use the sequential-thinking MCP with enough thoughts to answer all three questions. Typical run: 6–12 thoughts.

### Required questions (verbatim intent)

1. **What is the intended purpose of this surface?**  
   Who uses it (organizer, TM, hiring manager, finance)? What job are they hiring this page to do?

2. **How do I make it more useful?**  
   Prefer: real data over mocks, actionable empty states, filters that match operator workflows, bulk actions, clear next steps, fewer dead ends.

3. **How do I integrate it better into the platform?**  
   Cross-link to events/tours/hiring/logistics/commerce/messaging/accounts; reuse shared entities; keep account scope consistent; surface status from related domains.

### Thought structure (suggested)

1. Restate the surface and current UI reality.  
2. Map user jobs-to-be-done.  
3. List gaps (mock, disconnected, orphan API, weak empty/error, missing actions).  
4. List integration opportunities.  
5. Rank one best additive change for this task.  
6. Hypothesis: after change, operator can ___ without leaving admin.  
7. Verify against zero-mock and additive constraints.  
8. Finalize the single implementation target.

Only set `nextThoughtNeeded: false` when the single task is chosen and justified.

## Choosing the one improvement

Good task sizes (pick one):

- Wire a disconnected component that already has APIs.
- Replace mock/fallback data with a real fetch and proper empty/error states.
- Add a missing primary action (create, assign, publish, message, export) backed by existing API.
- Connect cross-domain deep links (event → logistics, hiring → roster, tour → calendar).
- Collapse a duplicate orphan into the canonical surface (redirect + shared component).
- Align chrome with gold-standard (`AdminPageHeader`, skeleton, error, empty).

Avoid in a single task:

- Full redesign of an entire category.
- Speculative new product areas with no existing API/schema.
- Database resets or broad destructive cleanup.

## Gold-standard UI pattern

```
AdminPageHeader
→ optional AdminStatCard / AdminFilterBar
→ content
Loading: AdminPageSkeleton
Error: AdminErrorCard
Empty: AdminEmptyState (with CTA when an action exists)
```

Reference pages: `app/admin/dashboard/events/page.tsx`, `tours/page.tsx`, `store/page.tsx`.

## Verification before logging done

- [ ] Touched files have no new obvious type/lint breakages.
- [ ] No new mock data introduced in live UI.
- [ ] Page still loads its primary path.
- [ ] `PROGRESS.md` and `TASK_LOG.md` updated.
- [ ] Next pointer advanced.
