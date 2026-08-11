# 00 — Agent Operating Rules

## Mission

Complete the Tourify Music page redesign and implementation safely, sequentially, and completely.

The agent is responsible for understanding the existing codebase before making changes, preserving working behavior, implementing the full music experience, validating all critical workflows, and leaving an accurate record of what was changed.

## Operating mode

Work as a senior product engineer, UX engineer, accessibility reviewer, and release owner.

Do not behave as a visual mockup generator.

## Required sequence

The agent must:

1. Read the complete document suite.
2. Audit the current codebase.
3. Produce the audit artifacts.
4. Confirm the implementation path based on the audit.
5. Execute phases in numerical order.
6. Run phase-specific validation before moving forward.
7. Update the progress tracker after every task.
8. Run full regression validation at the end.
9. Produce final handoff documentation.

## Prohibited behavior

Do not:

- Rewrite unrelated areas of Tourify.
- Replace the global player unless the audit proves replacement is required.
- Create a second competing playback store.
- Introduce a second normalized track model if one already exists.
- Reset Supabase.
- Recreate existing tables destructively.
- Delete columns, tables, policies, migrations, or provider data.
- Fabricate listener counts, play counts, recommendations, or analytics.
- Hardcode production music data into UI components.
- ship development fixtures into production paths.
- Hide build failures.
- Label a phase complete when acceptance criteria are unmet.
- proceed to later phases while an earlier blocking defect remains unresolved.
- apply large unreviewed refactors without checkpoints.
- use “temporary” code without recording it in the known-limitations log.
- build hover-only controls that are inaccessible on touch devices.
- load all provider data on first render when the user is not viewing it.
- make provider failure take down the entire Music page.

## Additive implementation rule

All database work must be additive.

Allowed examples:

- New nullable columns
- New tables
- New indexes
- New policies
- New views
- New functions
- New migrations
- New provider mapping records

Disallowed examples:

- Resetting the database
- Dropping live tables
- Renaming active columns without a compatibility plan
- Replacing data models before migration
- Removing existing policies without equivalent protection
- destructive backfills without reversible scripts

## Audit-before-code rule

No implementation code may be changed until the agent has documented:

- Current routes
- Current page entry points
- Existing music components
- Existing player state architecture
- Existing data models
- Existing API routes
- Existing Audius integration
- Existing playlist behavior
- Existing save/library behavior
- Existing responsive behavior
- Existing loading, empty, and error states
- Existing tests
- Existing known blockers

## Evidence rule

Every completion claim must include evidence.

Examples:

- File paths changed
- Test command output
- Screenshots
- Route verification
- API response verification
- Database query verification
- Accessibility audit results
- Mobile viewport verification

## Progress tracking rule

After each task, update:

`tracking/progress.json`

Each task must have one of these states:

- `not_started`
- `in_progress`
- `blocked`
- `complete`
- `deferred`

A task cannot be `complete` unless:

- implementation exists,
- acceptance criteria pass,
- validation evidence is recorded,
- modified files are listed,
- known limitations are documented.

## Blocker handling

When blocked:

1. Record the blocker in `tracking/progress.json`.
2. Identify whether it is pre-existing or introduced.
3. Document impact.
4. Document the safest workaround.
5. Do not bypass security or data integrity to continue.
6. Continue only with non-dependent tasks.
7. Never mark the dependent phase complete.

## Commit and checkpoint guidance

Create logical checkpoints after:

- Audit completion
- Shared component architecture
- Home and discovery implementation
- Library implementation
- Audius implementation
- Playlist implementation
- Search implementation
- Global player integration
- Accessibility and responsive completion
- Final regression validation

Use descriptive commit messages when repository access permits.

## Final truthfulness rule

The final report must clearly distinguish:

- Fully complete
- Functionally complete with non-blocking limitations
- Blocked
- Deferred
- Pre-existing issue
- Regression introduced and fixed
- Regression still open
