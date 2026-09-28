# 20 — Rollback, Risk, and Release Plan

## Objective

Release the redesigned Music page safely and preserve a clear recovery path.

## Primary risks

### Player regression

Risk:

- Route changes reset playback
- Queue corruption
- duplicate audio elements
- provider transitions fail

Mitigation:

- Reuse existing player
- add player integration tests
- validate route transitions
- feature-flag major player refactors when possible

### Provider instability

Risk:

- Audius outage
- rate limits
- schema changes
- stream-resolution failure

Mitigation:

- Provider adapter
- localized errors
- caching
- retry
- timeouts
- native content remains available

### Data-model mismatch

Risk:

- duplicate saved tracks
- playlist provider conflicts
- invalid references

Mitigation:

- normalized provider identity
- unique constraints
- additive migration
- verification queries
- compatibility layer

### Permission leakage

Risk:

- cross-account library access
- unauthorized playlist edit
- artist controls shown in general context

Mitigation:

- server-side authorization
- RLS
- account-context tests
- permission audit

### Performance regression

Risk:

- all sections fetch at once
- artwork overload
- repeated provider calls
- large library render

Mitigation:

- lazy sections
- caching
- pagination
- responsive images
- request deduplication

## Rollout approach

Recommended:

1. Audit and baseline
2. Shared component rollout
3. Page shell rollout
4. Native Home and Library
5. Discover
6. Audius
7. Playlists
8. Search
9. Player integration verification
10. Accessibility and performance
11. Internal QA
12. Controlled release

## Feature flags

Use existing feature-flag infrastructure when available for:

- New Music page shell
- Audius enhanced section
- New playlists
- New search
- New recommendation sections

Do not introduce a new flag system only for this project unless necessary.

## Database rollback

For each migration:

- Provide rollback SQL or a safe reversal note.
- Avoid destructive rollback that deletes user-created data.
- Prefer disabling code paths before removing additive schema.
- Record irreversible data transformations.

## UI rollback

Maintain:

- Previous route compatibility
- Previous component path until migration is verified
- Clear revert points
- No deletion of legacy UI until all consumers are migrated

## Release checklist

- Production build
- Environment variables verified
- Database migrations applied
- RLS verified
- Provider keys verified
- Audius failure tested
- Player persistence tested
- Mobile tested
- Accessibility tested
- Monitoring configured
- Rollback owner identified
- Release notes written

## Post-release monitoring

Watch:

- Playback errors
- Audius errors
- Save failures
- Playlist mutation failures
- Search errors
- route resets
- performance metrics
- provider rate-limit responses
- permission failures
- unexpected RLS denials

## Completion gate

Release planning is complete when:

- Risks have owners and mitigations.
- Migrations have rollback guidance.
- UI has clear revert points.
- Monitoring events are identified.
- Controlled rollout path is documented.
