'use client'

import { Button } from '@/components/ui/button'
import { SurfaceCard } from '@/components/surface/surface-primitives'
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
      <SurfaceCard className="p-10 text-center">
        <p className="text-lg text-white">No pulse stories match your filters.</p>
        <p className="mt-2 text-sm text-slate-400">Try changing facets or broadening your search.</p>
      </SurfaceCard>
    )

  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {items.map(item => (
          <NewsItemCard key={item.id} item={item} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            className="surface-chip"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? 'Loading...' : 'Load more'}
          </Button>
        </div>
      )}
    </section>
  )
}
