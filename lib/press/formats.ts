export type PressFormat = 'blog' | 'article' | 'press_release'

export interface PressDistribution {
  feed: boolean
  news: boolean
  recipients_only: boolean
}

export const PRESS_FORMATS: PressFormat[] = ['blog', 'article', 'press_release']

export const PRESS_FORMAT_LABELS: Record<PressFormat, string> = {
  blog: 'Blog',
  article: 'Article',
  press_release: 'Press Release',
}

export function isPressFormat(value: unknown): value is PressFormat {
  return value === 'blog' || value === 'article' || value === 'press_release'
}

export function parsePressFormat(value: unknown, fallback: PressFormat = 'blog'): PressFormat {
  return isPressFormat(value) ? value : fallback
}

export function defaultDistributionForFormat(format: PressFormat): PressDistribution {
  if (format === 'article')
    return { feed: false, news: true, recipients_only: false }
  if (format === 'press_release')
    return { feed: false, news: false, recipients_only: true }
  return { feed: true, news: false, recipients_only: false }
}

export function normalizeDistribution(
  value: unknown,
  format: PressFormat
): PressDistribution {
  const defaults = defaultDistributionForFormat(format)
  if (!value || typeof value !== 'object') return defaults

  const row = value as Record<string, unknown>
  return {
    feed: typeof row.feed === 'boolean' ? row.feed : defaults.feed,
    news: typeof row.news === 'boolean' ? row.news : defaults.news,
    recipients_only:
      typeof row.recipients_only === 'boolean' ? row.recipients_only : defaults.recipients_only,
  }
}

export function shouldSyncToFeed(format: PressFormat, distribution: PressDistribution) {
  return format === 'blog' && distribution.feed
}

export function shouldIncludeInNews(format: PressFormat, distribution: PressDistribution) {
  return format === 'article' && distribution.news
}

export function publicUrlForPressItem(input: { format: PressFormat; slug: string; id: string }) {
  if (input.format === 'press_release') return `/artist/press/releases/${input.id}`
  if (input.format === 'article') return `/blog/${input.slug}`
  return `/blog/${input.slug}`
}
