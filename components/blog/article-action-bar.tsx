'use client'

import { useMemo, useState } from 'react'
import { Bookmark, Heart, MessageCircle, Share2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

interface ArticleActionBarProps {
  articleTitle: string
  canonicalPath: string
  metrics: {
    likes: number
    comments: number
    shares: number
  }
}

export function ArticleActionBar({ articleTitle, canonicalPath, metrics }: ArticleActionBarProps) {
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)

  const currentUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return new URL(canonicalPath, window.location.origin).toString()
  }, [canonicalPath])

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
        onClick={() => setLiked(previous => !previous)}
      >
        <Heart className={`mr-2 h-4 w-4 ${liked ? 'fill-current text-rose-400' : ''}`} />
        {metrics.likes + (liked ? 1 : 0)}
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
        onClick={handleShare}
      >
        <Share2 className="mr-2 h-4 w-4" />
        {metrics.shares}
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
