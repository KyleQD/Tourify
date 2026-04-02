interface NewsFeedTelemetryParams {
  facet: string
  userId?: string
  itemCount: number
  latencyMs: number
  cacheHit: boolean
}

export function trackNewsFeedServed(params: NewsFeedTelemetryParams) {
  console.info('[NewsFeedTelemetry] feed_served', {
    facet: params.facet,
    user_id: params.userId || 'anonymous',
    item_count: params.itemCount,
    latency_ms: params.latencyMs,
    cache_hit: params.cacheHit
  })
}
