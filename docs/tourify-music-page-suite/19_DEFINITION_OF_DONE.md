# 19 — Definition of Done

The implementation is complete only when every applicable requirement below is satisfied.

## Product completeness

- The page no longer has excessive unused space.
- The header is compact and functional.
- Navigation is clear and persistent.
- New users see useful discovery content.
- Returning users can continue listening.
- Library management is complete.
- Discover is populated with real data.
- Audius is integrated through Tourify UI.
- Playlists have a complete lifecycle.
- Search works across supported content.
- Creator actions are account-aware.

## Playback

- All play actions use the global player.
- Playback survives section changes.
- Playback survives route changes.
- Current track is highlighted consistently.
- Queue behavior is stable.
- Native playback works.
- Audius playback works.
- Unavailable tracks do not corrupt the queue.

## Data

- Saves persist.
- Unsaves persist.
- Duplicate saves are prevented.
- Playlist order persists.
- Provider IDs remain stable.
- Transient stream URLs are not persisted.
- No fabricated data is shown.
- Database changes are additive.

## UX states

- Loading states exist.
- Empty states exist.
- Error states exist.
- No-results states exist.
- Permission states exist.
- Provider-outage state exists.
- Missing artwork is handled.
- Missing audio is handled.
- Deleted provider content is handled.

## Accessibility

- Keyboard navigation works.
- Focus states are visible.
- Dialog focus is managed.
- Icon controls have labels.
- Playback changes are announced.
- Reduced motion is supported.
- Touch targets are sufficient.
- No information relies only on color.
- Core contrast is acceptable.

## Responsive behavior

- Small mobile works.
- Large mobile works.
- Tablet works.
- Desktop works.
- Wide desktop works.
- No horizontal page overflow.
- Mobile controls do not depend on hover.
- Bottom player does not cover content.

## Performance

- Inactive sections are not all fetched immediately.
- Artwork is lazy-loaded and responsive.
- Search is debounced.
- Stale requests are canceled.
- Long lists are bounded.
- Duplicate requests are removed.
- Layout shift is controlled.
- Player state does not cause excessive re-renders.

## Security

- All mutations are authorized server-side.
- RLS protects private data.
- Account context is enforced.
- Private playlists are protected.
- Uploads are validated.
- Provider IDs are validated.
- Secrets are not exposed.
- Cross-account leakage is tested.

## Quality gates

- Type check passes.
- Lint passes.
- Production build passes.
- Required tests pass.
- Critical E2E flows pass.
- No critical regression remains.
- Pre-existing blockers are documented.
- Change log is complete.
- Validation report is complete.
- Progress tracker is accurate.

## Completion statement format

Kimi may only state “complete” when all applicable criteria pass.

Otherwise use one of:

- Functionally complete with documented non-blocking limitations
- Partially complete
- Blocked
- Deferred
