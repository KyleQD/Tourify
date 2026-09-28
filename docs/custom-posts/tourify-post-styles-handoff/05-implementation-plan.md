# Phased Implementation Plan

## Delivery strategy

Build vertically behind flags, preserve existing output, and make each phase independently verifiable. Do not begin broad renderer integration until the shared EPK extraction and one end-to-end styled-post slice pass.

Recommended flags:

- `post_styles_read`
- `post_styles_write`
- `post_styles_editor`
- `post_styles_all_templates`
- `post_styles_compact_surfaces`

Use the platform's existing feature-flag mechanism.

## Phase 0 — Repository audit and baseline

### Tasks

- Map every EPK template, alias, version, editor control, asset source, persistence field, renderer, and test.
- Map post create/edit/delete flows, post types, queries, serializers, renderers, and all viewer surfaces.
- Map acting-account authorization for all account types.
- Capture EPK and legacy-post visual baselines at desktop/mobile widths.
- Measure current feed bundle, payload, LCP, INP, CLS, hydration warnings, and scroll performance.
- Identify existing migration, RLS, analytics, feature-flag, draft, revision, and moderation patterns.
- Produce the audit report, parity matrix, render-surface inventory, dependency map, and ADR drafts.

### Exit gate

- No unknown post renderer or EPK template path remains.
- Baselines are reproducible in CI or a documented local command.
- Product decisions in this handoff have been reconciled with actual code.

## Phase 1 — Shared appearance contract without UI change

### Tasks

- Add typed, versioned appearance contracts.
- Move or wrap the existing EPK registry into the shared appearance domain.
- Implement canonical IDs and legacy alias resolution.
- Add capabilities by surface.
- Add runtime schema validation, token constraints, and deterministic compilation.
- Add template lifecycle and entitlement metadata.
- Update the current EPK editor/renderer to consume the shared contract.
- Preserve EPK persistence compatibility with adapters/migrations.
- Add unit tests for registry uniqueness, aliases, schema versions, token bounds, compilation, and fallback.
- Run existing and new EPK visual regression tests.

### Exit gate

- EPK screenshot diffs are zero or explicitly approved as non-user-visible antialiasing.
- No database write shape changes without a migration.
- Shared modules have no post-specific dependency.

## Phase 2 — Data, RLS, services, and feature flags

### Tasks

- Add `post_style_profiles`, `post_appearances`, and revision/draft integration based on audit.
- Add constraints, indexes, triggers if justified, and RLS.
- Implement ownership resolution using the acting-account context.
- Implement profile CRUD, one-default transaction, archive behavior, and entitlement checks.
- Implement preview validation/resolution.
- Extend canonical post publication to snapshot appearance atomically.
- Extend canonical post read DTO with appearance.
- Add server-side fallback reason codes and structured logs.
- Add authorization, RLS, schema, race-condition, and transaction tests.
- Add read-only data-verification scripts.

### Exit gate

- Cross-user/account negative tests pass.
- Legacy post creation and reading are unchanged when flags are off.
- Publish rollback leaves neither orphan post nor orphan appearance.

## Phase 3 — One-template vertical slice

### Tasks

- Build `PostStyleBoundary` and semantic post-region components.
- Add one representative template adapter for feed and detail.
- Render styled post in one test feed and permalink.
- Add composer Style entry, template selection, sanitized preview, and publish for the one template.
- Add standard fallback and error boundary.
- Add mixed styled/unstyled fixture and visual tests.
- Verify SSR/hydration and no CSS leakage.
- Measure initial payload/performance impact.

### Exit gate

- One author can select, preview, publish, and view a styled post end to end.
- Adjacent posts remain isolated.
- Production renderer equals preview renderer.
- Performance is within budget before expanding templates.

## Phase 4 — Full shared editor and saved styles

### Tasks

- Refactor EPK controls into schema-driven shared components where they are not already shared.
- Build the post capability map and clear unsupported-control messaging.
- Implement template gallery using registry metadata and real renderer thumbnails.
- Add feed/profile/detail/mobile preview switcher.
- Add saved-style create, rename, duplicate, edit, archive, and set-default flows.
- Add per-post override and `Save as reusable style`.
- Persist style with drafts and restore after refresh/offline recovery.
- Add contrast feedback and reduced-motion preview.
- Add keyboard navigation, focus management, announcements, and error summaries.
- Instrument editor funnel events.

### Exit gate

- Every approved control is shared, adapted, or documented unsupported.
- No fake controls that disappear at publish.
- Draft/preview/published configurations resolve identically.

## Phase 5 — Template adapter completion

### Tasks

- Implement feed/detail/compact adapters for every active EPK template.
- Resolve legacy aliases to canonical templates.
- Add deterministic thumbnails for each template.
- Add snapshot fixtures for minimum/maximum content, long names, links, polls, media, events, marketplace items, and other current post types.
- Add retired/disabled-template behavior.
- Validate nested quote/repost combinations.
- Complete parity matrix with automated test references.

### Exit gate

- Every registry template has an automated status.
- No active selectable template lacks a required post adapter.
- Historical template fixture remains renderable or has an approved safe fallback.

## Phase 6 — All post surfaces

### Tasks

- Replace duplicate render paths with or route them through the canonical post DTO/renderer.
- Integrate home/following feed, own feed, profile feed, permalink, quote/repost, groups, search/discovery, event/tour feeds, and other audited surfaces.
- Decide full/compact/neutral rendering for notifications, admin moderation, embeds, and link previews.
- Ensure post cache keys include appearance revision/hash.
- Invalidate all relevant caches when a published appearance changes.
- Verify block/report/delete/edit controls everywhere.
- Verify privacy changes and deleted/deactivated accounts.

### Exit gate

- Render-surface inventory has no unresolved row.
- Equivalent viewer surfaces show the same canonical appearance.
- Operational surfaces intentionally using neutral style are documented.

## Phase 7 — Hardening

### Tasks

- Run full RLS and authorization matrix.
- Fuzz token/configuration inputs.
- Test CSS injection, URL injection, oversized JSON, malformed assets, and unknown versions.
- Test deceptive design constraints and moderation neutralization.
- Run WCAG AA, keyboard, screen-reader, zoom, forced-colors, and reduced-motion checks.
- Run mixed-template feed performance tests on realistic mobile hardware/network profiles.
- Optimize font/texture budgets, compiler caching, query size, and editor code splitting.
- Run browser compatibility and hydration tests.
- Run existing post, EPK, notifications, sharing, analytics, and moderation regression suites.

### Exit gate

- All critical/high findings closed.
- QA sign-off and observability dashboards exist.
- Rollback rehearsal succeeds without data deletion.

## Phase 8 — Controlled release

### Rollout

1. Internal staff/test accounts: read + write, one template.
2. Internal accounts: all templates.
3. Small opt-in author cohort.
4. 5% eligible authors.
5. 25%.
6. 50%.
7. 100%.

At each step, hold long enough to observe real feed performance, fallback rate, publish completion, reports, and error logs.

### Stop conditions

- fallback rate exceeds agreed threshold;
- feed LCP/INP/CLS materially regresses;
- cross-account authorization defect;
- inaccessible required content/actions;
- template causes feed crash or hydration loop;
- unusual report/deception spike; or
- cache inconsistency shows stale/incorrect styles.

### Completion

- Write flags at intended availability.
- Old fallback code remains for historical/invalid snapshots.
- Runbooks and ownership are documented.
- Backlog follow-ups are separated from launch blockers.

## Recommended workstreams

| Workstream | Primary scope | Depends on |
| --- | --- | --- |
| Appearance platform | Registry, schema, compiler, capability map | Phase 0 |
| Backend/data | Tables, RLS, services, DTO, cache invalidation | Phase 0, shared contract |
| Post renderer | Boundary, adapters, semantic regions, fallback | Shared contract |
| Editor UX | Shared controls, profile manager, previews, draft state | Shared contract, backend, renderer |
| Surface integration | Feed/profile/detail/quote/group/search | Canonical DTO and renderer |
| Quality/release | Tests, accessibility, performance, telemetry, flags | All workstreams |

## Definition of done

A task is complete only when:

- production code exists;
- unit/integration/E2E coverage appropriate to risk passes;
- accessibility behavior is verified;
- error, empty, loading, unauthorized, and fallback states exist;
- telemetry uses approved fields;
- documentation and parity/surface inventories are updated;
- no unrelated feature is degraded;
- feature flags and rollback are verified; and
- the JSON plan task and its completion gate are marked with evidence.

The feature is complete only when every acceptance criterion in `01-product-requirements.md` and every mandatory gate in `README.md` passes.
