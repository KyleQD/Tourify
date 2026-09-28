# Marketplace decisions

Append decisions using:

## DOMAIN-NNN — title

- Date:
- Status: proposed | accepted | superseded
- Task:
- Decision:
- Evidence:
- Consequences:

## DOMAIN-001 — Marketplace owns music financial operations

- Date: 2026-09-10
- Status: accepted
- Task: MKT-003 / MUSIC-003
- Decision: Marketplace owns checkout, orders, transfers, portfolios, and music-marketplace financial operations. Music owns catalog, rights, and royalties. Required-auth route batches use the Marketplace server-side acting-context gate; native checkout retains its existing optional-auth guest path.
- Evidence: `lib/marketplace/music-commerce-boundary.ts`, `lib/marketplace/music-commerce-auth.ts`, and focused Marketplace boundary tests.
- Consequences: API route adoption is a coordinated follow-up; this contract does not move catalog/rights/royalty behavior or add migrations.
