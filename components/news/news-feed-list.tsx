'use client'

import { Loader2, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { NewsItemCard } from '@/components/news/news-item-card'
import type { NewsFeedItem } from '@/lib/news/types'

interface NewsFeedListProps {
  items: NewsFeedItem[]
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
}

export function NewsFeedList({ items, hasMore, isLoadingMore, onLoadMore }: NewsFeedListProps) {
  if (!items.length)
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
        <Sparkles className="mx-auto mb-3 h-8 w-8 text-slate-500" />
        <p className="text-lg font-medium text-white">No stories match your filters</p>
        <p className="mt-1 text-sm text-slate-400">Try changing facets or broadening your search.</p>
      </div>
    )

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(item => (
          <NewsItemCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl border-white/15 bg-white/5 px-8 text-slate-200 hover:bg-white/10"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </section>
  )
}
