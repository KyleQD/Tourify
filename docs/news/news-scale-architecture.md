# News Scale Architecture

## Hybrid Fanout Strategy
- Hot entities use fanout-on-write.
- Long-tail entities use fanout-on-read.
- Decision helper: `lib/news/scale/hybrid-fanout.ts`

## Timeline Caching
- First-page slices are cached per `user + facet + query`.
- Cache helper: `lib/news/scale/timeline-cache.ts`
- Current implementation is in-memory TTL and should move to shared Redis/KV for multi-instance scale.

## Ingestion Track (Next Phase)
- External source ingestion workers
- Internal post/article ingestion workers
- Dedupe + entity-linking
- Moderation and trust labeling pipeline

## Productionization Steps
1. Replace in-memory timeline cache with shared Redis.
2. Move candidate generation to async workers.
3. Persist ranked feed events to analytics stream.
4. Add backpressure controls and per-source fetch budgets.
