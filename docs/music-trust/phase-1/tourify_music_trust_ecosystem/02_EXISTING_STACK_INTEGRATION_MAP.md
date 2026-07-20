# Existing Stack Integration Map

The attached integration guide is canonical. The implementation must extend the native stack instead of inventing parallel infrastructure.

## Canonical extension points

| Concern | Extend |
|---|---|
| Artist upload UI | `components/music/enhanced-music-uploader.tsx` |
| Upload orchestration | `app/artist/music/page.tsx` |
| Upload URL | `app/api/artist/music/upload-url/route.ts` |
| Catalog CRUD | `app/api/artist/music/route.ts` |
| Catalog row | `public.artist_music` |
| Private audio | `artist-music` bucket |
| Playback authorization | `lib/music/music-access.ts` |
| Playback transport | `app/api/music/stream/route.ts` |
| Global web player | `contexts/jukebox-context.tsx` |
| Public/inline playback | existing feed/profile/discover Jukebox mappings |
| Admin moderation | `app/admin/dashboard/music` and `/api/admin/content/music` |
| Mobile | existing mobile music provider and same API semantics |

## New bounded-context code

Add shared trust and certification code under `lib/music/`:

- `music-trust.ts`
- `music-certification.ts`
- `music-origin-manifest.ts`
- `music-certification-access.ts` if repository audit shows it is necessary

Add certification APIs under existing music namespaces. Do not create a separate music backend.

## Data strategy

`artist_music` remains the canonical track. Add only small denormalized trust fields needed by upload validation and catalog display. Store declarations, fingerprints, review evidence, events, and certificates in additive related tables.

## Explicit non-goals

- No second player.
- No public storage bucket for original audio.
- No client-side service key.
- No direct listener access to storage.
- No venue music implementation.
- No TAF integration.
- No Spotify/Apple playback API integration.
- No automatic certification of legacy uploads.
