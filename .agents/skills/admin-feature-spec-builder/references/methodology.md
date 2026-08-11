# Admin Feature Spec Builder — Research & Sequential Thinking

Read this once per task before implementing.

## Research checklist

For the current inventory task ID:

1. **Spec row** — Open `docs/admin-feature-specs/NN_*.md`; copy the acceptance criteria; note related UX / deployment-readiness bullets in the same doc.
2. **Existing admin surface** — Matching pages under `app/admin/dashboard/**` and components under `components/admin/**`.
3. **APIs** — `app/api/admin/**` and any legacy `/api/tours/*` consumers; auth wrappers (`withAdminAuth`, acting-context helpers).
4. **Data layer** — Supabase tables, RLS policies, migrations under `supabase/migrations/`; services in `lib/`.
5. **Tests** — Nearby `__tests__/**` patterns for contract, RLS, and role matrices.
6. **Nav / capability** — `optimized-sidebar.tsx` and capability-aware controls; do not invent parallel nav.
7. **Upstream gates** — Confirm [phase-order.md](phase-order.md) hard gates for this ID.
8. **Design** — Match [design-system.md](design-system.md); reuse gold-standard pages (events/tours/store).

Record findings briefly in sequential-thinking thoughts; do not paste huge dumps into `TASK_LOG.md`.

## Sequential-thinking protocol

Use the sequential-thinking MCP with enough thoughts to answer all three questions. Typical run: 6–12 thoughts.

### Required questions

1. **What does this task ID require?**  
   Restate acceptance criteria. List schema, API, UI, and test obligations.

2. **What already exists that we can extend?**  
   Prefer additive extension of current admin code over parallel systems.

3. **How do we stay consistent and gated?**  
   Upstream phase gates, design chrome, org/capability patterns, zero-mock, no DB reset.

### Thought structure (suggested)

1. Restate task ID, phase, and AC.  
2. Map current code reality.  
3. List gaps vs AC.  
4. Confirm upstream gates.  
5. Choose the additive implementation path.  
6. List files to touch and tests to add.  
7. Verify zero-mock / expand-only migration constraints.  
8. Finalize the implementation plan for this ID only.

Only set `nextThoughtNeeded: false` when the AC-satisfying plan for **this** ID is chosen.

## Done vs partial polish

Unlike the page-surface builders, **done means the spec row’s acceptance criteria are met**.

Good task completion:

- Schema + RLS + command + UI + tests when the AC lists them.
- ADR drafted with concrete defaults when the ID is an approve/decision task.
- Honest `blocked` when pen-test, prod backup, or secrets are required.

Avoid:

- Marking `done` after only UI chrome with no server enforcement the AC requires.
- Skipping to a later phase because the current ID is hard.
- Destructive retirement before Phase 6 gates / reconciliation evidence.

## Verification before logging done

- [ ] Acceptance criteria for this ID are satisfied or status is honestly `blocked`/`wont-fix`.
- [ ] Touched files have no new obvious type/lint breakages.
- [ ] No new mock data in live UI.
- [ ] Migrations are additive; no DB reset.
- [ ] Design chrome matches neighboring admin pages when UI changed.
- [ ] `PROGRESS.md` and `TASK_LOG.md` updated; pointer advanced.
