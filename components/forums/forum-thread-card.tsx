'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowBigUp, ArrowBigDown, MessageCircle, Plus } from 'lucide-react'

interface Author {
  id: string
  username: string
  avatar_url?: string
  is_verified?: boolean
}

interface ForumMeta {
  slug: string
  name: string
}

interface ForumThreadCardProps {
  id: string
  forum?: ForumMeta
  title: string
  description?: string
  score: number
  comments: number
  createdAt: string
  author?: Author
  onOpen?: () => void
  initialVote?: -1 | 0 | 1
  initialComments?: number
}

export function ForumThreadCard({ id, forum, title, description, score, comments, createdAt, author, onOpen, initialVote = 0, initialComments }: ForumThreadCardProps) {
  const [optimisticScore, setOptimisticScore] = useState(score)
  const [vote, setVote] = useState<0 | 1 | -1>(initialVote || 0)
  const [commentsCount, setCommentsCount] = useState<number>(typeof initialComments === 'number' ? initialComments : comments)
  const [loading, setLoading] = useState(false)

  async function handleVote(next: 1 | -1) {
    if (loading) return
    setLoading(true)
    try {
      const same = vote === next
      const method = same ? 'DELETE' : 'POST'
      const body = same ? undefined : JSON.stringify({ value: next })
      const res = await fetch(`/api/forums/threads/${id}/vote`, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body })
      if (!res.ok) throw new Error('vote_failed')
      if (same) {
        setOptimisticScore(s => s - vote)
        setVote(0)
      } else {
        setOptimisticScore(s => s - vote + next)
        setVote(next)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    function onCommentPosted(e: any) {
      try {
        if (e?.detail?.threadId === id) setCommentsCount(c => c + 1)
      } catch {}
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('forum:comment-posted', onCommentPosted as any)
      return () => window.removeEventListener('forum:comment-posted', onCommentPosted as any)
    }
  }, [id])

  return (
    <Card className="bg-slate-900/50 border-slate-800/50 rounded-2xl">
      <CardContent className="p-4 md:p-6">
        <div className="flex gap-4">
          <div className="flex flex-col items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => handleVote(1)} disabled={loading} className={vote === 1 ? 'text-emerald-400' : 'text-slate-400'}>
              <ArrowBigUp className="h-5 w-5" />
            </Button>
            <div className="text-slate-200 text-sm font-medium">{optimisticScore}</div>
            <Button size="icon" variant="ghost" onClick={() => handleVote(-1)} disabled={loading} className={vote === -1 ? 'text-rose-400' : 'text-slate-400'}>
              <ArrowBigDown className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-400 mb-1">
              {forum && (
                <>in <a href={`/forums/${forum.slug}`} className="text-purple-300 hover:text-purple-200">{forum.name}</a></>
              )}
            </div>
            <div className="text-white text-lg font-semibold mb-1 line-clamp-2">{title}</div>
            {description && (
              <div className="text-slate-300 text-sm mb-2 line-clamp-3">{description}</div>
            )}
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{commentsCount} comments</span>
              </div>
              <div>
                {new Intl.DateTimeFormat("en-US", {
                  year: "numeric",
                  month: "numeric",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(createdAt))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


