# Flow notes — 01-artist-band — 2026-07-18

## Environment
- Base URL: http://localhost:3000
- Seed mode: cast + scenario
- Actor: Artist1–3

## Findings

### P1 — Severe friction
- **Title:** Band roster accept does not communicate non-admin status
  - Route: Band Hub / `/organization/pacific-signal`
  - Repro: Artist joins roster; expects edit rights on org tour
  - Fix suggestion: Explicit copy — “Roster listing only. Ask a manager for tour admin.” (Grant panel added on tour Team tab)

### P2 — Polish
- **Title:** `/create` band vs org subtype clarity
  - Note: Band create works via API; wizard copy could emphasize shared band vs management company

## Passed without issue
- Artist persona create via `/api/accounts` create_artist
- Pacific Signal band create (subtype band)
- Roster upsert accepted for Artists 2–3
