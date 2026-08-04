'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PostCreator } from './post-creator'
import { PostCard } from './post-card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { useFeed } from '@/hooks/use-feed'
import { useIntersectionObserver } from '@/hooks/use-intersection-observer'
import { usePostStyleFlags } from '@/hooks/use-post-style-flags'
import type { Json } from '@/lib/database.types'

function asPostMetadata(metadata: unknown): { [key: string]: Json | undefined } | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null
  }

  return metadata as { [key: string]: Json | undefined }
}

interface FeedListProps {
  feedType?: 'all' | 'following'
  showPostCreator?: boolean
}

export function FeedList({ feedType = 'all', showPostCreator = true }: FeedListProps) {
  const { flags } = usePostStyleFlags()
  const {
    posts,
    loading,
    error,
    hasMore,
    loadFeed,
    refreshFeed,
    loadMorePosts,
    deletePost
  } = useFeed()

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const isIntersecting = useIntersectionObserver(loadMoreRef)

  // Load initial feed
  useEffect(() => {
    loadFeed(true, feedType)
  }, [feedType])

  // Load more when scrolling to bottom
  useEffect(() => {
    if (isIntersecting && hasMore && !loading) {
      loadMorePosts()
    }
  }, [isIntersecting, hasMore, loading, loadMorePosts])

  const handlePostCreated = () => {
    // Post is already added optimistically by the hook
  }

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading feed...</span>
        </div>
      </div>
    )
  }

  if (error && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-slate-400 mb-4">
          Failed to load feed. Please try again.
        </p>
        <Button
          onClick={() => loadFeed(true, feedType)}
          variant="outline"
          className="border-slate-600 hover:bg-slate-700"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Post Creator */}
      {showPostCreator && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PostCreator onPostCreated={handlePostCreated} />
        </motion.div>
      )}

      {/* Feed Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          {feedType === 'following' ? 'Following' : 'Discover'}
        </h2>
        <Button
          onClick={refreshFeed}
          variant="ghost"
          size="sm"
          className="text-slate-400 hover:text-white"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Posts */}
      <AnimatePresence mode="popLayout">
        {posts.length === 0 && !loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="text-slate-400">
              <p className="text-lg mb-2">No posts yet</p>
              <p className="text-sm">
                {feedType === 'following'
                  ? 'Follow some artists to see their posts here'
                  : 'Be the first to share something with the community'}
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <PostCard
                  post={{
                    ...post,
                    metadata: asPostMetadata(post.metadata),
                    media_urls: post.media_urls || null
                  }}
                  onCommentClick={() => window.location.assign(`/posts/${post.id}`)}
                  onDelete={deletePost}
                  enablePostStyles={flags.post_styles_read}
                />
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Load More Trigger */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center py-8"
        >
          {loading && (
            <div className="flex items-center gap-2 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading more posts...</span>
            </div>
          )}
        </div>
      )}

      {/* End of Feed */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-slate-400">
          <p>You've reached the end of the feed</p>
        </div>
      )}
    </div>
  )
}
