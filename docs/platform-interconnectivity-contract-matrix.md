# Platform Interconnectivity Contract Matrix

This matrix captures the normalized contract baseline for high-traffic cross-domain routes after the interconnectivity audit refactor.

## Endpoint Matrix

| Route | Auth Mode | Request Schema | Success Envelope | Error Envelope |
| --- | --- | --- | --- | --- |
| `POST /api/connect/sessions` | `requireApiUser` (Bearer + cookie fallback) | Zod (`handshakeMethod`, `oneTimeClaim`, `expiresInSeconds`) | `{ connectSessionId, ephemeralToken, expiresAt, claimUrl, webClaimUrl, deepLinkUrl }` | `{ error: { code, message, retryable, issues? } }` |
| `POST /api/connect/sessions/claim` | `requireApiUser` | Zod (`ephemeralToken`, optional `transportProof`, `deviceContext`) | `{ connectSessionId, profilePreview, relationshipStatus, requiresConfirm }` | `{ error: { code, message, retryable, issues? } }` |
| `POST /api/connect/sessions/confirm` | `requireApiUser` | Zod (`connectSessionId`, `intent`, optional `deviceContext`) | `{ success, followRequestId, relationshipStatus }` | `{ error: { code, message, retryable, issues? } }` |
| `POST /api/connect/telemetry` | `requireApiUser` | Zod (`eventName`, optional identifiers and metadata) | `{ success: true }` | `{ error: { code, message, retryable, issues? } }` |
| `POST /api/music/playlists` | `requireApiUser` | Zod (`title`, `description`, `visibility`, `coverImageUrl`) | `{ data }` | `{ error: { code, message, retryable, issues? } }` |
| `POST /api/music/share` | `requireApiUser` | JSON (`musicId` or `playlistId`, optional `createPost`, `content`) | `{ payload }` | `{ error: { code, message, retryable, issues? } }` |
| `POST /api/marketplace/checkout` | `requireApiUser` | Shared Zod contract (`marketplaceCheckoutRequestSchema`) | `{ data: { orderId, checkoutUrl } }` | `{ error: { code, message, retryable, issues? } }` |
| `POST /api/marketplace/listings` | `requireApiUser` | Zod listing + variants payload | `{ data }` | `{ error: { code, message, retryable, issues? } }` |
| `PATCH /api/marketplace/listings/[id]` | `requireApiUser` | Zod partial listing + variants payload | `{ data }` | `{ error: { code, message, retryable, issues? } }` |
| `GET /api/feed/posts` | Optional auth (`authenticateApiRequest`) | Query params (`type`, `user_id`, `limit`, `offset`) | `{ success: true, data }` | `{ success: false, error: { code, message }, data }` |
| `POST /api/feed/posts` | `authenticateApiRequest` required | JSON post payload | `{ success: true, data, error: null }` | `{ success: false, data, error: { code, message } }` |
| `GET /api/feed/music` | Public | Query params (`limit`, `genre`, `sortBy`, `userId`) | `{ success: true, content, total, lastUpdated }` | `{ success: false, error: { code, message }, content: [] }` |
| `GET /api/discover` | Optional auth (`authenticateApiRequest`) | Query params (`intent`, optional location + creator filters) | Shared Zod contract (`discoverResponseSchema`) with `sections`, optional ranking metadata | `{ error: { code, message, retryable } }` |

## Shared Primitives Added

- `lib/api/route-helpers.ts`
  - `requireApiUser()` for consistent route auth guard.
  - `readJson()` for structured request validation.
  - `jsonError()` / `fromZodError()` for normalized error envelopes.
- `lib/marketplace/storage-path.ts`
  - One `getStoragePathFromUrl()` implementation used by listing/backfill flows.
- `lib/marketplace/stripe-server.ts`
  - One `getMarketplaceStripe()` implementation used by checkout and webhook flows.
- `lib/connect/connect-client.ts`
  - Shared client-side connect API + telemetry helper for web surfaces.
- `lib/connect/connect-token.ts`
  - Shared token extraction helper for web connect pages.

## Cross-Surface Telemetry Normalization

- Web and mobile connect confirm calls now include `deviceContext`.
- `connect_session_confirmed` server telemetry now resolves platform from request `deviceContext` or persisted `last_device_context` instead of hardcoded `unknown`.
- Mobile share telemetry now includes `connectSessionId` when available.
- Mobile API error extraction now supports nested error objects (`error.message`).
