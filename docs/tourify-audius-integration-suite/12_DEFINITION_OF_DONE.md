# 12 — Definition of Done

The integration is complete only when every applicable item below is satisfied and evidenced in the progress JSON.

## Audit and design

- Existing music, player, API, database, analytics, and UI architecture documented.
- Reused components and deliberate refactors identified.
- Current Audius requirements verified from official sources.
- Architecture decision and provider contracts approved.

## Database

- Additive migrations reviewed and applied to production-like environment.
- No destructive changes.
- RLS policies tested.
- Supabase types regenerated.
- Duplicate and orphan validation queries pass.

## Backend

- Search, metadata, import/link, playback resolution, and event paths implemented.
- Input validation, authorization, rate limits, timeouts, and error mapping present.
- Import is idempotent.
- Temporary playback URLs are neither stored nor logged.

## Provider adapter

- Audius adapter implements the common provider interface.
- Runtime schemas validate external responses.
- Errors are normalized.
- Health and latency metrics are available.
- Adapter can be disabled independently.

## Global player

- Native playback has no known regressions.
- Audius and native tracks share queue and controls.
- Stale resolution and double-play races are prevented.
- Media Session, navigation persistence, and mobile behavior pass supported-browser tests.

## Frontend

- Authorized users can search and add Audius tracks.
- Duplicate imports show correct state.
- Public profile playback works.
- Attribution and external link behavior meet requirements.
- Loading, unavailable, error, retry, and disabled states are complete.
- Accessibility checks pass.

## Analytics and operations

- Provider-aware event properties implemented.
- Event deduplication verified.
- Dashboards and alerts created.
- Native versus Audius metrics separable.
- Runbook covers provider outage and rollback.

## Testing

- Unit, integration, component, E2E, RLS, migration, and browser tests pass.
- Live-provider smoke test completed where allowed.
- Performance budgets met or exceptions approved.
- No unresolved P0/P1 issue.

## Rollout

- Feature flags deployed and tested.
- Internal and limited-cohort stages completed.
- Rollback drill completed.
- Support documentation available.
- Final product, engineering, security, and legal sign-off recorded.

## Required evidence

- Audit report.
- Architecture diagram and decisions.
- Migration files and validation output.
- Test reports.
- Metrics screenshots or dashboard links.
- Rollback drill notes.
- Completed `implementation-progress.json`.
- Final changed-file list.
