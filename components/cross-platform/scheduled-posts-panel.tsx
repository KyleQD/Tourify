'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { useCrossPlatformPosting } from '@/hooks/use-cross-platform-posting'
import { CalendarDays, Clock3, Copy, Trash2, RotateCcw, Loader2 } from 'lucide-react'
import { crossPlatformPostingService } from '@/lib/services/cross-platform-posting.service'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

export function ScheduledPostsPanel() {
  const { scheduledPosts, cancelScheduledPost, duplicatePost, getFilteredPosts, refreshData } = useCrossPlatformPosting({ autoRefresh: false })
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'posting' | 'completed' | 'failed' | 'cancelled'>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [autoRefreshLabel, setAutoRefreshLabel] = useState<'Idle' | 'Refreshing'>('Idle')

  const visible = useMemo(() => {
    if (statusFilter === 'all') return scheduledPosts
    return getFilteredPosts({ status: statusFilter })
  }, [scheduledPosts, statusFilter, getFilteredPosts])

  // Background polling for live updates
  useEffect(() => {
    let mounted = true
    const tick = async () => {
      if (!mounted) return
      setIsRefreshing(true)
      setAutoRefreshLabel('Refreshing')
      try { await refreshData() } finally { if (mounted) setIsRefreshing(false) }
      if (mounted) setAutoRefreshLabel('Idle')
    }
    // initial
    tick()
    const id = setInterval(tick, 8000)
    return () => { mounted = false; clearInterval(id) }
  }, [refreshData])

  const platforms = ['instagram','facebook','youtube','tiktok','twitter'] as const
  const statusColor = (status: string) => {
    if (status === 'completed') return 'bg-green-500/20 text-green-300 border-green-500/30'
    if (status === 'posting') return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    if (status === 'failed') return 'bg-red-500/20 text-red-300 border-red-500/30'
    if (status === 'cancelled') return 'bg-slate-600/30 text-slate-300 border-slate-500/30'
    return 'bg-slate-700/30 text-slate-300 border-slate-600/30'
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-200">Scheduled Posts</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1"><Loader2 className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />{autoRefreshLabel}</Badge>
            <Label className="text-slate-400 text-sm">Status</Label>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[160px] bg-slate-800/50 border-slate-700/50 text-slate-200"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['all','scheduled','posting','completed','failed','cancelled'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="border-slate-700/50 rounded-xl" onClick={refreshData} disabled={isRefreshing}>Refresh</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.length === 0 ? (
          <p className="text-sm text-slate-400">No scheduled posts.</p>
        ) : (
          visible.map(post => (
            <div key={post.id} className={`p-3 rounded-lg border border-slate-700/50 bg-slate-800/40 flex items-center justify-between ${isRefreshing ? 'opacity-90' : ''}`}>
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{post.post_type}</Badge>
                  <Badge variant="secondary" className="capitalize">{post.status}</Badge>
                </div>
                <p className="text-slate-200 mt-1 line-clamp-2">{post.content}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatSafeDate(post.scheduled_for)}</span>
                  <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(post.scheduled_for))}</span>
                  <span>{post.target_accounts.length} accounts</span>
                </div>
                {/* Per-platform chips (mocked from analytics/status fields if available) */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {platforms.map(p => {
                    const ps = (post as any).platform_status?.[p] || post.status
                    const err = (post as any).platform_errors?.[p]
                    return (
                      <TooltipProvider key={`${post.id}-${p}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] capitalize cursor-default inline-flex items-center gap-1 ${statusColor(ps)}`}>
                              {ps === 'posting' && <Loader2 className="h-3 w-3 animate-spin" />}
                              {p}: {ps}
                            </span>
                          </TooltipTrigger>
                          {err && (
                            <TooltipContent>
                              <div className="max-w-[240px] text-xs">{String(err)}</div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    )
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => duplicatePost(post.id)}> <Copy className="h-4 w-4 mr-1" /> Duplicate</Button>
                {post.status === 'scheduled' && (
                  <Button size="sm" variant="destructive" className="rounded-xl" onClick={() => cancelScheduledPost(post.id)}>
                    <Trash2 className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                )}
                {post.status === 'failed' && (
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={async () => {
                    await crossPlatformPostingService.postToProviders(post.content, post.media_urls || [], undefined, undefined, post.id)
                  }}>
                    <RotateCcw className="h-4 w-4 mr-1" /> Retry
                  </Button>
                )}
                {/* Per-platform retry actions */}
                {(post as any).platform_status && (
                  <div className="flex items-center gap-1 ml-1">
                    {platforms.map(p => {
                      const ps = (post as any).platform_status?.[p]
                      if (ps !== 'failed') return null
                      return (
                        <Button key={`${post.id}-retry-${p}`} size="sm" variant="outline" className="h-7 px-2 text-[10px] rounded-xl"
                          onClick={async () => {
                            await crossPlatformPostingService.postToProviders(post.content, post.media_urls || [], [p], undefined, post.id)
                          }}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> {p}
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default ScheduledPostsPanel


