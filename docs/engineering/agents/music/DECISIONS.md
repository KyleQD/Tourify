# Music decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## DOMAIN-001 — Split music commerce by concern

- Date: 2026-09-10
- Status: accepted
- Task: MUSIC-003
- Decision: Music owns catalog, rights, and royalties. Marketplace owns checkout, orders, transfers, portfolios, and the financial `/api/music-marketplace/**` surface. Music exposes typed catalog and fulfillment references but does not create orders, calculate prices, or own marketplace money records.
- Evidence: `docs/engineering/DECISIONS.md` CP-013/CP-026; `lib/music/music-commerce-boundary.ts`; `lib/marketplace/entitlement-resolver.ts` explicitly keeps music sales out of general marketplace entitlements; existing ARTIST-002 `lib/artist/artist-music-auth.ts` provides the canonical artist-profile gate.
- Consequences: Music and Marketplace route batches can use one ownership map and stable cross-domain references. Existing route handlers still need coordinated adoption in their owning `app/api/**` lanes; this Music task does not edit those paths.
