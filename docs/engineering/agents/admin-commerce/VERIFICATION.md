# Admin Commerce verification

Start with the task tier from `docs/DEVELOPMENT_WORKFLOW.md`.

- Run targeted tests for each exact touched behavior and tenant/resource boundary.
- Lint touched source files and run `npm run verify:fast -- --changed` during implementation.
- Verify the central ownership map still assigns every touched Admin path to this segment or an explicit shared owner.
- Use feature verification when API, auth, database, shared contracts, or multiple surfaces change.
- Transfer hosted or release certification to QA or Release when it is not owned here.
- Record exact commands, SHA, result, and evidence in the task.

Do not claim completion from unrelated global checks, generated maps, or review-manager recommendations.

