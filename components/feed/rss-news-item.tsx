'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  FileText,
  ExternalLink,
  Clock,
  Share2,
  Bookmark,
  BookmarkPlus,
} from 'lucide-react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'

interface RSSNewsItemProps {
  item: {
    id: string
    title: string
    description: string
    link: string
    pubDate: string
    author?: string
    category?: string
    image?: string
    source: string
  }
  index: number
  onBookmark?: (id: string) => void
  isBookmarked?: boolean
}

const SOURCE_COLORS: Record<string, string> = {
  'Billboard': 'from-red-500 to-pink-500',
  'Pitchfork': 'from-green-500 to-emerald-500',
  'Rolling Stone': 'from-orange-500 to-red-500',
  'NME': 'from-purple-500 to-pink-500',
  'Stereogum': 'from-blue-500 to-cyan-500',
  'Consequence': 'from-indigo-500 to-purple-500',
}

function getSourceGradient(source: string) {
  return SOURCE_COLORS[source] || 'from-gray-500 to-slate-500'
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim()
}

export function RSSNewsItem({ item, onBookmark, isBookmarked = false }: RSSNewsItemProps) {
  const [imageError, setImageError] = useState(false)
  const gradient = getSourceGradient(item.source)

  function handleExternalLink() {
    window.open(item.link, '_blank', 'noopener,noreferrer')
  }

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, text: item.description, url: item.link })
      } else {
        await navigator.clipboard.writeText(item.link)
      }
    } catch {
      // User cancelled or API unavailable
    }
  }

  return (
    <Card className="group overflow-hidden border-white/10 bg-white/[0.04] transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06]">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start gap-4">
          {/* Thumbnail */}
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg md:h-20 md:w-20">
            {item.image && !imageError ? (
              <Image
                src={item.image}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 768px) 64px, 80px"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
                <FileText className="h-6 w-6 text-white" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <Badge className={`bg-gradient-to-r ${gradient} border-0 text-[10px] text-white`}>
                {item.source}
              </Badge>
              {item.category && (
                <Badge variant="outline" className="border-white/10 text-[10px] text-slate-400">
                  {item.category}
                </Badge>
              )}
            </div>

            <h3
              className="mb-1 line-clamp-2 cursor-pointer text-sm font-semibold leading-snug text-white transition-colors group-hover:text-purple-300 md:text-base"
              onClick={handleExternalLink}
            >
              {item.title}
            </h3>

            {item.description && (
              <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-slate-400 md:text-sm">
                {stripHtml(item.description)}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              {item.author && <span className="truncate">{item.author}</span>}
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(item.pubDate), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center justify-end gap-1 border-t border-white/5 pt-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleShare}
            className="h-8 text-slate-500 hover:text-white"
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
          {onBookmark && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onBookmark(item.id)}
              className="h-8 text-slate-500 hover:text-amber-400"
            >
              {isBookmarked ? (
                <Bookmark className="h-3.5 w-3.5 fill-current text-amber-400" />
              ) : (
                <BookmarkPlus className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExternalLink}
            className="h-8 border-white/10 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            Read
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
