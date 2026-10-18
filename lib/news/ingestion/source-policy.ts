import { isIP } from 'node:net'
import { canonicalizePublisherUrl } from '@/lib/news/ingestion/normalize-rss'

export interface ApprovedNewsSource {
  id: string
  name: string
  status: 'pending' | 'approved' | 'paused' | 'disabled'
  feedUrl: string
  publisherDomain: string
  allowedArticleDomains?: string[]
  rightsPolicy: 'link_only' | 'licensed'
}

/**
 * Registry metadata has to be saved by a trusted newsroom administrator.
 * This is only local input validation: it deliberately does not perform HTTP
 * fetching or DNS lookup, so it is not a complete SSRF defense.
 */
export function validatedHostname(urlText: string): string | null {
  const normalized = canonicalizePublisherUrl(urlText)
  if (!normalized) return null
  const url = new URL(normalized)
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!host || isIP(host) !== 0 || host.includes(':')) return null
  if (host === 'localhost' || host.endsWith('.localhost') ||
      host.endsWith('.local') || host.endsWith('.internal') ||
      host.endsWith('.test') || host.endsWith('.invalid')) return null
  // Require a plausible fully qualified DNS name; forbid wildcard domains.
  if (!host.includes('.') || host.startsWith('.') || host.endsWith('.')) return null
  return host
}

function registryDomain(value: string): string | null {
  const domain = value.toLowerCase().trim().replace(/\.$/, '')
  if (!/^[a-z0-9.-]{4,253}$/.test(domain) ||
      domain.startsWith('.') || domain.endsWith('.') || domain.includes('..') ||
      domain.split('.').length < 2 || domain.includes('*')) return null
  if (isIP(domain) !== 0 || domain.endsWith('.localhost') ||
      domain.endsWith('.internal') || domain.endsWith('.local')) return null
  return domain
}

export function isAllowedPublisherHost(hostname: string, approvedDomains: string[]): boolean {
  return approvedDomains.some(raw => {
    const domain = registryDomain(raw)
    return Boolean(domain && (hostname === domain || hostname.endsWith('.' + domain)))
  })
}

export function isApprovedSourceRegistryEntry(source: ApprovedNewsSource): boolean {
  if (source.status !== 'approved' || !source.id?.trim() || !source.name?.trim()) return false
  const feedHostname = validatedHostname(source.feedUrl)
  const publisherDomain = registryDomain(source.publisherDomain)
  return Boolean(feedHostname && publisherDomain)
}

export function isApprovedArticleFromSource(source: ApprovedNewsSource, articleUrl: string): boolean {
  if (!isApprovedSourceRegistryEntry(source)) return false
  const host = validatedHostname(articleUrl)
  return Boolean(host && isAllowedPublisherHost(host, [
    source.publisherDomain,
    ...(source.allowedArticleDomains || [])
  ]))
}
