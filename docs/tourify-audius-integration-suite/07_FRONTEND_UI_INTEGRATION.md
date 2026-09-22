# 07 — Frontend UI Integration

## Supported first-release surfaces

1. Artist music manager: search Audius and attach a track.
2. Artist public profile: display linked Audius tracks.
3. Global player: play Audius tracks with visible attribution.
4. Feed/post composer: select a Tourify canonical track, including Audius-linked tracks.
5. Feed/post card: play attached tracks through the global player.

Additional surfaces such as playlists, release pages, discovery search, and admin moderation should be enabled only after audit confirms existing integration points.

## UX principles

- Present one consistent Tourify player experience.
- Clearly identify Audius as the source where required.
- Do not imply the file is hosted by Tourify.
- Avoid duplicate imports by showing an “Already added” state.
- Preserve the canonical Tourify track ID after import.
- Provide clear unavailable and retry states.

## Audius search/import modal

States:

- Empty prompt.
- Debounced searching.
- Results.
- No results.
- Provider unavailable.
- Import in progress.
- Imported/already linked.
- Authorization failure.

Each result should include:

- Artwork.
- Track title.
- Artist name.
- Duration.
- Provider badge/attribution.
- Preview/play action where allowed.
- Add/link action.

## Artist ownership/linking

Do not automatically assert that an Audius artist identity belongs to a Tourify user. Provide separate concepts:

- Track added to profile by authorized Tourify profile manager.
- Optional Audius artist-account verification/linking as a later feature.

## Track cards

Track cards should use normalized props and trigger the existing player action.

```ts
interface TrackCardProps {
  track: NormalizedTrack;
  context: 'profile' | 'feed' | 'playlist' | 'search';
  onPlay(trackId: string): void;
}
```

Provider-specific UI should be limited to attribution, canonical external link, and provider availability messaging.

## Accessibility

- Every playback control has an accessible name.
- Search results support keyboard navigation.
- Loading and import status use appropriate live regions.
- Provider badges are not color-only.
- Focus returns predictably when modals close.
- Error states include actionable text.

## Responsive requirements

- Desktop full player.
- Mobile mini-player.
- Compact feed cards.
- Long title and artist truncation without losing accessible full text.
- Artwork fallback.

## Feature flags

Suggested flags:

- `music_audius_provider_enabled`
- `music_audius_import_enabled`
- `music_audius_profile_playback_enabled`
- `music_audius_feed_attachment_enabled`

Use the existing flag system. Environment-only flags are acceptable for initial internal rollout but should not become permanent if cohort targeting is required.

## Acceptance criteria

- Users can search and import without raw provider errors.
- Duplicate selections do not create duplicate canonical records.
- Audius attribution appears consistently.
- Existing track cards require no provider-specific branching beyond presentation metadata.
- UI remains usable when Audius is disabled or unavailable.
