"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  Eye, 
  Users, 
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Music,
  Mic,
  Settings,
  Truck,
  Star,
  Monitor,
  Share2,
  Copy,
  RefreshCw,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Trash2,
  Pencil,
  Send,
  Link2,
} from 'lucide-react'
import { JobCardProps, ArtistJob } from '@/types/artist-jobs'
import { formatDistanceToNow } from 'date-fns'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'
import { useToast } from '@/components/ui/use-toast'

const categoryIcons = {
  'Music': Music,
  'MapPin': MapPin,
  'Users': Users,
  'Mic': Mic,
  'Settings': Settings,
  'Truck': Truck,
  'Calendar': Calendar,
  'Book': Settings,
  'Star': Star,
  'Monitor': Monitor
}

const paymentColors = {
  'paid': 'bg-green-500/10 text-green-500 border-green-500/20',
  'revenue_share': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'exposure': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'unpaid': 'bg-gray-500/10 text-gray-500 border-gray-500/20'
}

const paymentLabels = {
  'paid': 'Paid',
  'revenue_share': 'Revenue Share',
  'exposure': 'For Exposure',
  'unpaid': 'Unpaid'
}

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-green-600/20 text-green-400 border-green-600/30' },
  paused: { label: 'Paused', className: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30' },
  closed: { label: 'Closed', className: 'bg-red-600/20 text-red-400 border-red-600/30' },
  filled: { label: 'Filled', className: 'bg-blue-600/20 text-blue-400 border-blue-600/30' },
  draft: { label: 'Draft', className: 'bg-gray-600/20 text-gray-400 border-gray-600/30' },
}

function formatPayment(job: ArtistJob): string {
  if (job.payment_type === 'paid' && job.payment_amount)
    return `$${job.payment_amount.toLocaleString()}`
  return paymentLabels[job.payment_type]
}

function formatLocation(job: ArtistJob): string {
  if (job.location_type === 'remote') return 'Remote'
  if (job.location_type === 'hybrid') return 'Hybrid'
  const parts = []
  if (job.city) parts.push(job.city)
  if (job.state) parts.push(job.state)
  if (job.country) parts.push(job.country)
  return parts.join(', ') || 'Location TBD'
}

function formatEventDate(dateString: string | null): string {
  if (!dateString) return 'Date TBD'
  return formatSafeDate(new Date(dateString).toISOString())
}

interface ExtendedJobCardProps extends JobCardProps {
  isOwner?: boolean
  onStatusChange?: (jobId: string, status: string) => void
  onRepost?: (jobId: string) => void
  onEdit?: (job: ArtistJob) => void
  onDelete?: (jobId: string) => void
  onShareToFeed?: (job: ArtistJob) => void
}

export function JobCard({ 
  job, 
  onSave, 
  onUnsave, 
  onApply, 
  showApplicationStatus = false, 
  compact = false,
  isOwner = false,
  onStatusChange,
  onRepost,
  onEdit,
  onDelete,
  onShareToFeed,
}: ExtendedJobCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(job.is_saved || false)
  const [isSharing, setIsSharing] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    setIsLoading(true)
    try {
      if (isSaved) {
        await onUnsave?.(job.id)
        setIsSaved(false)
      } else {
        await onSave?.(job.id)
        setIsSaved(true)
      }
    } catch (error) {
      console.error('Error saving job:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = async () => {
    setIsLoading(true)
    try {
      await onApply?.(job.id)
    } catch (error) {
      console.error('Error applying to job:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/jobs?highlight=${job.id}`
    await navigator.clipboard.writeText(url)
    toast({ title: 'Link copied', description: 'Job link copied to clipboard.' })
  }

  const handleShareToFeed = async () => {
    if (onShareToFeed) {
      onShareToFeed(job)
      return
    }
    setIsSharing(true)
    try {
      const res = await fetch('/api/posts/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shared_content_type: 'job',
          shared_content_id: job.id,
          content: `Check out this opportunity: ${job.title}`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Shared to feed', description: 'This job has been posted to your feed.' })
      } else {
        throw new Error(data.error || 'Failed to share')
      }
    } catch (error) {
      toast({
        title: 'Share failed',
        description: error instanceof Error ? error.message : 'Could not share right now.',
        variant: 'destructive',
      })
    } finally {
      setIsSharing(false)
    }
  }

  const handleNativeShare = async () => {
    const shareData = {
      title: job.title,
      text: `${job.title} - ${formatPayment(job)} | ${formatLocation(job)}`,
      url: `${window.location.origin}/jobs?highlight=${job.id}`,
    }
    if (navigator.share) {
      await navigator.share(shareData).catch(() => {})
    } else {
      handleCopyLink()
    }
  }

  const CategoryIcon = job.category?.icon ? categoryIcons[job.category.icon as keyof typeof categoryIcons] : Music
  const statusInfo = statusConfig[job.status] || statusConfig.open

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-gray-800/50 bg-gray-900/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${job.category?.color}20` }}
            >
              {CategoryIcon && (
                <CategoryIcon 
                  className="w-4 h-4" 
                  style={{ color: job.category?.color || '#8B5CF6' }}
                />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                {job.title}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className={paymentColors[job.payment_type]}>
                  {formatPayment(job)}
                </Badge>
                {isOwner && (
                  <Badge variant="outline" className={statusInfo.className}>
                    {statusInfo.label}
                  </Badge>
                )}
                {job.priority === 'urgent' && (
                  <Badge variant="destructive" className="text-xs">Urgent</Badge>
                )}
                {job.featured && (
                  <Badge variant="secondary" className="text-xs">Featured</Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8 w-8 p-0">
                  <Share2 className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                <DropdownMenuItem onClick={handleShareToFeed} disabled={isSharing} className="text-white hover:bg-slate-700">
                  <Send className="w-4 h-4 mr-2" />
                  Share to Feed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink} className="text-white hover:bg-slate-700">
                  <Link2 className="w-4 h-4 mr-2" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleNativeShare} className="text-white hover:bg-slate-700">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share via...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
              className="text-gray-400 hover:text-yellow-400 h-8 w-8 p-0"
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </Button>

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-8 w-8 p-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(job)} className="text-white hover:bg-slate-700">
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Posting
                    </DropdownMenuItem>
                  )}
                  {job.status === 'open' && onStatusChange && (
                    <DropdownMenuItem onClick={() => onStatusChange(job.id, 'paused')} className="text-yellow-400 hover:bg-slate-700">
                      <PauseCircle className="w-4 h-4 mr-2" />
                      Pause Posting
                    </DropdownMenuItem>
                  )}
                  {job.status === 'paused' && onStatusChange && (
                    <DropdownMenuItem onClick={() => onStatusChange(job.id, 'open')} className="text-green-400 hover:bg-slate-700">
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Reopen Posting
                    </DropdownMenuItem>
                  )}
                  {(job.status === 'open' || job.status === 'paused') && onStatusChange && (
                    <DropdownMenuItem onClick={() => onStatusChange(job.id, 'filled')} className="text-blue-400 hover:bg-slate-700">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mark as Filled
                    </DropdownMenuItem>
                  )}
                  {job.status !== 'closed' && onStatusChange && (
                    <DropdownMenuItem onClick={() => onStatusChange(job.id, 'closed')} className="text-red-400 hover:bg-slate-700">
                      <PauseCircle className="w-4 h-4 mr-2" />
                      Close Posting
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-slate-700" />
                  {(job.status === 'closed' || job.status === 'filled') && onRepost && (
                    <DropdownMenuItem onClick={() => onRepost(job.id)} className="text-purple-400 hover:bg-slate-700">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Repost Job
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={() => onDelete(job.id)} className="text-red-400 hover:bg-slate-700">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Posting
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {showApplicationStatus && job.user_application && (
              <Badge 
                variant={job.user_application.status === 'accepted' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {job.user_application.status}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {!compact && (
            <p className="text-sm text-gray-300 line-clamp-2">{job.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{formatLocation(job)}</span>
            </div>
            {job.event_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>{formatEventDate(job.event_date)}</span>
              </div>
            )}
            {job.duration_hours && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>{job.duration_hours}h</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-500" />
              <span>{job.views_count} views</span>
            </div>
          </div>

          {job.required_genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {job.required_genres.slice(0, 3).map((genre, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {genre}
                </Badge>
              ))}
              {job.required_genres.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{job.required_genres.length - 3} more
                </Badge>
              )}
            </div>
          )}

          {showApplicationStatus && job.hiring_milestones?.length ? (
            <div className="flex flex-wrap gap-1">
              {job.hiring_milestones.slice(0, 4).map((milestone) => (
                <Badge
                  key={milestone.key}
                  variant={milestone.completed ? 'default' : 'outline'}
                  className={milestone.completed ? 'bg-green-600 text-white' : 'text-gray-400'}
                >
                  {milestone.label}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarFallback className="text-xs">
                  {job.poster_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-400">
                {job.poster_name || 'Anonymous'}
              </span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {job.applications_count > 0 && (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Users className="w-3 h-3" />
                  {job.applications_count}
                </div>
              )}
              {job.external_link && (
                <Button variant="ghost" size="sm" asChild className="text-gray-400 hover:text-purple-400 h-6 w-6 p-0">
                  <a href={job.external_link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            {isOwner ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                  onClick={() => {
                    const url = `/jobs?tab=all&highlight=${job.id}`
                    window.open(url, '_blank')
                  }}
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Preview
                </Button>
                {job.applications_count > 0 && (
                  <Button
                    size="sm"
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      window.location.href = `/jobs?tab=hiring&jobId=${job.id}`
                    }}
                  >
                    <Users className="w-3.5 h-3.5 mr-1.5" />
                    {job.applications_count} Applicant{job.applications_count !== 1 ? 's' : ''}
                  </Button>
                )}
                {(job.status === 'closed' || job.status === 'filled') && onRepost && (
                  <Button
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    onClick={() => onRepost(job.id)}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Repost
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  onClick={handleApply}
                  disabled={isLoading || !!job.user_application}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  {job.user_application ? 'Applied' : 'Apply Now'}
                </Button>
                {job.deadline && (
                  <div className="text-xs text-gray-400">
                    Deadline: {formatEventDate(job.deadline)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
