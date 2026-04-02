"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  Monitor
} from 'lucide-react'
import { JobCardProps, ArtistJob } from '@/types/artist-jobs'
import { formatDistanceToNow } from 'date-fns'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

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

function formatPayment(job: ArtistJob): string {
  if (job.payment_type === 'paid' && job.payment_amount) {
    return `$${job.payment_amount.toLocaleString()}`
  }
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
  
  const date = new Date(dateString)
  return formatSafeDate(date.toISOString())
}

export function JobCard({ 
  job, 
  onSave, 
  onUnsave, 
  onApply, 
  showApplicationStatus = false, 
  compact = false 
}: JobCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(job.is_saved || false)

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

  const CategoryIcon = job.category?.icon ? categoryIcons[job.category.icon as keyof typeof categoryIcons] : Music

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
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={paymentColors[job.payment_type]}>
                  {formatPayment(job)}
                </Badge>
                {job.priority === 'urgent' && (
                  <Badge variant="destructive" className="text-xs">
                    Urgent
                  </Badge>
                )}
                {job.featured && (
                  <Badge variant="secondary" className="text-xs">
                    Featured
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              disabled={isLoading}
              className="text-gray-400 hover:text-yellow-400"
            >
              {isSaved ? (
                <BookmarkCheck className="w-4 h-4" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </Button>
            
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
            <p className="text-sm text-gray-300 line-clamp-2">
              {job.description}
            </p>
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
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="text-gray-400 hover:text-purple-400"
                >
                  <a href={job.external_link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleApply}
              disabled={isLoading || !!job.user_application}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {job.user_application ? 'Applied' : 'Apply Now'}
            </Button>
            
            {job.deadline && (
              <div className="text-xs text-gray-400">
                Deadline: {formatEventDate(job.deadline)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 