---
name: admin-feature-spec-builder
description: >-
  Implements every Tourify Admin Feature Documentation task (docs 00–14) in
  Master Roadmap phase order 0→6, additively and one task ID at a time, until
  acceptance criteria are met. Use when the user asks to run the admin feature
  spec builder, continue the feature-spec agent, implement admin feature specs,
  or resume from the admin-feature-spec-builder progress ledger.
---

# Admin Feature Spec Builder

Mission: accomplish **every task ID** in [`docs/admin-feature-specs/`](../../../docs/admin-feature-specs/) (documents `00`–`14`) in **Master Roadmap phase order 0→6**, finishing each task’s acceptance criteria before advancing. Build **additively** on the existing admin platform. Do not stop until the inventory is complete or honestly blocked.

This is a **spec-driven program agent**, not a surface-crawl. The page-level [`admin-dashboard-builder`](../admin-dashboard-builder/SKILL.md) inventory is already complete — reuse its chrome and integration patterns; do not re-run it as the primary loop.

## Hard constraints

- **NEVER reset the database.** Forbidden: `supabase db reset`, wipe scripts, destructive seed reloads.
- **Additive only.** Improve, wire, extend. Do not gut working features. Deletions only after a documented replacement path in the task log (normally Phase 6 retirement tasks).
- **One task ID at a time.** Pick the next unfinished inventory item, satisfy its **full acceptance criteria**, update the ledger, then pick the next.
- **No artificial stop.** Continue until every inventory item is `done` or `wont-fix` (with rationale). If the session ends, leave the ledger ready for resume.
- **No commits** unless the user explicitly asks.
- **Zero-mock policy.** No mock, hardcoded, sample, or synthetic data in live admin UI. Wire real APIs/Supabase, feature-flag incomplete surfaces, or use explicit unavailable states.
- Schema changes: **expand-only / additive migrations**. Read and follow the Supabase skill. Never guess `org_id` on backfill — quarantine unresolved rows.
- **Design consistency.** Match admin chrome and tokens in [references/design-system.md](references/design-system.md). Prefer `AdminPageHeader`, `AdminEmptyState`, `AdminErrorCard`, `AdminPageSkeleton`.
- **Phase gates.** Do not skip upstream dependencies. See [references/phase-order.md](references/phase-order.md).

## Resume protocol (always first)

1. Read [`.agents/admin-feature-spec-builder/PROGRESS.md`](../../admin-feature-spec-builder/PROGRESS.md).
2. Read the latest entries in [`.agents/admin-feature-spec-builder/TASK_LOG.md`](../../admin-feature-spec-builder/TASK_LOG.md).
3. Confirm order in [`.agents/admin-feature-spec-builder/INVENTORY.md`](../../admin-feature-spec-builder/INVENTORY.md).
4. Open the matching file under [`docs/admin-feature-specs/`](../../../docs/admin-feature-specs/) and locate the task row’s acceptance criteria.
5. Pick the **Current pointer** item if still `pending`/`in_progress`, otherwise the next `pending` item in inventory (phase) order.
6. Set that item to `in_progress` in `PROGRESS.md` before coding.

## Per-task loop

```
Resume → Pick → Research → Sequential thinking → Implement full AC → Verify → Log → Repeat
```

### 1. Research (deep)

For the current task ID:

- Read the spec section and acceptance criteria in `docs/admin-feature-specs/`.
- Trace existing code under `app/admin/**`, `app/api/admin/**`, `components/admin/**`, `lib/**`, migrations, and tests.
- Prefer extending current surfaces over parallel rewrites.
- Confirm upstream phase gates are satisfied (or mark `blocked` if not).

Read [references/methodology.md](references/methodology.md) for the research checklist.

### 2. Sequential thinking (required)

Use the sequential-thinking MCP. Explicitly answer:

1. What does this task ID require (acceptance criteria in full)?
2. What already exists that we can extend additively?
3. Are upstream hard gates satisfied? How do we keep design/API consistency with neighboring admin work?

Then implement toward **full AC**, not a partial polish.

### 3. Implement

- ADR tasks: draft a concrete decision under `docs/architecture/adr/` (or `docs/admin-feature-specs/adr/`) grounded in current code + spec; mark `done` when the record exists and implementation will follow it.
- Prefer organization-scoped command/read-model patterns from the specs.
- Feature-flag risky org-scoped rollouts when the spec requires it.
- Keep UI capability-aware but never treat UI as the security boundary.

### 4. Verify

- Check lints/diagnostics on touched files.
- Add or update tests when the AC requires them.
- Do not leave the surface worse (broken imports, new mocks, dead nav).
- Do not run DB reset. Prefer `supabase db push` / additive migration if schema is required and the environment supports it.

### 5. Log and continue

Update:

- `PROGRESS.md` — status → `done` (or `wont-fix` / `blocked` + reason); advance **Current pointer** to the next `pending` item.
- `TASK_LOG.md` — append one entry (template below).

Then immediately start the next pending item. Do not ask permission to continue between items unless blocked on a user decision (secrets, production pen-test, legal sign-off, or product ambiguity that cannot be resolved from code/docs).

## Task log entry template

```markdown
### YYYY-MM-DD — `<task-id>`

- **Spec:** `docs/admin-feature-specs/NN_*.md` — acceptance criteria summary
- **Phase:** 0–6
- **Change:** what shipped to satisfy AC
- **Integration:** how it builds on existing admin surfaces (additive)
- **Design:** chrome/token consistency notes (if UI)
- **Files:** key paths touched
- **Verify:** tests/lints/migration notes
```

## Status values

| Status | Meaning |
|--------|---------|
| `pending` | Not started |
| `in_progress` | Current task |
| `done` | Acceptance criteria for this ID are met and logged |
| `wont-fix` | Explicit skip with rationale (rare; prefer `blocked` for external gates) |
| `blocked` | Needs user/infra input; include blocker note |

## ADR and external sign-off

- Draft ADRs with concrete chosen defaults; do not stall Phase 0 waiting for offline meetings.
- True external blockers only: secrets, production pen-test, backup restore in prod infra, human legal sign-off → `blocked` with note; stop if the next items depend on it, otherwise continue non-dependent pending work only when inventory gates allow.

## Relationship to other agents

- **admin-dashboard-builder** — surface polish complete; reuse chrome/integration; do not re-run as primary.
- **venue-pages-builder** — out of scope unless a task explicitly requires the venue bridge.
- **`.agents/plans/phase-*.md`** — secondary context; **feature specs are source of truth**.

## Completion

When every inventory item is `done` or `wont-fix`:

1. Set **Current pointer** to `COMPLETE`.
2. Append a final summary entry to `TASK_LOG.md`.
3. Report a short completion summary to the user (phase coverage, remaining `blocked` items).

## Invocation examples

- "Use the admin-feature-spec-builder skill. Resume from the progress ledger and keep going."
- "Continue the admin feature spec agent."
- "Implement the admin feature specs — one task ID at a time until the inventory is done."
