# 18 — Phased Build Plan

## Execution rule

Phases must be completed in order.

A later phase may begin only when:

- the current phase is marked complete,
- its completion gate passes,
- evidence is recorded,
- no blocking dependency remains.

## Phase 0 — Preparation

Tasks:

- Read all documents.
- Create `artifacts/` working folder.
- Initialize progress tracking.
- Record branch and environment.
- Capture baseline screenshots.
- Record baseline build, type, lint, and test status.

Completion gate:

- Baseline is documented.
- Progress tracker is initialized.
- No implementation changes yet.

## Phase 1 — Full Audit

Tasks:

- Route map
- Component inventory
- Player architecture map
- Data map
- Audius map
- Playlist map
- Permission map
- Test inventory
- UX audit
- Risk register

Completion gate:

- All audit artifacts exist.
- Reuse and refactor decisions are recorded.

## Phase 2 — Architecture and Page Shell

Tasks:

- Confirm normalized model
- Confirm provider boundary
- Implement compact header
- Implement primary navigation
- Implement URL state
- Implement section boundaries
- Preserve playback across section changes

Completion gate:

- Header and navigation are complete.
- Playback does not reset.
- Mobile navigation works.

## Phase 3 — Shared Components

Tasks:

- Track row
- Track list
- Release card
- Artist card
- Playlist card
- Genre card
- Provider badge
- Shared skeletons
- Shared errors
- Shared empty states
- Dialog foundations

Completion gate:

- Components are reusable, typed, accessible, and responsive.

## Phase 4 — Music Home

Tasks:

- Continue Listening
- Recommended
- Trending
- Followed Artists
- Genres
- Event-connected discovery
- Audius Highlights
- New-user experience

Completion gate:

- Useful for both zero-data and returning users.
- All sections use real data or hide honestly.

## Phase 5 — Library

Tasks:

- Content filters
- Search
- Sort
- Provider filter
- Grid/list
- Save/unsave
- Empty state
- Unavailable tracks
- Large-list handling

Completion gate:

- Library management is functional.
- Save state is consistent across the page.

## Phase 6 — Discover

Tasks:

- Featured release
- Trending tracks
- New releases
- Artists to watch
- Event-connected discovery
- Genres
- Mood/activity only if supported

Completion gate:

- Discovery flows are functional and honest.

## Phase 7 — Audius

Tasks:

- Provider adapter
- Search
- Trending tracks
- Trending playlists
- Trending artists
- Genre filters
- Playback resolution
- Save
- Add to playlist
- Provider error handling
- Attribution

Completion gate:

- Audius works without destabilizing native music.

## Phase 8 — Playlists

Tasks:

- Playlist index
- Create flow
- Detail view
- Edit metadata
- Add/remove tracks
- Reorder
- Visibility
- Share
- Mixed providers
- Ownership checks
- Empty and error states

Completion gate:

- Complete playlist lifecycle works.

## Phase 9 — Search

Tasks:

- Page-level or integrated search
- Native search
- Audius search
- Categorized results
- Keyboard navigation
- Recent searches if supported
- Request cancellation
- Performance

Completion gate:

- Search is fast, accurate, accessible, and provider-aware.

## Phase 10 — Global Player Integration

Tasks:

- Route all play actions
- Validate queue sources
- Validate mixed providers
- Current-track highlighting
- Error handling
- persistence
- mobile player compatibility
- accessibility announcements

Completion gate:

- Playback persists across routes and sections.
- Queue behavior is stable.

## Phase 11 — Account-Aware Actions

Tasks:

- General-user controls
- Artist controls
- Organization/venue restrictions
- Context switching
- Server-side authorization
- Existing upload/manage routes

Completion gate:

- No unauthorized controls or mutations.

## Phase 12 — States, Responsive, Accessibility

Tasks:

- Complete skeleton coverage
- Complete empty states
- Complete errors
- Mobile layout
- Tablet layout
- Keyboard operation
- Focus management
- screen-reader labels
- reduced motion
- zoom and overflow checks

Completion gate:

- Core workflows are usable across devices and assistive technology.

## Phase 13 — Performance, Security, and Data

Tasks:

- Remove duplicate requests
- Defer inactive data
- Optimize images
- Bound long lists
- Verify RLS
- Verify ownership
- Verify provider IDs
- Verify no secret leakage
- Validate migrations

Completion gate:

- Performance and security checks pass.

## Phase 14 — Full QA and Regression

Tasks:

- Static checks
- Unit tests
- Component tests
- Integration tests
- E2E flows
- Responsive matrix
- Accessibility matrix
- Regression checks
- Production build

Completion gate:

- No critical blockers remain.
- Any non-critical limitations are documented.

## Phase 15 — Final Handoff

Tasks:

- Update progress tracker
- Final audit delta
- Change log
- Validation report
- Known limitations
- Rollback notes
- Final screenshots
- Final implementation summary

Completion gate:

- Documentation accurately matches the implementation.
- No task is falsely marked complete.
