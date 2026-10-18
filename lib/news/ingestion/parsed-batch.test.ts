import { prepareApprovedNewsBatch } from '@/lib/news/ingestion/parsed-batch'
import { isApprovedArticleFromSource, validatedHostname } from '@/lib/news/ingestion/source-policy'
import type { ApprovedNewsSource } from '@/lib/news/ingestion/source-policy'

const source: ApprovedNewsSource = {
  id: 'a1200000-0000-4000-8000-000000000001',
  name: 'Festival Music Review',
  status: 'approved',
  feedUrl: 'https://feeds.festivalmusicreview.com/rss',
  publisherDomain: 'festivalmusicreview.com',
  rightsPolicy: 'link_only'
}
const event = {
  title: 'Band Orion announces three European dates for its 2027 tour',
  link: 'https://festivalmusicreview.com/news/orion-2027?utm_source=rss',
  publishedAt: '2026-10-10T12:00:00Z',
  summary: '<p>Source article summary</p>',
  imageUrl: 'https://festivalmusicreview.com/image.jpg'
}

describe('trusted parsed RSS boundary', () => {
  it('accepts an approved feed while leaving coverage unpublished', () => {
    const result = prepareApprovedNewsBatch(source, [event])
    expect(result).toMatchObject({ examined: 1, rejected: 0, duplicates: 0 })
    expect(result.accepted[0]).toMatchObject({
      publication_state: 'pending', moderation_state: 'pending',
      rights_state: 'link_only', visibility: 'private', excerpt: '', image_url: null
    })
  })

  it('deduplicates tracked URLs in the same import batch', () => {
    const result = prepareApprovedNewsBatch(source, [
      event, { ...event, link: 'https://festivalmusicreview.com/news/orion-2027?utm_medium=social' }
    ])
    expect(result.accepted).toHaveLength(1)
    expect(result.duplicates).toBe(1)
  })

  it('rejects a parked source or a non-registered publisher domain', () => {
    expect(prepareApprovedNewsBatch({ ...source, status: 'paused' }, [event]).accepted).toHaveLength(0)
    expect(isApprovedArticleFromSource(source, 'https://festivalmusicreview.com.evil.test/news')).toBe(false)
    expect(prepareApprovedNewsBatch(source, [
      { ...event, link: 'https://not-my-publisher.org/news/orion' }
    ]).rejected).toBe(1)
  })

  it('accepts an explicitly approved syndication article domain', () => {
    const licensed = { ...source, allowedArticleDomains: ['syndication.example.org'] }
    expect(isApprovedArticleFromSource(licensed, 'https://music.syndication.example.org/story')).toBe(true)
  })

  it('rejects local and literal IP URLs', () => {
    expect(validatedHostname('https://127.0.0.1/secret')).toBeNull()
    expect(validatedHostname('https://[::1]/secret')).toBeNull()
    expect(validatedHostname('https://localhost/secret')).toBeNull()
  })

  it('caps input and never copies third-party article content for link-only sources', () => {
    const result = prepareApprovedNewsBatch(source, Array.from({ length: 150 }, (_, i) => ({
      ...event, link: 'https://festivalmusicreview.com/story/' + i
    })))
    expect(result.examined).toBe(100)
    expect(result.accepted).toHaveLength(100)
    expect(result.accepted.every(item => item.excerpt === '' && item.image_url === null)).toBe(true)
  })
})
