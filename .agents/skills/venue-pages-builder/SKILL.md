---
name: venue-pages-builder
description: >-
  Fully builds out every venue account page, public venue surface, and related
  venue components additively, one task at a time, using sequential thinking and
  deep research. Use when the user asks to run the venue pages builder, continue
  the venue agent, build out venue pages, improve venue dashboard, or resume
  venue work from the progress ledger.
---

# Venue Pages Builder

Mission: touch every inch of the Tourify venue product surface and make each page more useful for venue operators, better aligned with canonical IA, and better integrated with bookings, events, staff, tickets, and the public venue profile. Work additively. Do not stop until the inventory is complete.

## Hard constraints

- **NEVER reset the database.** Forbidden: `supabase db reset`, wipe scripts, destructive seed reloads.
- **Additive only.** Improve, wire, extend. Do not gut working features. Do not delete without a clear replacement path in the task log.
- **One task at a time.** Pick the next unfinished inventory item, finish it, update the ledger, then pick the next.
- **No artificial stop.** Continue until every inventory item is `done` or `wont-fix` (with rationale). If the session ends, leave the ledger ready for resume.
- **No commits** unless the user explicitly asks.
- **Zero-mock policy.** No mock, hardcoded, sample, or synthetic data in live venue UI. Wire real APIs/Supabase or hide incomplete surfaces (`FeatureUnavailable` / redirect to canonical).
- Schema changes: additive migrations only. Read and follow the Supabase skill for any DB work.
- **Canonical shell only.** Prefer `VenueOperationsShell` (`app/venue/components/operations/venue-operations-shell.tsx`). Do not resurrect legacy sidebars as the primary nav.

## Resume protocol (always first)

1. Read [`.agents/venue-pages-builder/PROGRESS.md`](../../venue-pages-builder/PROGRESS.md).
2. Read the latest entries in [`.agents/venue-pages-builder/TASK_LOG.md`](../../venue-pages-builder/TASK_LOG.md).
3. Confirm the inventory map in [`.agents/venue-pages-builder/INVENTORY.md`](../../venue-pages-builder/INVENTORY.md).
4. Pick the **Current pointer** item if still `pending`/`in_progress`, otherwise the next `pending` item in inventory order.
5. Set that item to `in_progress` in `PROGRESS.md` before coding.

## Per-task loop

```
Resume → Pick → Research → Sequential thinking → Implement → Verify → Log → Repeat
```

### 1. Research (deep)

For the target page/component:

- Read the page file(s) and every child component it mounts.
- Trace APIs under `app/api/venue/**`, `app/api/venues/**`, and shared hooks (`useCurrentVenue`, `lib/services/venue.service.ts`).
- Check placement in `VenueOperationsShell` vs legacy sidebars.
- Cross-check [`docs/audits/venue-canonical-ia.md`](../../../docs/audits/venue-canonical-ia.md) and `docs/audits/tourify-venue-account-audit-2026-06-30.md` (verify; may be stale).
- Look for twins/redirects and public parity (`/venues/[slug]`).

Read [references/methodology.md](references/methodology.md) for the research checklist.

### 2. Sequential thinking (required)

Use the sequential-thinking MCP. Explicitly answer:

1. What is the intended purpose of this surface for a venue operator (or public guest)?
2. How do I make it more useful for running a physical venue?
3. How does it integrate better with the rest of the platform (bookings, events, staff/hiring, tickets/check-in, site maps, public profile, org/admin collaboration)?

Then choose **one concrete additive improvement** for this task.

### 3. Implement

- Prefer venue chrome tokens: `components/dashboard/venue-*.tsx` / `venue-tokens.ts` where they exist.
- Resolve active venue via `useCurrentVenue` when `?venueId` is omitted (roles, hiring, scheduling).
- Prefer canonical routes from the IA doc; redirect twins rather than maintaining two UIs.
- See [references/integration-map.md](references/integration-map.md).

### 4. Verify

- Check lints/diagnostics on touched files.
- Do not leave the page worse (broken imports, new mocks, dead nav).
- Do not run DB reset.

### 5. Log and continue

Update:

- `PROGRESS.md` — status → `done` (or `wont-fix` + reason); advance **Current pointer**.
- `TASK_LOG.md` — append one entry (template below).

Then immediately start the next pending item unless blocked on a user decision.

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
| `wont-fix` | Explicit skip with rationale (social/creator debt redirected, etc.) |
| `blocked` | Needs user input; include blocker note |

## Scope and order

Follow inventory order in `INVENTORY.md`:

1. Foundation / shell  
2. Command core  
3. Commerce  
4. Physical venue  
5. Multi-venue CRUD  
6. Workforce  
7. Public surfaces  
8. Admin bridge  
9. Redirect / twin / social debt  
10. Component consolidation  

## Completion

When every inventory item is `done` or `wont-fix`:

1. Set **Current pointer** to `COMPLETE`.
2. Append a final summary entry to `TASK_LOG.md`.
3. Report a short completion summary to the user.

## Invocation examples

- "Use the venue-pages-builder skill. Resume from the progress ledger and keep going."
- "Continue the venue agent."
- "Build out venue pages — one task at a time until the inventory is done."
