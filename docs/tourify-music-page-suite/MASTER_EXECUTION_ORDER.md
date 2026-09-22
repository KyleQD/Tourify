# Master Execution Order

Kimi must execute the suite in this exact order.

## Stage A — Read and initialize

1. Read `README.md`
2. Read `00_AGENT_OPERATING_RULES.md`
3. Read `01_PRODUCT_OBJECTIVE.md`
4. Read `02_BASELINE_AUDIT.md`
5. Read `03_UX_INFORMATION_ARCHITECTURE.md`
6. Read `04_VISUAL_DESIGN_SYSTEM.md`
7. Read `05_TECHNICAL_ARCHITECTURE.md`
8. Read `06_SHARED_COMPONENT_SYSTEM.md`
9. Read all feature documents
10. Read `18_PHASED_BUILD_PLAN.md`
11. Read `19_DEFINITION_OF_DONE.md`
12. Read `20_ROLLBACK_RISK_RELEASE.md`
13. Read `KIMI_MASTER_PROMPT.md`
14. Initialize `tracking/progress.json`

## Stage B — Audit

1. Run baseline build and checks.
2. Capture current screenshots.
3. Map routes.
4. Map components.
5. Map data.
6. Map APIs.
7. Map global player.
8. Map Audius.
9. Map library.
10. Map playlists.
11. Map permissions.
12. Map tests.
13. Produce audit artifacts.
14. Update progress tracker.
15. Stop and resolve audit gaps before coding.

## Stage C — Architecture

1. Confirm the existing normalized track model.
2. Confirm provider adapter approach.
3. Confirm global player integration path.
4. Confirm database changes.
5. Confirm route and URL state.
6. Record decisions in the decision log.
7. Update progress tracker.

## Stage D — Implementation

Execute Phase 2 through Phase 13 in `18_PHASED_BUILD_PLAN.md`.

For every task:

1. Mark `in_progress`.
2. Implement the smallest coherent change.
3. Run targeted validation.
4. Record files changed.
5. Record evidence.
6. Mark `complete`, `blocked`, or `deferred`.
7. Do not proceed past a failed completion gate.

## Stage E — Validation

1. Run all static checks.
2. Run unit tests.
3. Run integration tests.
4. Run E2E flows.
5. Test responsive matrix.
6. Test accessibility matrix.
7. Test provider failure isolation.
8. Test account switching.
9. Test playback persistence.
10. Verify database integrity.
11. Verify security.
12. Complete validation report.

## Stage F — Final handoff

1. Complete change log.
2. Complete known limitations.
3. Complete rollback notes.
4. Attach final screenshots.
5. Update progress tracker.
6. Compare implementation against Definition of Done.
7. State final status truthfully.
