# Music interfaces

## Provides

- Domain behavior and contracts within the working-set paths.

## Consumes

- Server-side identity and tenant context.
- Database schema, RLS, RPCs, and generated types.
- Shared UI and accessibility rules.
- QA and release verification evidence.

Record breaking payload, schema, route, permission, or event changes in the task and decision log. Find callers with targeted search and generated maps.

## Music commerce handoff (MUSIC-003)

- Music owns `catalog`, `rights`, and `royalties`. Artist Music routes use the `artist_profile` auth contract exposed by `lib/music/music-commerce-auth.ts`, which delegates to ARTIST-002's `requireArtistMusicUser` gate.
- Marketplace owns `checkout`, `orders`, `transfers`, `portfolios`, and the financial `/api/music-marketplace/**` operations. Those routes require Marketplace's account/acting-context authorization; Music must not implement their order, pricing, or settlement mutations.
- `lib/music/music-commerce-boundary.ts` is the shared route/concern registry. Use longest-prefix resolution for route classification and the typed `MusicCatalogCommerceReference` / `MarketplaceMusicPurchaseReference` projections for cross-domain handoff.
- Catalog projections intentionally omit storage paths, URLs, prices, and order identifiers. Marketplace fulfillment references identify the order and track but do not transfer order ownership to Music.
- Existing route-handler adoption is tracked as a coordinated follow-up in MUSIC-003 and must be completed by the owning API lanes before the financial auth acceptance criterion is closed.

### Route-adoption dependency and next owners

| Route group | Required adoption | Next owner |
| --- | --- | --- |
| `app/api/artist/music/route.ts`, `analytics/`, `catalog-imports/`, `certification/**`, `finance/collectibles/`, `generate-preview/`, `payouts/**`, `pin/`, `preview-jobs/`, `rights/**`, `royalties/**`, `upload-url/`, `valuation/` (33 route files) | Replace the direct `requireApiUser` gate with the shared `requireArtistMusicUser` contract, preserving each route's existing resource ownership checks and trusted-write behavior. | Music + Artist coordinated API batch |
| `app/api/music-marketplace/{catalog-links,disclosures,documents,flags,investor-account,issuers,market-data,offerings,orders,pathway,portfolio,subscriptions,transfers}/route.ts` (13 route files) | Apply Marketplace account/acting-context authorization and keep order, subscription, transfer, portfolio, and settlement mutations in Marketplace. | Marketplace (`MKT-003`) |
| `app/api/marketplace/checkout/route.ts` and `app/api/marketplace/orders/route.ts` | Keep native checkout/order auth and money-path behavior in the general Marketplace lane; use Music references only for track catalog/entitlement handoff. | Marketplace (`MKT-003`) |

MUSIC-003 supplies the contracts and test evidence for these changes; it does not edit the route files above. Completion requires the owning batches to adopt the gates, run route-level auth tests, refresh the generated permissions inventory, and then update this handoff.
