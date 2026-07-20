# Non-Destructive Integration Checklist

Use this checklist before every Phase 4 merge, migration, and deployment.

## Existing-system preservation

- `artist_music` remains the canonical music catalog.
- `artist-music` remains private and streams through `/api/music/stream` and `resolveMusicAccess`.
- JukeboxProvider remains the web playback system; mobile uses its existing provider.
- Existing music purchases, marketplace listings, library entitlements, previews, feed posts, EPK, profiles, moderation, and analytics continue working.
- Phase 4 does not repurpose music-purchase listings as securities.

## Data safety

- additive migrations only;
- no database reset or destructive rewrite;
- immutable Phase 2 rights and Phase 3 ledger/valuation snapshot references;
- provider IDs isolated from domain IDs;
- backfills are resumable and audited;
- RLS, grants, views, functions, and storage policies reviewed;
- validation and compensating rollback included.

## Regulatory safety

- pathway, partner, and role decisions are approved records;
- no Tourify order matching, custody, or funds handling without authorization;
- public content is disclosure-version controlled;
- transfer restrictions default deny;
- secondary access is partner gated;
- tokenization is optional and cannot outrank official ownership records.

## Release safety

- independent feature flags for offering readiness, public discovery, subscriptions, portfolio, transfers, market data, orders, and blockchain;
- kill switches tested;
- partner outages degrade safely;
- legacy and mobile regression tests pass;
- evidence is attached to the execution-plan task.
