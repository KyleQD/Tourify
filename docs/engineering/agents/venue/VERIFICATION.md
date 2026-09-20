# Venue verification

Start with the task tier from `docs/DEVELOPMENT_WORKFLOW.md`.

- Run targeted tests for touched behavior.
- Lint touched source files.
- Use `npm run verify:fast -- --changed` during implementation.
- Use feature verification when API, auth, database, shared contracts, or multiple surfaces change.
- Record exact commands, SHA, result, and evidence in the task.

Do not claim completion from an unrelated global check.
