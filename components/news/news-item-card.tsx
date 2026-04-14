'use client'

import { ExternalLink, MessageCircle, Share2, ShieldCheck, ShieldAlert, ShieldQuestion, Clock3, ThumbsUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { Badge } from '@/components/ui/badge'
import type { NewsFeedItem } from '@/lib/news/types'

interface NewsItemCardProps {
  item: NewsFeedItem
}

function getTrustBadgeMeta(item: NewsFeedItem) {
  if (item.moderation.trustLabel === 'verified_source')
    return {
      label: 'Verified',
      icon: ShieldCheck,
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    }

  if (item.moderation.trustLabel === 'community_report')
    return {
      label: 'Community',
      icon: ShieldAlert,
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-400'
    }

  if (item.moderation.trustLabel === 'developing_story')
    return {
      label: 'Developing',
      icon: Clock3,
      className: 'border-blue-500/30 bg-blue-500/10 text-blue-400'
    }

  return {
    label: 'Unverified',
    icon: ShieldQuestion,
    className: 'border-slate-500/30 bg-slate-500/10 text-slate-400'
  }
}

export function NewsItemCard({ item }: NewsItemCardProps) {
  const trustMeta = getTrustBadgeMeta(item)
  const TrustIcon = trustMeta.icon

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06]">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline" className={`text-[10px] ${trustMeta.className}`}>
          <TrustIcon className="mr-1 h-3 w-3" />
          {trustMeta.label}
        </Badge>
        <span className="shrink-0 text-xs text-slate-500">
          {formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}
        </span>
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">{item.title}</h3>

      <p className="line-clamp-2 flex-1 text-sm text-slate-400">{item.summary}</p>

      <div className="flex flex-wrap gap-1.5">
        {item.topics.slice(0, 3).map(topic => (
          <span key={topic} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
            {topic}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-white/5 pt-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{item.sourceName}</span>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            {item.metrics.likes > 0 && (
              <span className="inline-flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                {item.metrics.likes}
              </span>
            )}
            {item.metrics.comments > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {item.metrics.comments}
              </span>
            )}
            {item.metrics.shares > 0 && (
              <span className="inline-flex items-center gap-1">
                <Share2 className="h-3 w-3" />
                {item.metrics.shares}
              </span>
            )}
          </div>
        </div>

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/20 hover:text-white"
          >
            Open
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )
}
