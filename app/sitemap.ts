import type { MetadataRoute } from 'next'

import { getPublishedArticleSitemapEntries } from '@/lib/blog/public-articles'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = process.env.NEXT_PUBLIC_SITE_URL || 'https://tourify.live'
  const now = new Date().toISOString()
  const articles = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? await getPublishedArticleSitemapEntries(createServiceRoleClient())
    : []

  return [
    { url: `${host}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${host}/news`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${host}/events`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${host}/community`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    ...articles.map(article => ({
      url: `${host}/blog/${article.slug}`,
      lastModified: article.updatedAt || article.publishedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]
}
