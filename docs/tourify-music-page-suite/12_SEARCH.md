# 12 — Search

## Objective

Provide fast, categorized music search across native and Audius content.

## Search scope

Search:

- Native Tourify tracks
- Audius tracks
- Artists
- Releases
- Playlists

Only include content types actually supported by current APIs.

## UX requirements

- Debounced input
- Clear button
- Recent searches when supported
- Keyboard navigation
- Escape to close overlays
- Loading state
- Empty state
- Error state
- Provider badges
- Search query persistence where useful
- No request on every keystroke
- Abort stale provider requests

## Result grouping

Recommended groups:

- Top Result
- Tracks
- Artists
- Releases
- Playlists
- Audius

Do not duplicate the same record across multiple sections unless context requires it.

## Global versus page search

Audit the existing global Tourify search.

Choose one:

- Extend global search to support music categories
- Add page-level search for music
- Use both with clearly different purposes

Do not create two visually identical search controls with overlapping behavior.

## Search analytics

When allowed by existing conventions, record:

- Query submitted
- Result type opened
- Provider selected
- No-results event

Do not log private search data beyond current policy.

## Performance

- Cache stable provider results
- limit initial result count
- paginate or load more
- avoid rendering very large result lists
- abort obsolete requests
- normalize results once

## Completion gate

Search is complete when:

- Native search works.
- Audius search works or fails independently.
- Results are categorized.
- Keyboard navigation works.
- No-results and error states are distinct.
- Search does not create excessive API traffic.
