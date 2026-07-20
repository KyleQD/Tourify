'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

interface ArticleActionBarProps {
  articleId: string
  articleTitle: string
  canonicalPath: string
  metrics: {
    likes: number
    comments: number
    shares: number
  }
}

function likedStorageKey(articleId: string) {
  return `tourify:article-liked:${articleId}`
}

export function ArticleActionBar({
  articleId,
  articleTitle,
  canonicalPath,
  metrics,
}: ArticleActionBarProps) {
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [likes, setLikes] = useState(metrics.likes)
  const [shares, setShares] = useState(metrics.shares)
  const [isEngaging, setIsEngaging] = useState(false)

  useEffect(() => {
    setLikes(metrics.likes)
    setShares(metrics.shares)
  }, [metrics.likes, metrics.shares])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      setLiked(localStorage.getItem(likedStorageKey(articleId)) === '1')
    } catch {
      setLiked(false)
    }
  }, [articleId])

  const currentUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return new URL(canonicalPath, window.location.origin).toString()
  }, [canonicalPath])

  async function engage(action: 'like' | 'unlike' | 'share') {
    const response = await fetch(`/api/pulse/articles/${articleId}/engage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data?.success)
      throw new Error(data?.error || 'Unable to update engagement')
    if (data.stats) {
      setLikes(Number(data.stats.likes || 0))
      setShares(Number(data.stats.shares || 0))
    }
  }

  async function handleLike() {
    if (isEngaging) return
    const nextLiked = !liked
    setIsEngaging(true)
    setLiked(nextLiked)
    setLikes(previous => Math.max(0, previous + (nextLiked ? 1 : -1)))

    try {
      await engage(nextLiked ? 'like' : 'unlike')
      try {
        if (nextLiked) localStorage.setItem(likedStorageKey(articleId), '1')
        else localStorage.removeItem(likedStorageKey(articleId))
      } catch {
        // ignore storage failures
      }
    } catch {
      setLiked(!nextLiked)
      setLikes(previous => Math.max(0, previous + (nextLiked ? -1 : 1)))
      toast.error('Unable to update like right now')
    } finally {
      setIsEngaging(false)
    }
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: articleTitle,
          url: currentUrl,
        })
      } else if (currentUrl) {
        await navigator.clipboard.writeText(currentUrl)
        toast.success('Article link copied')
      }

      await engage('share')
    } catch {
      toast.error('Unable to share this article right now')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        className="rounded-full border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
        onClick={() => void handleLike()}
        disabled={isEngaging}
      >
        <Heart className={`mr-2 h-4 w-4 ${liked ? 'fill-current text-rose-400' : ''}`} />
        {likes}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="rounded-full border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
        onClick={() => toast.message('Comments are routed through the shared feed and will appear here next.')}
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        {metrics.comments}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="rounded-full border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
        onClick={() => void handleShare()}
      >
        <Share2 className="mr-2 h-4 w-4" />
        {shares}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="rounded-full border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
        onClick={() => {
          setSaved(previous => {
            const next = !previous
            toast.success(next ? 'Saved for later' : 'Removed from saved items')
            return next
          })
        }}
      >
        <Bookmark className={`mr-2 h-4 w-4 ${saved ? 'fill-current text-cyan-300' : ''}`} />
        Save
      </Button>
    </div>
  )
}
