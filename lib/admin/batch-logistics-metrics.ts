export interface LogisticsMetricsSummary {
  percentage: number
  completed: number
  items: number
  status: string
}

function summarizeCategories(metrics: Record<string, { items?: number; completed?: number }>): LogisticsMetricsSummary {
  const categories = Object.values(metrics || {})
  const totalItems = categories.reduce((sum, category) => sum + (category.items || 0), 0)
  const totalCompleted = categories.reduce((sum, category) => sum + (category.completed || 0), 0)
  const percentage = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0
  return {
    percentage,
    completed: totalCompleted,
    items: totalItems,
    status: percentage === 100 ? "Complete" : percentage > 0 ? "In Progress" : "Not Started",
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex
      nextIndex += 1
      results[current] = await mapper(items[current])
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

/** Fetch logistics metrics for many events with bounded concurrency (avoids N+1 UI storms). */
export async function fetchEventLogisticsBatch(
  eventIds: string[],
  concurrency = 4
): Promise<Record<string, LogisticsMetricsSummary>> {
  if (!eventIds.length) return {}

  const pairs = await mapWithConcurrency(eventIds, concurrency, async (eventId) => {
    try {
      const response = await fetch(`/api/admin/logistics/metrics?eventId=${eventId}`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!response.ok) return [eventId, null] as const
      const data = await response.json()
      return [eventId, summarizeCategories(data.metrics || {})] as const
    } catch {
      return [eventId, null] as const
    }
  })

  const result: Record<string, LogisticsMetricsSummary> = {}
  for (const [id, summary] of pairs) {
    if (summary) result[id] = summary
  }
  return result
}

/** Fetch tour logistics summaries with bounded concurrency. */
export async function fetchTourLogisticsBatch(
  tourIds: string[],
  concurrency = 4
): Promise<Record<string, LogisticsMetricsSummary>> {
  if (!tourIds.length) return {}

  const pairs = await mapWithConcurrency(tourIds, concurrency, async (tourId) => {
    try {
      const response = await fetch(`/api/admin/tours/${tourId}/logistics-summary`, {
        credentials: "include",
        cache: "no-store",
      })
      if (!response.ok) return [tourId, null] as const
      const data = await response.json()
      const percentage = Number(data.percentage ?? data.completion_percentage ?? 0)
      const completed = Number(data.completed ?? data.completed_tasks ?? 0)
      const items = Number(data.items ?? data.total_tasks ?? 0)
      return [
        tourId,
        {
          percentage,
          completed,
          items,
          status: percentage === 100 ? "Complete" : percentage > 0 ? "In Progress" : "Not Started",
        },
      ] as const
    } catch {
      return [tourId, null] as const
    }
  })

  const result: Record<string, LogisticsMetricsSummary> = {}
  for (const [id, summary] of pairs) {
    if (summary) result[id] = summary
  }
  return result
}
