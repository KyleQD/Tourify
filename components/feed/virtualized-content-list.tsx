'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Music2, 
  Calendar, 
  Video, 
  MapPin, 
  FileText, 
  Play, 
  Heart, 
  Share2, 
  MessageCircle,
  Clock,
  Star,
  Eye,
  ExternalLink,
  Bookmark,
  BookmarkPlus
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import Image from 'next/image'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface ContentItem {
  id: string
  type: 'music' | 'event' | 'video' | 'tour' | 'news' | 'blog'
  title: string
  description?: string
  author?: {
    id: string
    name: string
    username: string
    avatar_url?: string
    is_verified: boolean
  }
  cover_image?: string
  created_at: string
  engagement: {
    likes: number
    views: number
    shares: number
    comments: number
  }
  metadata?: {
    genre?: string
    duration?: number
    location?: string
    date?: string
    venue?: string
    capacity?: number
    ticket_price?: number
    url?: string
    tags?: string[]
  }
  is_liked?: boolean
  is_following?: boolean
  relevance_score?: number
}

interface VirtualizedContentListProps {
  content: ContentItem[]
  onLike: (contentId: string) => void
  onFollow: (authorId: string) => void
  onBookmark: (contentId: string) => void
  bookmarkedContent: Set<string>
  getContentIcon: (type: string) => React.ReactNode
  getContentColor: (type: string) => string
  getRelevanceBadge: (score?: number) => React.ReactNode
}

export function VirtualizedContentList({
  content,
  onLike,
  onFollow,
  onBookmark,
  bookmarkedContent,
  getContentIcon,
  getContentColor,
  getRelevanceBadge
}: VirtualizedContentListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: content.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300, // Estimated height of each content item
    overscan: 5, // Number of items to render outside the viewport
  })

  useEffect(() => {
    rowVirtualizer.measure()
  }, [content, rowVirtualizer])

  if (content.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-slate-400 mb-4">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No content found.</p>
          <p className="text-sm mt-2">Try adjusting your search or filters!</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className="h-[800px] overflow-auto"
      style={{
        contain: 'strict',
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = content[virtualRow.index]
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: virtualRow.index * 0.05 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <Card className="bg-slate-800/50 border-slate-700/30 hover:border-slate-600/50 transition-colors group mb-6">
                <CardContent className="p-6">
                  {/* Content Header */}
                  <div className="flex items-start gap-4 mb-4">
                    {item.cover_image && (
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={item.cover_image}
                          alt={item.title}
                          fill
                          className="object-cover"
                        />
                        {item.type === 'video' && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Play className="h-6 w-6 text-white" />
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getContentColor(item.type)}>
                          {getContentIcon(item.type)}
                          <span className="ml-1 capitalize">{item.type}</span>
                        </Badge>
                        {item.metadata?.genre && (
                          <Badge variant="secondary" className="bg-slate-700/50">
                            {item.metadata.genre}
                          </Badge>
                        )}
                        {getRelevanceBadge(item.relevance_score)}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-300 transition-colors">
                        {item.title}
                      </h3>
                      
                      {item.description && (
                        <p className="text-slate-300 text-sm mb-3 line-clamp-2">
                          {item.description}
                        </p>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-slate-400 text-sm">
                        {item.metadata?.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{Math.floor(item.metadata.duration / 60)}:{String(item.metadata.duration % 60).padStart(2, '0')}</span>
                          </div>
                        )}
                        {item.metadata?.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{item.metadata.location}</span>
                          </div>
                        )}
                        {item.metadata?.date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatSafeDate(item.metadata.date)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Author Info */}
                  {item.author && (
                    <div className="flex items-center justify-between mb-4 p-3 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={item.author.avatar_url} />
                          <AvatarFallback>
                            {item.author.name?.[0] || item.author.username?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-sm">
                              {item.author.name}
                            </span>
                            {item.author.is_verified && (
                              <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                <Star className="w-2 h-2 text-white" />
                              </div>
                            )}
                          </div>
                          <span className="text-slate-400 text-xs">
                            @{item.author.username}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={item.is_following ? "outline" : "default"}
                          onClick={() => onFollow(item.author!.id)}
                          className="text-xs"
                        >
                          {item.is_following ? 'Following' : 'Follow'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onBookmark(item.id)}
                          className="text-slate-400 hover:text-yellow-400"
                        >
                          {bookmarkedContent.has(item.id) ? (
                            <Bookmark className="h-4 w-4 fill-current" />
                          ) : (
                            <BookmarkPlus className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Engagement Stats */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onLike(item.id)}
                        className={`${item.is_liked ? 'text-red-500' : 'text-slate-400'} hover:text-red-400 transition-colors`}
                      >
                        <Heart className={`h-4 w-4 mr-2 ${item.is_liked ? 'fill-current' : ''}`} />
                        {item.engagement.likes}
                      </Button>
                      <div className="flex items-center gap-1 text-slate-400 text-sm">
                        <Eye className="h-4 w-4" />
                        <span>{item.engagement.views}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-sm">
                        <Share2 className="h-4 w-4" />
                        <span>{item.engagement.shares}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-sm">
                        <MessageCircle className="h-4 w-4" />
                        <span>{item.engagement.comments}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {item.metadata?.url && (
                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-blue-400">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-green-400">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
} 