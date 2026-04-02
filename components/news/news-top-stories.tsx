'use client'

import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SurfaceCard } from '@/components/surface/surface-primitives'
import type { NewsFeedItem } from '@/lib/news/types'

interface NewsTopStoriesProps {
  items: NewsFeedItem[]
}

export function NewsTopStories({ items }: NewsTopStoriesProps) {
  const topStories = items.slice(0, 3)

  if (!topStories.length) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Top Pulse Stories</h2>
        <p className="text-xs uppercase tracking-wide text-slate-400">Live signal</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {topStories.map(story => (
          <SurfaceCard key={story.id} className="bg-white/5">
            <CardHeader>
              <CardTitle className="line-clamp-2 text-base text-white">{story.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-3 text-sm text-slate-300">{story.summary}</p>
              <p className="mt-3 text-xs text-purple-300">{story.sourceName}</p>
            </CardContent>
          </SurfaceCard>
        ))}
      </div>
    </section>
  )
}
