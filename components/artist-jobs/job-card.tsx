"use client"

import { useState } from 'react'
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
  RefreshCw,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  CheckCircle2,
  Trash2,
  Pencil,
  Send,
  Link2,
  Briefcase,
} from 'lucide-react'
import { JobCardProps, ArtistJob } from '@/types/artist-jobs'
import { formatDistanceToNow } from 'date-fns'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'
import { useToast } from '@/components/ui/use-toast'
import { useActingContext } from '@/hooks/use-acting-context'

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
  'paid': 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
  'revenue_share': 'border-cyan-500/30 bg-cyan-500/15 text-cyan-300',
  'exposure': 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  'unpaid': 'border-slate-500/30 bg-slate-500/15 text-slate-400'
}

const paymentLabels = {
  'paid': 'Paid',
  'revenue_share': 'Revenue Share',
  'exposure': 'For Exposure',
  'unpaid': 'Unpaid'
}

const statusConfig: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' },
  paused: { label: 'Paused', className: 'border-amber-500/30 bg-amber-500/15 text-amber-300' },
  closed: { label: 'Closed', className: 'border-red-500/30 bg-red-500/15 text-red-300' },
  filled: { label: 'Filled', className: 'border-blue-500/30 bg-blue-500/15 text-blue-300' },
  draft: { label: 'Draft', className: 'border-slate-500/30 bg-slate-500/15 text-slate-400' },
}

const glassMenuClass = 'border-white/10 bg-slate-900/90 text-slate-100 backdrop-blur-xl'
const glassMenuItemClass = 'text-slate-200 focus:bg-white/10 focus:text-white'

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
  const { actingHeaders } = useActingContext()

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
        headers: { 'Content-Type': 'application/json', ...actingHeaders },
        credentials: 'include',
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
  const iconColor = job.category?.color || '#c084fc'

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.045] shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-purple-400/30 hover:bg-white/[0.065]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-fuchsia-300/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500/20 via-purple-500/20 to-cyan-400/20 ring-1 ring-white/10">
              {CategoryIcon && (
                <CategoryIcon
                  className="h-4.5 w-4.5"
                  style={{ color: iconColor }}
                />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-white transition-colors group-hover:text-purple-200">
                {job.title}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={`text-xs ${paymentColors[job.payment_type]}`}>
                  {formatPayment(job)}
                </Badge>
                {isOwner && (
                  <Badge variant="outline" className={`text-xs ${statusInfo.className}`}>
                    {statusInfo.label}
                  </Badge>
                )}
                {job.priority === 'urgent' && (
                  <Badge className="border-red-500/30 bg-red-500/20 text-xs text-red-300">Urgent</Badge>
                )}
                {job.featured && (
                  <Badge className="border-fuchsia-500/30 bg-fuchsia-500/20 text-xs text-fuchsia-200">
                    <Star className="mr-1 h-3 w-3" />
                    Featured
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex shrink-0 items-center gap-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:bg-white/10 hover:text-white">
                  <Share2 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={glassMenuClass}>
                <DropdownMenuItem onClick={handleShareToFeed} disabled={isSharing} className={glassMenuItemClass}>
                  <Send className="mr-2 h-4 w-4" />
                  Share to Feed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink} className={glassMenuItemClass}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Copy Link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleNativeShare} className={glassMenuItemClass}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share via...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
              className="h-8 w-8 p-0 text-slate-400 hover:bg-white/10 hover:text-amber-300"
            >
              {isSaved ? <BookmarkCheck className="h-4 w-4 text-amber-300" /> : <Bookmark className="h-4 w-4" />}
            </Button>

            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:bg-white/10 hover:text-white">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className={glassMenuClass}>
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(job)} className={glassMenuItemClass}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit Posting
                    </DropdownMenuItem>
                  )}
                  {job.status === 'open' && onStatusChange && (
                    <DropdownMenuItem onClick={() => onStatusChange(job.id, 'paused')} className="text-amber-300 focus:bg-white/10 focus:text-amber-200">
                      <PauseCircle className="mr-2 h-4 w-4" />
                      Pause Posting
                    </DropdownMenuItem>
                  )}
                  {job.status === 'paused' && onStatusChange && (
                    <DropdownMenuItem onClick={() => onStatusChange(job.id, 'open')} className="text-emerald-300 focus:bg-white/10 focus:text-emerald-200">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Reopen Posting
                    </DropdownMenuItem>
                  )}
                  {(job.status === 'open' || job.status === 'paused') && onStatusChange && (
                    <DropdownMenuItem onClick={() => onStatusChange(job.id, 'filled')} className="text-blue-300 focus:bg-white/10 focus:text-blue-200">
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark as Filled
                    </DropdownMenuItem>
                  )}
                  {job.status !== 'closed' && onStatusChange && (
                    <DropdownMenuItem onClick={() => onStatusChange(job.id, 'closed')} className="text-red-300 focus:bg-white/10 focus:text-red-200">
                      <PauseCircle className="mr-2 h-4 w-4" />
                      Close Posting
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-white/10" />
                  {(job.status === 'closed' || job.status === 'filled') && onRepost && (
                    <DropdownMenuItem onClick={() => onRepost(job.id)} className="text-purple-300 focus:bg-white/10 focus:text-purple-200">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Repost Job
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={() => onDelete(job.id)} className="text-red-300 focus:bg-white/10 focus:text-red-200">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Posting
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {showApplicationStatus && job.user_application && (
              <Badge 
                variant="outline"
                className="border-purple-500/30 bg-purple-500/15 text-xs capitalize text-purple-200"
              >
                {job.user_application.status}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 px-5 pb-5">
        {!compact && (
          <p className="line-clamp-2 text-sm text-slate-400">{job.description}</p>
        )}

        {/* Primary meta: location, date, duration as icon+text */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-300">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-cyan-400/80" />
            <span>{formatLocation(job)}</span>
          </div>
          {job.event_date && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-purple-400/80" />
              <span>{formatEventDate(job.event_date)}</span>
            </div>
          )}
          {job.duration_hours && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-fuchsia-400/80" />
              <span>{job.duration_hours}h</span>
            </div>
          )}
          {job.category?.name && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-slate-400">{job.category.name}</span>
            </div>
          )}
        </div>

        {/* Secondary meta: quieter stats */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {job.views_count} views
          </span>
          {job.applications_count > 0 && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {job.applications_count} applicants
            </span>
          )}
        </div>

        {job.required_genres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {job.required_genres.slice(0, 3).map((genre, index) => (
              <span
                key={index}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-400"
              >
                {genre}
              </span>
            ))}
            {job.required_genres.length > 3 && (
              <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-500">
                +{job.required_genres.length - 3} more
              </span>
            )}
          </div>
        )}

        {showApplicationStatus && job.hiring_milestones?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {job.hiring_milestones.slice(0, 4).map((milestone) => (
              <Badge
                key={milestone.key}
                variant="outline"
                className={
                  milestone.completed
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/10 bg-white/5 text-slate-400'
                }
              >
                {milestone.label}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 ring-1 ring-white/10">
              <AvatarFallback className="bg-slate-800 text-xs text-slate-300">
                {job.poster_name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-slate-400">
              {job.poster_name || 'Anonymous'}
            </span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-500">
              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            </span>
          </div>

          {job.external_link && (
            <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0 text-slate-400 hover:bg-white/10 hover:text-purple-300">
              <a href={job.external_link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          {isOwner ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={() => {
                  const url = `/jobs?tab=all&highlight=${job.id}`
                  window.open(url, '_blank')
                }}
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                Preview
              </Button>
              {job.applications_count > 0 && (
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20 hover:from-purple-500 hover:to-fuchsia-500"
                  onClick={() => {
                    window.location.href = `/jobs?tab=hiring&jobId=${job.id}`
                  }}
                >
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  {job.applications_count} Applicant{job.applications_count !== 1 ? 's' : ''}
                </Button>
              )}
              {(job.status === 'closed' || job.status === 'filled') && onRepost && (
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20 hover:from-purple-500 hover:to-pink-500"
                  onClick={() => onRepost(job.id)}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Repost
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={handleApply}
                disabled={isLoading || !!job.user_application}
                className="flex-1 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/20 hover:from-purple-500 hover:to-fuchsia-500 disabled:opacity-50"
                size="sm"
              >
                {job.user_application ? 'Applied' : 'Apply Now'}
              </Button>
              {job.deadline && (
                <div className="text-xs text-slate-500">
                  Deadline: {formatEventDate(job.deadline)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
