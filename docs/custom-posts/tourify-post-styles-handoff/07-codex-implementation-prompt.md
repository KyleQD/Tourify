# Codex Implementation Prompt

Copy the prompt below into Codex while working from a new branch created from the current protected base branch.

---

You are implementing **Tourify Custom Post Styles** in the Tourify repository.

## Objective

Allow every authorized Tourify author/account to publish posts using the same templates and approved editing tools already used by the Artist EPK editor. The chosen appearance must render on that specific authored post in the author's feed, other users' feeds, the author's public profile, and the post detail/permalink. It must never restyle the entire feed, adjacent posts, page shell, comments, or another author's content.

Treat the following files as the controlling specification:

- `README.md`
- `01-product-requirements.md`
- `02-ux-ui-spec.md`
- `03-technical-architecture.md`
- `04-data-api-security.md`
- `05-implementation-plan.md`
- `06-qa-release.md`
- `tourify-post-styles-plan.json`

If the repository conflicts with an assumed name or path, preserve the product requirement and adapt to the actual architecture. Document the difference. Do not invent parallel systems when a canonical Tourify implementation exists.

## Mandatory working rules

1. Create a new feature branch from the current intended base. Do not change or merge the protected base branch.
2. Preserve all unrelated user changes. Use additive, non-destructive integration.
3. Begin with a read-only audit. Do not edit production code until the required audit artifacts and updated execution JSON exist.
4. Find and follow all repository instructions, including `AGENTS.md`.
5. Use `rg`/`rg --files` for repository discovery.
6. Treat the current EPK template registry, editor controls, assets, and defaults as the source of truth.
7. Extract or wrap shared appearance code. Do not copy template definitions or editor components into a drifting post-only system.
8. Keep EPK semantic page layout and post semantic card layout separate. Share tokens, registry, editor schema, assets, validation, versioning, and compilation through surface adapters.
9. Do not accept raw user CSS, HTML, JavaScript, unapproved URLs, or executable template code.
10. Enforce ownership and acting-account permissions server-side and through RLS.
11. Store a sanitized immutable appearance snapshot at publish. Changing an author's default must not silently restyle published posts.
12. All existing/legacy posts must keep the current renderer and behavior.
13. Every style root must be isolated. Required author, timestamp, edited, sponsored, safety, and moderation controls cannot be hidden.
14. Use feature flags and complete one-template vertical slice before all-template expansion.
15. Never claim completion based only on lint/build. Run the relevant unit, integration, E2E, visual, accessibility, security, and performance checks.
16. Do not weaken or delete existing tests to make the feature pass.
17. If credentials or live services are unavailable, complete deterministic local work and report the exact blocked validation; do not fabricate results.

## Phase 0 deliverables

Create:

- `docs/post-styles/EPK_POST_STYLE_AUDIT.md`
- `docs/post-styles/EPK_POST_PARITY_MATRIX.md`
- `docs/post-styles/POST_RENDER_SURFACE_INVENTORY.md`
- `docs/post-styles/ARCHITECTURE_DECISIONS.md`
- `docs/post-styles/BASELINE_AND_VERIFICATION.md`
- `docs/post-styles/IMPLEMENTATION_STATUS.md`
- `docs/post-styles/implementation-plan.json`

The audit must map:

- every active, retired, disabled, and legacy/alias EPK template;
- every EPK editor control and storage field;
- template assets/fonts/textures/backgrounds;
- EPK renderer entry points;
- post create/edit actions and canonical post data;
- every viewer/operational post renderer;
- acting-account authorization;
- RLS and migrations;
- draft/revision/cache/analytics/moderation/feature-flag patterns; and
- current test coverage and performance baselines.

Update the execution JSON with actual paths, discovered dependencies, exact commands, and pass/fail gates before implementation.

## Required architecture

- A shared, typed, versioned appearance domain.
- One canonical template registry with alias, lifecycle, entitlement, and surface-capability metadata.
- Shared schema-driven EPK/post editing controls.
- Separate EPK and post surface adapters.
- Scoped post CSS variables/classes under one isolated root.
- Semantic token snapshots, not raw compiled user CSS.
- Server-authoritative sanitizer and compiler.
- Canonical post DTO consumed by all viewer surfaces.
- Saved author/account style profiles plus one default.
- Per-post overrides and immutable published snapshots.
- Standard-post fallback per individual post.
- Feature flags for read, write/editor, full template set, and compact surfaces.

## Required implementation sequence

1. Audit and baseline.
2. Shared appearance contract with EPK output unchanged.
3. Additive schema/RLS/services.
4. One-template compose-preview-publish-render vertical slice.
5. Shared editor and saved/default/per-post style UX.
6. Every active template adapter.
7. Every audited post surface.
8. Security, accessibility, performance, and regression hardening.
9. Controlled-release documentation.

Do not skip a failed gate. Fix it or mark the task blocked with evidence and continue only with independent work.

## Tracking

Use `docs/post-styles/implementation-plan.json` as the execution ledger.

For every task, record:

- status: `pending`, `in_progress`, `blocked`, or `complete`;
- discovered file paths;
- files changed;
- migrations;
- tests added;
- commands executed;
- result;
- evidence;
- blockers; and
- rollback notes.

Only one task may be `in_progress` at a time unless explicitly documented as safe parallel work. A phase cannot be complete until all of its gates pass.

Update `IMPLEMENTATION_STATUS.md` after each phase with:

- outcome first;
- user-visible changes;
- technical changes;
- tests and exact results;
- migrations and how to apply them;
- open blockers;
- risks;
- rollback; and
- next phase.

## Completion response

At the end, report:

- branch and commit(s);
- what the author can now do;
- every post surface integrated;
- EPK parity result;
- database migrations and RLS result;
- tests with pass/fail/skip counts;
- accessibility/performance/security results;
- feature-flag state;
- remaining blockers or intentionally deferred items;
- preview instructions; and
- exact rollback steps.

Do not say “production ready” if any mandatory gate, live migration, environment-dependent E2E, accessibility, security, or performance validation is unverified.

---
