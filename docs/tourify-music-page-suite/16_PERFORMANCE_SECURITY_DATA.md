# 16 — Performance, Security, and Data Integrity

## Performance objective

Keep the Music page responsive without loading every dataset at once.

## Performance requirements

- Lazy-load artwork
- Use responsive image sizes
- Cache provider responses
- Debounce search
- Abort stale requests
- Paginate or virtualize long lists
- Avoid duplicate queries
- Keep player state stable
- Use route or section loading boundaries
- Minimize unnecessary re-renders
- Memoize expensive normalized data when justified
- Avoid layout shift
- Defer inactive-tab data
- Avoid large client bundles from unused provider code

## Measurement

Record before and after when possible:

- Initial page load
- Largest Contentful Paint
- Cumulative Layout Shift
- Interaction responsiveness
- Network request count
- Duplicate request count
- JS bundle impact
- image payload
- provider response time

## Security requirements

- Server-side authorization for all mutations
- RLS for saved music and playlists
- Ownership checks
- Safe provider ID validation
- Safe URL handling
- Upload validation
- Text sanitization
- No secret exposure
- No private signed URL logging
- No cross-account data leaks
- Rate-limit sensitive mutations where existing infrastructure permits

## Data integrity

### Saved music

Prevent:

- duplicate saves,
- broken provider references,
- invalid ownership,
- transient stream URL persistence.

### Playlists

Prevent:

- duplicate position collisions,
- unauthorized edits,
- orphan playlist-track rows,
- invalid provider references,
- silent loss of unavailable tracks.

### Listening history

Define:

- when a play is recorded,
- whether partial plays count,
- deduplication window,
- privacy behavior,
- retention behavior.

Use existing product policy and analytics conventions.

## Additive migration checklist

Every migration must include:

- Purpose
- Up SQL
- Down or rollback guidance
- Indexes
- RLS
- Ownership model
- Backfill plan
- Compatibility plan
- Verification query

## Completion gate

This phase is complete when:

- No major duplicate requests remain.
- Long lists are bounded.
- Provider requests are cached or controlled.
- Mutations enforce authorization.
- Additive database changes are verified.
- No secrets or private URLs are exposed.
- Cross-account data isolation is tested.
