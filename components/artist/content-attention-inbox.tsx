'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  Clock,
  FileText,
  Music2,
  ShieldAlert,
  RefreshCcw,
} from 'lucide-react'
import type { ContentHubOverviewResponse } from '@/app/api/artist/content/overview/route'

interface ContentAttentionInboxProps {
  overview: ContentHubOverviewResponse | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  onOpenComposeTriage: (opts: { status?: string; postId?: string }) => void
  onOpenTab: (tab: 'compose' | 'socials' | 'analytics') => void
}

export function ContentAttentionInbox({
  overview,
  isLoading = false,
  error = null,
  onRetry,
  onOpenComposeTriage,
  onOpenTab,
}: ContentAttentionInboxProps) {
  if (error) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="py-8 space-y-3">
          <p className="text-sm text-red-300">{error}</p>
          {onRetry && (
            <Button variant="outline" className="rounded-xl border-slate-700" onClick={onRetry}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !overview) {
    return (
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardContent className="py-8 text-sm text-slate-400">Loading attention items...</CardContent>
      </Card>
    )
  }

  const { attention, failedPosts, expiringIntegrations } = overview
  const hasItems =
    attention.failedScheduledPosts > 0 ||
    attention.blogDrafts > 0 ||
    attention.unpublishedMusic > 0 ||
    attention.oauthExpiringSoon > 0 ||
    attention.oauthExpired > 0

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-xl">
      <CardHeader>
        <CardTitle className="text-slate-200 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          Needs attention
        </CardTitle>
        <CardDescription className="text-slate-400">
          Failed posts, drafts, and OAuth health in one place
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            type="button"
            aria-label={`${attention.failedScheduledPosts} failed posts`}
            onClick={() => onOpenComposeTriage({ status: 'failed' })}
            className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3 text-left hover:border-amber-500/40"
          >
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Failed posts</p>
            <p className="mt-1 text-xl font-semibold text-white">{attention.failedScheduledPosts}</p>
          </button>
          <Link
            href="/artist/press?status=draft"
            aria-label={`${attention.blogDrafts} blog drafts`}
            className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3 hover:border-orange-500/40"
          >
            <p className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Press drafts
            </p>
            <p className="mt-1 text-xl font-semibold text-white">{attention.blogDrafts}</p>
          </Link>
          <Link
            href="/artist/music"
            className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3 hover:border-purple-500/40"
          >
            <p className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <Music2 className="h-3 w-3" /> Unpublished music
            </p>
            <p className="mt-1 text-xl font-semibold text-white">{attention.unpublishedMusic}</p>
          </Link>
          <button
            type="button"
            aria-label={`${attention.oauthExpired + attention.oauthExpiringSoon} OAuth issues`}
            onClick={() => onOpenTab('socials')}
            className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3 text-left hover:border-red-500/40"
          >
            <p className="text-[11px] uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> OAuth issues
            </p>
            <p className="mt-1 text-xl font-semibold text-white">
              {attention.oauthExpired + attention.oauthExpiringSoon}
            </p>
          </button>
        </div>

        {!hasItems ? (
          <p className="text-sm text-slate-400">All clear — nothing needs attention right now.</p>
        ) : (
          <div className="space-y-3">
            {failedPosts.slice(0, 3).map(post => (
              <div
                key={post.id}
                className="rounded-xl border border-red-500/20 bg-red-500/5 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge className="border-red-500/30 bg-red-500/10 text-red-300">Failed</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-slate-700"
                    onClick={() => onOpenComposeTriage({ status: 'failed', postId: post.id })}
                  >
                    Review
                  </Button>
                </div>
                <p className="mt-2 text-sm text-slate-200 line-clamp-2">{post.content || 'Untitled scheduled post'}</p>
                {post.error_details && (
                  <p className="mt-1 text-xs text-red-300/80 line-clamp-2">{post.error_details}</p>
                )}
              </div>
            ))}

            {expiringIntegrations.slice(0, 4).map(item => (
              <div
                key={`${item.platform}-${item.account_handle}`}
                className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 p-3"
              >
                <div>
                  <p className="text-sm text-slate-200 capitalize">
                    {item.platform} · {item.account_handle}
                  </p>
                  <p className="text-xs text-amber-300/80 flex items-center gap-1 mt-1">
                    <Clock className="h-3 w-3" />
                    {item.daysUntilExpiry != null && item.daysUntilExpiry < 0
                      ? 'Token expired — reconnect'
                      : item.daysUntilExpiry != null
                        ? `Expires in ${item.daysUntilExpiry} day(s)`
                        : 'Reconnect recommended'}
                  </p>
                </div>
                <Button size="sm" className="rounded-xl" onClick={() => onOpenTab('socials')}>
                  Reconnect
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
