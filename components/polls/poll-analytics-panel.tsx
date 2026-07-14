'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, BarChart3 } from 'lucide-react'
import { useActingContext } from '@/hooks/use-acting-context'
import type { PollAnalyticsSummary } from '@/lib/polls/poll-analytics'
import { cn } from '@/lib/utils'

interface PollAnalyticsPanelProps {
  className?: string
  title?: string
}

export function PollAnalyticsPanel({
  className,
  title = 'Follower Polls',
}: PollAnalyticsPanelProps) {
  const { actingHeaders, isActingReady } = useActingContext()
  const [data, setData] = useState<PollAnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isActingReady) return

    let cancelled = false

    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/polls/analytics?limit=10', {
          credentials: 'include',
          headers: { ...actingHeaders },
        })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok || !payload.success)
          throw new Error(payload.error || 'Failed to load poll analytics')
        if (!cancelled) setData(payload.data)
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to load poll analytics')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [actingHeaders, isActingReady])

  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardContent className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading poll analytics...
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn(className)}>
        <CardContent className="py-8 text-sm text-destructive">{error}</CardContent>
      </Card>
    )
  }

  if (!data || data.totalPolls === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No polls yet. Create a poll in your feed to ask followers a question.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Total polls" value={String(data.totalPolls)} />
          <Metric label="Active" value={String(data.activePolls)} />
          <Metric label="Votes" value={String(data.totalVotes)} />
          <Metric label="Participation" value={`${data.participationRate}%`} />
        </div>

        <p className="text-xs text-muted-foreground">
          Avg {data.averageVotesPerPoll} votes/poll · {data.followerCount} followers
        </p>

        <div className="space-y-3">
          {data.recentPolls.slice(0, 5).map((poll) => (
            <div key={poll.id} className="rounded-md border border-border/60 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium leading-snug">{poll.question}</p>
                <Badge variant={poll.isClosed ? 'secondary' : 'outline'} className="shrink-0">
                  {poll.isClosed ? 'Closed' : 'Active'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{poll.totalVotes} votes</p>
              <div className="space-y-1.5">
                {poll.poll.options.map((option) => {
                  const percentage = poll.totalVotes > 0
                    ? (option.votes / poll.totalVotes) * 100
                    : 0
                  return (
                    <div key={option.id} className="space-y-1">
                      <div className="flex justify-between text-xs gap-2">
                        <span>{option.text}</span>
                        <span className="text-muted-foreground shrink-0">{percentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}
