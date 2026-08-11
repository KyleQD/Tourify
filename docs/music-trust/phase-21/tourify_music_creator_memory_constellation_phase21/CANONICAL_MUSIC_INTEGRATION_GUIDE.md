# Canonical music integration guide

- `artist_music` remains the canonical upload and catalog row.
- Private audio remains in the `artist-music` bucket.
- Playback remains `/api/music/stream` → `resolveMusicAccess` → short-lived signed URL.
- Web playback remains `JukeboxProvider` and `useJukebox`; mobile keeps the existing playback path.
- Preserve existing `artist_music.type` values: `single`, `album`, `ep`, `mixtape`.
- Do not create a replacement albums table, catalog, upload, player, entitlement, royalty or rights source.
- Rights Passports, licences, administration cases, royalty ledgers and external official systems remain authoritative in their domains.
- Phase 20 stores references, preservation packages, custody and access records, restrictions and approved public projections only.
- Every implementation is additive, feature-flagged, reversible and regression tested.
