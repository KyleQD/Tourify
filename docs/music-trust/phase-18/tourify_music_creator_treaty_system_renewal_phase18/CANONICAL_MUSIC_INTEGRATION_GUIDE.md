# Canonical Music Integration Guide

- Canonical upload/catalog row: `artist_music`.
- Private audio bucket: `artist-music`.
- Playback: `/api/music/stream` → `resolveMusicAccess` → short-lived signed URL.
- Web playback: existing `JukeboxProvider` and `useJukebox`.
- Preserve current single/album/ep/mixtape values; do not introduce a replacement albums table.
- Extend existing Next.js App Router, TypeScript, React, Supabase, Tailwind, Radix and shadcn patterns.
- Use additive migrations only; never reset the database.
- Existing upload, playback, purchases, entitlement, previews, EPK, feed, profile, analytics and mobile behavior must remain green.
- Public-law and interoperability records reference canonical sources; they never replace music, rights, licensing, royalty or administration source records.
