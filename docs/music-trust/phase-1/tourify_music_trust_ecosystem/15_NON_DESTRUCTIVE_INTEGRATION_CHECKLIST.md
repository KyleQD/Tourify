# Non-Destructive Integration Checklist

## Before code

- [ ] Read the canonical integration guide.
- [ ] Confirm current branch and base commit.
- [ ] Inventory the current music route schemas and selects.
- [ ] Inspect `artist_music` types, constraints, RLS, triggers, and views.
- [ ] Inspect storage policies and path conventions.
- [ ] Inspect admin capability functions.
- [ ] Record baseline lint, typecheck, tests, build, and migration state.

## During implementation

- [ ] No database reset.
- [ ] No table/column drops or renames.
- [ ] No replacement uploader/player.
- [ ] No broad RLS shortcuts.
- [ ] Existing free, paid, preview, marketplace, library, feed, and mobile behavior preserved.
- [ ] New writes feature flagged.
- [ ] Legacy tracks are not automatically certified.
- [ ] Failed trust writes cannot accidentally publish a track.
- [ ] Every schema change has validation and rollback/compensating steps.

## Before rollout

- [ ] Generated types updated.
- [ ] RLS tests pass.
- [ ] Existing music regression suite passes.
- [ ] New route/unit/E2E tests pass.
- [ ] Database advisors reviewed.
- [ ] Storage access tested with owner/non-owner/anonymous users.
- [ ] Feature flags tested off and on.
- [ ] Operations runbook completed.
- [ ] Legal/policy wording approved.
