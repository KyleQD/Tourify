# News Information Architecture

## Product Structure
- Top stories rail
- Personalized news stream
- Trending topic chips
- Source/trust indicators on every item

## Feed Facets
- `top`
- `following`
- `local`
- `industry`
- `gossip`
- `verified`

## Unified Card Contract
- `id`
- `title`
- `summary`
- `publishedAt`
- `sourceName`
- `sourceType` (`publisher`, `community`)
- `trustLabel` (`verified_source`, `community_report`, `developing_story`, `unverified`)
- `confidence`
- `topics`
- `metrics` (`likes`, `comments`, `shares`, `views`)
- `url`
- `imageUrl`
- `author`
- `score`

## Trust Model (Hybrid)
- Trusted publishers auto-ingest and auto-publish as `verified_source`.
- Community/internal content enters as `community_report` or `unverified`.
- Sensitive or high-risk gossip can be marked `developing_story`.

## Ranking Priorities
- Balanced external + internal blend
- Recency decay
- Source trust weighting
- Interest and subscription relevance
- Engagement velocity signal
- Diversity constraints by source and topic

## Scalability Path
- Candidate generation separated from feed serving
- Cursor-based pagination
- Hybrid fanout strategy (write for hot entities, read for long-tail)
- Per-user timeline caching for first page and hot scroll windows
