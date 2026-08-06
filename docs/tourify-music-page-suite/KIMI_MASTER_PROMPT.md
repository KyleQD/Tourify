# Kimi Master Build Prompt

You are working inside the existing Tourify codebase.

Your mission is to redesign and complete the Tourify Music page as a production-ready music destination.

You must follow the document suite in this folder exactly.

## Required operating behavior

1. Read every document before changing code.
2. Execute the work in the order defined by `MASTER_EXECUTION_ORDER.md`.
3. Complete the baseline audit before implementation.
4. Reuse existing Tourify components, player architecture, data models, and APIs wherever possible.
5. Make all database changes additively and non-destructively.
6. Do not create duplicate music models, duplicate player stores, or local competing audio elements.
7. Do not fabricate data, analytics, trending ranks, personalization, listeners, or engagement.
8. Do not stop after creating a visual mockup.
9. Implement complete user flows.
10. Add loading, empty, error, unavailable, permission, and no-result states.
11. Support desktop, tablet, and mobile.
12. Support keyboard and screen-reader operation.
13. Route all playback through the existing global player.
14. Keep Audius failures isolated from native Tourify content.
15. Enforce permissions server-side.
16. Update `tracking/progress.json` after every material task.
17. Record all files created and modified.
18. Run targeted validation at the end of every phase.
19. Do not move to the next phase until the current completion gate passes.
20. Do not claim completion with unresolved critical failures.

## Product target

The final Music page should include:

- Compact functional header
- Clear section navigation
- Music Home
- Continue Listening
- Real recommendations or honestly labeled curated content
- Trending or featured native Tourify music
- Followed-artist music
- Genre discovery
- Event-connected music discovery where supported
- Complete saved library
- Search, sort, filters, and grid/list views
- Complete Discover experience
- Integrated Audius search and discovery
- Complete playlist lifecycle
- Cross-provider playlist support where architecture permits
- Global playback and queue integration
- Account-aware creator actions
- Responsive behavior
- Accessibility
- Performance optimization
- Security and data integrity
- Complete validation and final handoff

## Current visual baseline

Use `reference/current-music-page.png` to understand the current problems:

- excessive blank space,
- oversized header,
- weak tab presentation,
- tiny empty state,
- no visible discovery,
- incomplete page hierarchy.

Do not reproduce this layout as the final experience.

## First actions

Before implementation:

1. Create the required audit artifacts.
2. Run baseline checks.
3. Identify the existing global player.
4. Identify native and Audius data flows.
5. Identify library and playlist persistence.
6. Identify permissions and account-context behavior.
7. Identify reusable components.
8. Record architecture decisions.
9. Update the progress tracker.

## Completion behavior

At the end of each phase, report:

- Tasks completed
- Files created
- Files modified
- Tests run
- Results
- Remaining blockers
- Progress tracker status
- Whether the completion gate passed

At final completion, produce:

- Audit report
- Route map
- Data map
- Component inventory
- Risk register
- Change log
- Validation report
- Known limitations
- Rollback guidance
- Final implementation summary
- Updated progress.json

Final status must be one of:

- Complete
- Functionally complete with documented non-blocking limitations
- Partially complete
- Blocked
- Deferred
