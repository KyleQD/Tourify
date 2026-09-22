---
name: admin-dashboard-builder
description: >-
  Fully builds out every admin dashboard page and component additively, one task
  at a time, using sequential thinking and deep research. Use when the user asks
  to run the admin dashboard builder, continue the admin agent, build out admin,
  improve admin pages, or resume admin dashboard work from the progress ledger.
---

# Admin Dashboard Builder

Mission: touch every inch of the Tourify admin dashboard and make each surface more useful and better integrated into the platform. Work additively. Do not stop until the inventory is complete.

## Hard constraints

- **NEVER reset the database.** Forbidden: `supabase db reset`, wipe scripts, destructive seed reloads, dropping production-like local data for convenience.
- **Additive only.** Improve, wire, extend. Do not gut working features. Do not delete without a clear replacement path documented in the task log.
- **One task at a time.** Pick the next unfinished inventory item, finish it, update the ledger, then pick the next.
- **No artificial stop.** Continue until every inventory item is `done` or `wont-fix` (with rationale). If the session ends, leave the ledger ready for resume.
- **No commits** unless the user explicitly asks.
- **Zero-mock policy.** No mock, hardcoded, sample, or synthetic data in live admin UI. Wire real APIs/Supabase or hide incomplete surfaces.
- Schema changes: additive migrations only. Read and follow the Supabase skill for any DB work.

## Resume protocol (always first)

1. Read [`.agents/admin-dashboard-builder/PROGRESS.md`](../../admin-dashboard-builder/PROGRESS.md).
2. Read the latest entries in [`.agents/admin-dashboard-builder/TASK_LOG.md`](../../admin-dashboard-builder/TASK_LOG.md).
3. Confirm the inventory map in [`.agents/admin-dashboard-builder/INVENTORY.md`](../../admin-dashboard-builder/INVENTORY.md).
4. Pick the **Current pointer** item if still `pending`/`in_progress`, otherwise the next `pending` item in inventory order.
5. Set that item to `in_progress` in `PROGRESS.md` before coding.

## Per-task loop

```
Resume → Pick → Research → Sequential thinking → Implement → Verify → Log → Repeat
```

### 1. Research (deep)

For the target page/component:

- Read the page file(s) and every child component it mounts.
- Trace APIs under `app/api/admin/**` and hooks under `lib/` / `hooks/`.
- Check sidebar placement in `app/admin/dashboard/components/optimized-sidebar.tsx`.
- Cross-check [`.agents/plans/`](../../plans/) phase notes and `docs/architecture/admin-audit.md` (verify status; audit may be stale).
- Look for related platform surfaces (artist/venue/staff dashboards, messaging, account scope) that this admin surface should connect to.

Read [references/methodology.md](references/methodology.md) for the research checklist.

### 2. Sequential thinking (required)

Use the sequential-thinking MCP. Explicitly answer:

1. What is the intended purpose of this surface?
2. How do I make it more useful for organizers/operators?
3. How does it integrate better with the rest of the platform (events, tours, hiring, logistics, commerce, messaging, accounts)?

Then choose **one concrete additive improvement** for this task.

### 3. Implement

- Prefer gold-standard admin chrome: `AdminPageHeader` → content → `AdminEmptyState` / `AdminErrorCard` / `AdminPageSkeleton`.
- Match existing patterns in nearby admin pages (events/tours/store as references).
- Preserve account/entity scoping used by hiring and workforce links.
- See [references/integration-map.md](references/integration-map.md) for cross-domain wiring expectations.

### 4. Verify

- Check lints/diagnostics on touched files.
- Do not leave the page worse (broken imports, mock data newly exposed, dead nav).
- Do not run DB reset. Prefer `supabase db push` / additive migration if schema is required and the user environment supports it.

### 5. Log and continue

Update:

- `PROGRESS.md` — status → `done` (or `wont-fix` + reason); advance **Current pointer** to the next `pending` item.
- `TASK_LOG.md` — append one entry (template below).

Then immediately start the next pending item. Do not ask permission to continue between items unless blocked on a user decision (secrets, product ambiguity that cannot be resolved from code/docs).

## Task log entry template

```markdown
### YYYY-MM-DD — `<inventory-id>`

- **Surface:** route or component path
- **Purpose:** one sentence
- **Change:** what shipped
- **Integration:** how it connects better to the platform
- **Files:** key paths touched
```

## Status values

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in_progress` | Current task |
| `done` | At least one meaningful additive improvement shipped and logged |
| `wont-fix` | Explicit skip with rationale (e.g. intentional `notFound`, destructive-only tool) |
| `blocked` | Needs user input; include blocker note |

## Scope and order

Follow inventory order in `INVENTORY.md`:

1. Dashboard home  
2. Operations  
3. Workforce  
4. Commerce  
5. Network  
6. Content  
7. Insights & System  
8. Orphan product routes  
9. Disconnected / orphan shared components  

Mark `wont-fix` (with rationale) for intentional `notFound` routes and pure destructive/dev tools unless they are safety hazards.

## Completion

When every inventory item is `done` or `wont-fix`:

1. Set **Current pointer** to `COMPLETE`.
2. Append a final summary entry to `TASK_LOG.md`.
3. Report a short completion summary to the user.

## Invocation examples

- "Use the admin-dashboard-builder skill. Resume from the progress ledger and keep going."
- "Continue the admin agent."
- "Build out the admin dashboard — one task at a time until the inventory is done."
