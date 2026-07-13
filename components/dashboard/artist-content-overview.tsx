"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  Eye, 
  Music, 
  Video, 
  Image as ImageIcon, 
  FileText,
  Upload,
  Play,
  Heart,
  Share2,
  ArrowRight,
  TrendingDown,
  BarChart3,
  Plus
} from "lucide-react"
import { format, addDays } from "date-fns"
import Link from "next/link"
import { cn } from "@/utils"
import {
  ARTIST_CARD,
  ARTIST_ICON_WELL,
  ARTIST_INSET,
  ARTIST_OUTLINE_BTN,
  ARTIST_PRIMARY_BTN,
} from "@/components/dashboard/artist-tokens"

interface ContentItem {
  id: string
  title: string
  type: 'track' | 'video' | 'photo' | 'blog'
  plays?: number
  views?: number
  likes: number
  shares: number
  uploadDate: Date
  trend: 'up' | 'down' | 'stable'
  status: 'published' | 'draft' | 'processing'
}

interface ContentSummary {
  totalTracks: number
  totalVideos: number
  totalPhotos: number
  totalBlogs: number
  totalViews: number
  totalLikes: number
  totalShares: number
  engagementRate: number
}

interface ArtistContentOverviewProps {
  content: ContentItem[]
  summary: ContentSummary
  isLoading?: boolean
  onUploadContent?: () => void
  onViewAll?: () => void
}

export function ArtistContentOverview({ 
  content, 
  summary, 
  isLoading = false, 
  onUploadContent,
  onViewAll 
}: ArtistContentOverviewProps) {
  const [selectedType, setSelectedType] = useState<'all' | 'track' | 'video' | 'photo' | 'blog'>('all')

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'track': return <Music className="h-4 w-4 text-purple-400" />
      case 'video': return <Video className="h-4 w-4 text-blue-400" />
      case 'photo': return <ImageIcon className="h-4 w-4 text-green-400" />
      case 'blog': return <FileText className="h-4 w-4 text-orange-400" />
      default: return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'track': return 'bg-purple-500/20'
      case 'video': return 'bg-blue-500/20'
      case 'photo': return 'bg-green-500/20'
      case 'blog': return 'bg-orange-500/20'
      default: return 'bg-gray-500/20'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-400" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-400" />
      default: return <BarChart3 className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'draft': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'processing': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const filteredContent = selectedType === 'all' 
    ? content 
    : content.filter(item => item.type === selectedType)

  const recentContent = filteredContent
    .sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime())
    .slice(0, 5)

  if (isLoading) {
    return (
      <Card className={ARTIST_CARD}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 tracking-tight text-white">
            <div className={cn(ARTIST_ICON_WELL, 'inline-flex h-8 w-8 items-center justify-center p-1.5')}>
              <TrendingUp className="h-4 w-4" />
            </div>
            Content Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-purple-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={ARTIST_CARD}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 tracking-tight text-white">
              <div className={cn(ARTIST_ICON_WELL, 'inline-flex h-8 w-8 items-center justify-center p-1.5')}>
                <TrendingUp className="h-4 w-4" />
              </div>
              Content Performance
            </CardTitle>
            <CardDescription className="text-slate-400">
              How your content is performing
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className={ARTIST_OUTLINE_BTN}
            onClick={onViewAll}
            asChild
          >
            <Link href="/artist/content">
              <ArrowRight className="mr-2 h-4 w-4" />
              View All
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className={cn(ARTIST_INSET, 'p-3 text-center')}>
            <div className="text-2xl font-bold tracking-tight text-white">{summary.totalTracks}</div>
            <div className="text-sm text-slate-400">Tracks</div>
          </div>
          <div className={cn(ARTIST_INSET, 'p-3 text-center')}>
            <div className="text-2xl font-bold tracking-tight text-white">{summary.totalVideos}</div>
            <div className="text-sm text-slate-400">Videos</div>
          </div>
          <div className={cn(ARTIST_INSET, 'p-3 text-center')}>
            <div className="text-2xl font-bold tracking-tight text-white">{summary.totalPhotos}</div>
            <div className="text-sm text-slate-400">Photos</div>
          </div>
          <div className={cn(ARTIST_INSET, 'p-3 text-center')}>
            <div className="text-2xl font-bold tracking-tight text-white">{summary.totalBlogs}</div>
            <div className="text-sm text-slate-400">Blogs</div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className={cn(ARTIST_INSET, 'p-3')}>
            <div className="mb-2 flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-300" />
              <span className="text-sm font-medium text-white">Total Views</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-white">
              {(summary.totalViews / 1000).toFixed(1)}K
            </div>
          </div>
          <div className={cn(ARTIST_INSET, 'p-3')}>
            <div className="mb-2 flex items-center gap-2">
              <Heart className="h-4 w-4 text-purple-300" />
              <span className="text-sm font-medium text-white">Total Likes</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-white">
              {summary.totalLikes.toLocaleString()}
            </div>
          </div>
          <div className={cn(ARTIST_INSET, 'p-3')}>
            <div className="mb-2 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-purple-300" />
              <span className="text-sm font-medium text-white">Engagement</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-white">
              {summary.engagementRate}%
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All', count: content.length },
            { key: 'track', label: 'Tracks', count: content.filter(c => c.type === 'track').length },
            { key: 'video', label: 'Videos', count: content.filter(c => c.type === 'video').length },
            { key: 'photo', label: 'Photos', count: content.filter(c => c.type === 'photo').length },
            { key: 'blog', label: 'Blogs', count: content.filter(c => c.type === 'blog').length }
          ].map((type) => (
            <Button
              key={type.key}
              variant={selectedType === type.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(type.key as typeof selectedType)}
              className={cn(
                selectedType === type.key 
                  ? ARTIST_PRIMARY_BTN
                  : ARTIST_OUTLINE_BTN
              )}
            >
              {type.label}
              <Badge variant="secondary" className="ml-2 border-0 bg-black/40 text-white">
                {type.count}
              </Badge>
            </Button>
          ))}
        </div>
        
        <div className="space-y-3">
          {recentContent.length > 0 ? (
            recentContent.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(ARTIST_INSET, 'flex items-center justify-between p-3 transition-colors hover:border-purple-500/30')}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(ARTIST_ICON_WELL, 'inline-flex h-8 w-8 items-center justify-center p-1.5')}>
                    {getTypeIcon(item.type)}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">{item.title}</h4>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>
                        {item.plays ? `${(item.plays / 1000).toFixed(1)}K plays` : `${((item.views || 0) / 1000).toFixed(1)}K views`}
                      </span>
                      <span>{format(item.uploadDate, 'MMM d')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm text-slate-300">
                    <Heart className="h-4 w-4 text-purple-300" />
                    {item.likes}
                  </div>
                  {getTrendIcon(item.trend)}
                  <Badge className={getStatusColor(item.status)}>
                    {item.status}
                  </Badge>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="py-8 text-center">
              <Upload className="mx-auto mb-4 h-12 w-12 text-slate-500" />
              <p className="mb-4 text-slate-400">No content found</p>
              <Button 
                className={ARTIST_PRIMARY_BTN}
                onClick={onUploadContent}
              >
                <Plus className="mr-2 h-4 w-4" />
                Upload Content
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <Button 
            size="sm" 
            className={cn(ARTIST_PRIMARY_BTN, 'flex-1')}
            onClick={onUploadContent}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Content
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className={ARTIST_OUTLINE_BTN}
            asChild
          >
            <Link href="/artist/business/analytics">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 