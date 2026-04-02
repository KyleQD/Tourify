import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const host = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.tourify.live'
  const now = new Date().toISOString()
  return [
    { url: `${host}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${host}/events`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${host}/feed`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 }
  ]
}


