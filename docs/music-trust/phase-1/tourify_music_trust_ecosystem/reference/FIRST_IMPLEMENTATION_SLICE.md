# First Implementation Slice

This is the smallest production-meaningful slice after the audit.

## Database

1. Create the real additive trust migration from `01_music_trust_foundation.sql` using current ID types and naming conventions.
2. Add only declaration, fingerprint, origin, and event objects required by this slice.
3. Keep certification-case tables for the following slice unless the team can test both safely in one release.
4. Add RLS tests before exposing any route.

## Backend

1. Add shared policy helpers under `lib/music/`.
2. Extend `createTrackSchema` and `updateTrackSchema` in `app/api/artist/music/route.ts`.
3. Preserve existing rights, preview, marketplace, cleanup, and notification behavior.
4. For public requests, call the shared trust policy helper.
5. Persist the declaration with a stable statement/policy version.
6. Set `origin_status = pending` and enqueue origin processing.
7. If declaration or origin scheduling fails, keep the track private and record the reconciliation requirement.

## UI

1. Add `MusicAiDisclosureFields` to `EnhancedMusicUploader`.
2. Keep upload progress local as it is today.
3. Wire fields through `MusicPage.handleSaveTrack`.
4. Add `MusicTrustStatus` to artist catalog cards.
5. Add the certification upsell only after successful upload and on the track workspace.

## Worker

1. Reuse the current preview worker pattern or shared jobs system.
2. Compute SHA-256 and technical metadata first.
3. Add acoustic fingerprinting behind its own worker capability/flag.
4. Issue the internal origin record only after the source hash succeeds.

## Tests required before enabling the upload flag

- existing upload tests
- existing preview tests
- existing music-access tests
- public human-created upload
- public assistive-AI upload with disclosure
- blocked public unknown/generated upload
- incomplete private draft
- storage cleanup on failure
- owner/non-owner RLS
- Jukebox playback regression
