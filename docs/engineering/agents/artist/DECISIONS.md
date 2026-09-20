# Artist decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## DOMAIN-001 — Artist music pages use one owned transport contract

- Date: 2026-09-10
- Status: accepted
- Task: ARTIST-002
- Decision: Artist music dashboards use `lib/artist/artist-music.ts` as the browser boundary for `/api/artist/music/**` requests and signed artist-music uploads. The helper enforces session credentials, no-store reads, and rejects paths outside the artist music namespace.
- Evidence: The main library, analytics, certification, rights, and royalties pages now use the shared helper; `__tests__/artist/artist-music-surface.test.ts` verifies the contract and page adoption.
- Consequences: Artist-facing pages own transport/orchestration while the music domain retains playback, rights, royalties, ingest, and server-side route implementation under CP-026. Server-route auth convergence remains a follow-up outside this task's explicit `app/artist/` + `lib/artist/` write boundary.
