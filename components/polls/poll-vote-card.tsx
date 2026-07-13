'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import type { PollPayload } from '@/lib/polls/hydrate-polls'
import {
  ARTIST_CARD,
  ARTIST_GHOST_CHIP,
  ARTIST_PROGRESS_FILL,
  ARTIST_PROGRESS_TRACK,
} from '@/components/dashboard/artist-tokens'

interface PollVoteCardProps {
  postId: string
  poll: PollPayload
  className?: string
  onVoted?: (poll: PollPayload) => void
}

export function PollVoteCard({ postId, poll: initialPoll, className, onVoted }: PollVoteCardProps) {
  const [poll, setPoll] = useState(initialPoll)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showResults = poll.viewerHasVoted || poll.isClosed
  const totalVotes = poll.totalVotes

  async function handleVote(optionId: string) {
    if (showResults || isSubmitting) return
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/posts/${postId}/poll/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ option_id: optionId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok)
        throw new Error(payload.error || 'Failed to cast vote')

      const nextPoll = payload.data as PollPayload
      setPoll(nextPoll)
      onVoted?.(nextPoll)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cast vote')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className={cn(ARTIST_CARD, 'mt-3', className)}>
      <CardContent className="space-y-3 p-4">
        <h3 className="text-sm font-semibold leading-snug text-white">{poll.question}</h3>
        <div className="space-y-2">
          {poll.options.map((option) => {
            const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0
            const isSelected = poll.viewerVotedOptionId === option.id

            if (showResults) {
              return (
                <div key={option.id} className="space-y-1.5">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className={cn('text-slate-200', isSelected && 'font-medium text-purple-200')}>
                      {option.text}
                    </span>
                    <span className="shrink-0 text-slate-400">{percentage.toFixed(0)}%</span>
                  </div>
                  <div className={ARTIST_PROGRESS_TRACK}>
                    <div
                      className={cn(
                        ARTIST_PROGRESS_FILL,
                        isSelected && 'from-purple-400 to-pink-500'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            }

            return (
              <Button
                key={option.id}
                type="button"
                variant="ghost"
                className={cn(
                  ARTIST_GHOST_CHIP,
                  'h-auto w-full justify-start whitespace-normal px-3 py-2.5 text-left text-slate-200'
                )}
                disabled={isSubmitting}
                onClick={() => handleVote(option.id)}
              >
                {option.text}
              </Button>
            )
          })}
        </div>

        <p className="text-xs text-slate-500">
          {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          {poll.endsAt
            ? poll.isClosed
              ? ' · Ended'
              : ` · Ends ${formatDistanceToNow(new Date(poll.endsAt), { addSuffix: true })}`
            : null}
        </p>

        {error && (
          <p className="text-xs text-rose-400">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
