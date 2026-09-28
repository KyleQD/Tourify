# 17 — Testing and Quality Assurance

## Objective

Prove the implementation works across data states, providers, account contexts, devices, and failure conditions.

## Required test categories

### Static checks

- Type checking
- Lint
- Formatting if enforced
- Production build

### Unit tests

Prioritize:

- Track normalization
- Provider adapter
- Save/unsave state
- Playlist mutation logic
- Queue generation
- Search result grouping
- Permission helpers
- sort and filter logic
- unavailable-track handling

### Component tests

Test:

- Track row
- Release card
- Artist card
- Playlist card
- Empty state
- Error state
- Search
- Create playlist dialog
- Add-to-playlist dialog

### Integration tests

Test:

- Native track playback
- Audius track playback
- Save native track
- Save Audius track
- Unsave track
- Create playlist
- Add native track
- Add Audius track
- Remove track
- Reorder track
- Load library
- Search native
- Search Audius
- Provider outage isolation
- Context switching
- private playlist authorization

### End-to-end tests

Core flows:

#### New user

1. Open Music.
2. See useful discovery content.
3. Play a track.
4. Save the track.
5. Create a playlist.
6. Add the track.
7. Change sections.
8. Confirm playback continues.

#### Returning user

1. Open Music.
2. Continue listening.
3. Search library.
4. Sort library.
5. Open playlist.
6. Play all.
7. Reorder a track.
8. Refresh.
9. Confirm order persists.

#### Audius failure

1. Simulate provider failure.
2. Confirm native sections still load.
3. Confirm Audius error is localized.
4. Retry.
5. Confirm recovery.

#### Permission test

1. Switch account context.
2. Verify creator actions update.
3. Attempt unauthorized mutation directly.
4. Confirm server rejection.
5. Confirm no data leak.

### Responsive checks

Viewport matrix:

- Small mobile
- Large mobile
- Tablet portrait
- Tablet landscape
- Standard desktop
- Wide desktop

### Accessibility checks

- Keyboard-only navigation
- Screen-reader labels
- Focus order
- Dialog focus trap
- Escape behavior
- Reduced motion
- zoom
- contrast spot checks
- touch targets

## Regression checks

Verify unrelated behavior:

- Global header
- Search shell
- Notifications
- Account switcher
- Global player on other routes
- Artist profiles
- Event pages
- Existing upload flow
- Existing playlists outside Music page

## Test evidence

Record:

- Commands
- Results
- Screenshots
- Route URLs
- Environment
- failures
- pre-existing blockers
- fixes
- remaining risks

Use `templates/validation-report.md`.

## Completion gate

Testing is complete when:

- Required checks pass.
- Critical E2E flows pass.
- Accessibility blockers are resolved.
- Mobile overflow is resolved.
- Provider failure isolation is verified.
- Pre-existing blockers are clearly separated.
- No known critical regression remains.
