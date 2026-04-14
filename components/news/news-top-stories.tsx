'use client'

import { Sparkles } from 'lucide-react'
import type { NewsFeedItem } from '@/lib/news/types'

interface NewsTopStoriesProps {
  items: NewsFeedItem[]
}

export function NewsTopStories({ items }: NewsTopStoriesProps) {
  const topStories = items.slice(0, 3)
  if (!topStories.length) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-fuchsia-400" />
          <h2 className="text-lg font-semibold text-white">Top Stories</h2>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {topStories.map(story => (
          <a
            key={story.id}
            href={story.url}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-all hover:border-white/20 hover:bg-white/[0.06]"
          >
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white group-hover:text-fuchsia-200">
              {story.title}
            </h3>
            <p className="line-clamp-2 flex-1 text-sm text-slate-400">{story.summary}</p>
            <span className="text-xs text-fuchsia-400">{story.sourceName}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
