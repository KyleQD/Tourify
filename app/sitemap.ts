import type { MetadataRoute } from 'next'

import { getPublishedArticleSitemapEntries } from '@/lib/blog/public-articles'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { features } from '@/lib/marketing/features'
import { personas } from '@/lib/marketing/personas'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = process.env.NEXT_PUBLIC_SITE_URL || 'https://tourify.live'
  const now = new Date().toISOString()

  const entries: MetadataRoute.Sitemap = [
    { url: `${host}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${host}/news`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${host}/events`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${host}/community`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${host}/solutions`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...personas.map(p => ({
      url: `${host}/solutions/${p.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    { url: `${host}/features`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    ...features.map(f => ({
      url: `${host}/features/${f.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ]

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('[Sitemap] Skipping dynamic article entries because Supabase service credentials are unavailable.')
    return entries
  }

  const supabase = createServiceRoleClient()
  const articles = await getPublishedArticleSitemapEntries(supabase)

  return [
    ...entries,
    ...articles.map(article => ({
      url: `${host}/blog/${article.slug}`,
      lastModified: article.updatedAt || article.publishedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ]
}
