import type { MetadataRoute } from 'next'
import { getPublicSitemapOrigin } from '@/lib/config/public-surface'

export default function robots(): MetadataRoute.Robots {
  const host = getPublicSitemapOrigin()

  if (!host) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  return {
    rules: [{ userAgent: '*', allow: '/' }],
    host,
    sitemap: `${host}/sitemap.xml`,
  }
}

