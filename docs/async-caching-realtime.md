# Async work, caching, and Realtime

## Rate limiting (Upstash)

[`lib/utils/rate-limit.ts`](../lib/utils/rate-limit.ts) uses **Upstash Redis** when both are set:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

If either is missing, rate limiting **no-ops** (`check` always succeeds). For production at scale, **set both in Vercel** for routes that call `createRateLimiter`.

## Application cache (`REDIS_URL`)

[`lib/cache/redis-cache.ts`](../lib/cache/redis-cache.ts) can use **`REDIS_URL`** (ioredis) for cross-instance cache. Optional; memory fallback exists.

## Background / async work

Pattern for scale:

1. **Acknowledge** the user request quickly (validate, persist intent).
2. **Enqueue** work (Supabase Queues, external queue, or idempotent webhook + worker).
3. **Retry** with backoff; **dead-letter** poison messages.

Audit any route that sends **bulk email**, **fan-out notifications**, or **large exports** to ensure it does not block the HTTP response for unbounded time.

## Supabase Realtime

- [ ] Channels are **scoped** per user or resource (no global “listen to everything”).
- [ ] Payload sizes are bounded; large blobs use **Storage** + signed URLs, not Realtime payloads.
- [ ] Client **unsubscribes** on navigation to avoid leaking subscriptions.
