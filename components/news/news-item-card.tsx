'use client'

import { ExternalLink, MessageCircle, Share2, ShieldCheck, ShieldAlert, ShieldQuestion, Clock3, ThumbsUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import type { NewsFeedItem } from '@/lib/news/types'

interface NewsItemCardProps {
  item: NewsFeedItem
}

function getTrustBadgeMeta(item: NewsFeedItem) {
  if (item.moderation.trustLabel === 'verified_source')
    return {
      label: 'Verified Source',
      icon: ShieldCheck,
      className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    }

  if (item.moderation.trustLabel === 'community_report')
    return {
      label: 'Community Report',
      icon: ShieldAlert,
      className: 'border-amber-500/40 bg-amber-500/10 text-amber-300'
    }

  if (item.moderation.trustLabel === 'developing_story')
    return {
      label: 'Developing Story',
      icon: Clock3,
      className: 'border-blue-500/40 bg-blue-500/10 text-blue-300'
    }

  return {
    label: 'Unverified',
    icon: ShieldQuestion,
    className: 'border-slate-500/40 bg-slate-500/10 text-slate-300'
  }
}

export function NewsItemCard({ item }: NewsItemCardProps) {
  const trustMeta = getTrustBadgeMeta(item)
  const TrustIcon = trustMeta.icon

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm transition-colors hover:border-purple-400/30">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Badge className={trustMeta.className}>
            <TrustIcon className="mr-1.5 h-3.5 w-3.5" />
            {trustMeta.label}
          </Badge>
          <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(item.publishedAt), { addSuffix: true })}</p>
        </div>
        <CardTitle className="text-balance text-white">{item.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="line-clamp-3 text-sm text-slate-300">{item.summary}</p>
        <div className="flex flex-wrap gap-2">
          {item.topics.slice(0, 4).map(topic => (
            <Badge key={topic} variant="outline" className="border-purple-500/30 text-xs text-purple-200">
              {topic}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400">
          <p>{item.sourceName}</p>
          <p>{Math.round(item.moderation.confidence * 100)}% confidence</p>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <ThumbsUp className="h-3.5 w-3.5" />
            {item.metrics.likes}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {item.metrics.comments}
          </span>
          <span className="inline-flex items-center gap-1">
            <Share2 className="h-3.5 w-3.5" />
            {item.metrics.shares}
          </span>
        </div>

        {item.url && (
          <Button asChild variant="ghost" size="sm" className="text-purple-300 hover:text-white">
            <a href={item.url} target="_blank" rel="noreferrer">
              Open
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
