import type { NewsFeedCursor, NewsFeedItem } from '@/lib/news/types'

const ONE_HOUR_MS = 60 * 60 * 1000

interface RankNewsItemParams {
  item: NewsFeedItem
  subscribedTopics: Set<string>
  subscribedSourceNames: Set<string>
  interactionTopics: Set<string>
  preferredLocations: Set<string>
}

export function rankNewsItem({
  item,
  subscribedTopics,
  subscribedSourceNames,
  interactionTopics,
  preferredLocations
}: RankNewsItemParams): NewsFeedItem {
  const ageHours = Math.max(1, (Date.now() - new Date(item.publishedAt).getTime()) / ONE_HOUR_MS)
  const recencyWeight = Math.max(0.05, 1 / Math.sqrt(ageHours))
  const trustWeight = item.moderation.confidence
  const topicMatches = item.topics.filter(topic => subscribedTopics.has(topic.toLowerCase())).length
  const interactionTopicMatches = item.topics.filter(topic => interactionTopics.has(topic.toLowerCase())).length
  const sourceAffinity = subscribedSourceNames.has(item.sourceName.toLowerCase()) ? 1 : 0
  const locationAffinity = hasLocationAffinity({ item, preferredLocations }) ? 1 : 0

  const rawEngagement = item.metrics.likes + item.metrics.comments * 1.25 + item.metrics.shares * 1.5 + item.metrics.views * 0.01
  const normalizedEngagement = Math.min(1, rawEngagement / 500)
  const normalizedTopic = Math.min(1, topicMatches / 3)
  const normalizedInteractionTopic = Math.min(1, interactionTopicMatches / 3)

  const score = Number(
    (
      recencyWeight * 0.33 +
      trustWeight * 0.25 +
      normalizedTopic * 0.18 +
      normalizedInteractionTopic * 0.12 +
      locationAffinity * 0.07 +
      sourceAffinity * 0.1 +
      normalizedEngagement * 0.05
    ).toFixed(6)
  )

  return {
    ...item,
    relevanceScore: Number((normalizedTopic + normalizedInteractionTopic + locationAffinity * 0.35 + sourceAffinity * 0.5).toFixed(6)),
    score
  }
}

function hasLocationAffinity(params: { item: NewsFeedItem; preferredLocations: Set<string> }): boolean {
  if (!params.preferredLocations.size) return false

  const searchableText = `${params.item.title} ${params.item.summary} ${params.item.sourceName} ${params.item.topics.join(' ')}`.toLowerCase()
  for (const token of params.preferredLocations) {
    if (token.length < 3) continue
    if (searchableText.includes(token)) return true
  }

  return false
}

export function encodeNewsCursor(cursor: NewsFeedCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeNewsCursor(encodedCursor?: string): NewsFeedCursor | null {
  if (!encodedCursor) return null

  try {
    const parsed = JSON.parse(Buffer.from(encodedCursor, 'base64url').toString('utf8')) as NewsFeedCursor
    if (!parsed?.id || !parsed.publishedAt) return null
    return parsed
  } catch {
    return null
  }
}

export function sortNewsByScore(items: NewsFeedItem[]): NewsFeedItem[] {
  return [...items].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const byDate = new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    if (byDate !== 0) return byDate
    return b.id.localeCompare(a.id)
  })
}

export function applyCursorPagination(params: {
  items: NewsFeedItem[]
  cursor: NewsFeedCursor | null
  limit: number
}): { pageItems: NewsFeedItem[]; nextCursor: string | null } {
  const { items, cursor, limit } = params

  const filteredItems = !cursor
    ? items
    : items.filter(item => {
        if (item.score < cursor.score) return true
        if (item.score > cursor.score) return false

        const itemTime = new Date(item.publishedAt).getTime()
        const cursorTime = new Date(cursor.publishedAt).getTime()
        if (itemTime < cursorTime) return true
        if (itemTime > cursorTime) return false

        return item.id < cursor.id
      })

  const pageItems = filteredItems.slice(0, limit)
  const lastItem = pageItems.at(-1)

  if (!lastItem) return { pageItems, nextCursor: null }

  const nextCursor = encodeNewsCursor({
    id: lastItem.id,
    publishedAt: lastItem.publishedAt,
    score: lastItem.score
  })

  return { pageItems, nextCursor }
}
