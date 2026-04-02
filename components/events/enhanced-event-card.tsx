"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Calendar, 
  MapPin, 
  Users, 
  Heart, 
  Share2, 
  Eye, 
  MessageCircle,
  ExternalLink,
  Music,
  Video,
  Mic,
  Users2
} from "lucide-react"
import { useEvents } from "@/context/venue/events-context"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import type { VenueEvent } from "@/app/venue/lib/hooks/use-venue-events"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface EnhancedEventCardProps {
  event: VenueEvent
  onEventClick?: (event: VenueEvent) => void
  showAnalytics?: boolean
  className?: string
}

export function EnhancedEventCard({ 
  event, 
  onEventClick, 
  showAnalytics = false,
  className = "" 
}: EnhancedEventCardProps) {
  const { 
    incrementEventViews, 
    incrementEventShares, 
    incrementEventLikes, 
    decrementEventLikes,
    addEventRSVP,
    removeEventRSVP,
    addEventInterest,
    removeEventInterest,
    shareEvent
  } = useEvents()
  const { user } = useAuth()
  
  const [isLiked, setIsLiked] = useState(event.likes.includes(user?.id || ""))
  const [isRSVPed, setIsRSVPed] = useState(event.attendees.includes(user?.id || ""))
  const [isInterested, setIsInterested] = useState(event.interested.includes(user?.id || ""))
  const [isSharing, setIsSharing] = useState(false)

  const handleEventClick = () => {
    // Increment views when event is clicked
    incrementEventViews(event.id)
    onEventClick?.(event)
  }

  const handleLike = () => {
    if (!user) {
      toast.error("Please sign in to like events")
      return
    }

    if (isLiked) {
      decrementEventLikes(event.id, user.id)
      setIsLiked(false)
      toast.success("Removed from likes")
    } else {
      incrementEventLikes(event.id, user.id)
      setIsLiked(true)
      toast.success("Added to likes")
    }
  }

  const handleRSVP = () => {
    if (!user) {
      toast.error("Please sign in to RSVP")
      return
    }

    if (isRSVPed) {
      removeEventRSVP(event.id, user.id)
      setIsRSVPed(false)
      toast.success("RSVP removed")
    } else {
      addEventRSVP(event.id, user.id)
      setIsRSVPed(true)
      toast.success("RSVP confirmed!")
    }
  }

  const handleInterest = () => {
    if (!user) {
      toast.error("Please sign in to show interest")
      return
    }

    if (isInterested) {
      removeEventInterest(event.id, user.id)
      setIsInterested(false)
      toast.success("Removed from interested")
    } else {
      addEventInterest(event.id, user.id)
      setIsInterested(true)
      toast.success("Added to interested")
    }
  }

  const handleShare = async (platform: string) => {
    setIsSharing(true)
    try {
      await shareEvent(event.id, platform)
      if (platform === 'copy') {
        toast.success("Event link copied to clipboard!")
      }
    } catch (error) {
      toast.error("Failed to share event")
    } finally {
      setIsSharing(false)
    }
  }

  const getEventTypeIcon = (type: VenueEvent['type']) => {
    switch (type) {
      case 'performance':
        return <Music className="h-4 w-4" />
      case 'recording':
        return <Video className="h-4 w-4" />
      case 'meeting':
        return <Users2 className="h-4 w-4" />
      case 'media':
        return <Mic className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return formatSafeDate(date.toISOString())
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      hour: 'numeric',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`group ${className}`}
    >
      <Card className="bg-slate-900/50 border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm hover:border-purple-500/30 transition-all duration-300 cursor-pointer" onClick={handleEventClick}>
        {/* Event Image */}
        {event.image && (
          <div className="relative h-48 overflow-hidden">
            <img 
              src={event.image} 
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Event Type Badge */}
            <div className="absolute top-3 left-3">
              <Badge className="bg-purple-500/80 text-white border-none backdrop-blur-sm">
                {getEventTypeIcon(event.type)}
                <span className="ml-1 capitalize">{event.type}</span>
              </Badge>
            </div>

            {/* Public/Private Badge */}
            <div className="absolute top-3 right-3">
              <Badge variant={event.isPublic ? "default" : "secondary"} className="backdrop-blur-sm">
                {event.isPublic ? "Public" : "Private"}
              </Badge>
            </div>
          </div>
        )}

        <CardContent className="p-6">
          {/* Event Title & Organizer */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-purple-300 transition-colors">
              {event.title}
            </h3>
            
            {event.organizerName && (
              <div className="flex items-center gap-2 mb-3">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={event.organizerAvatar} />
                  <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                    {event.organizerName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-400">{event.organizerName}</span>
              </div>
            )}
          </div>

          {/* Event Details */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Calendar className="h-4 w-4 text-purple-400" />
              <span>{formatDate(event.startDate)} at {formatTime(event.startDate)}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span className="line-clamp-1">{event.venue || event.location}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Users className="h-4 w-4 text-emerald-400" />
              <span>{event.analytics.rsvps} RSVPs • {event.capacity} capacity</span>
            </div>
          </div>

          {/* Tags */}
          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {event.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="bg-purple-500/20 text-purple-200 border-purple-500/30 text-xs"
                >
                  {tag}
                </Badge>
              ))}
              {event.tags.length > 3 && (
                <Badge variant="secondary" className="bg-gray-500/20 text-gray-300 border-gray-500/30 text-xs">
                  +{event.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Analytics (if enabled) */}
          {showAnalytics && (
            <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-slate-800/50 rounded-lg">
              <div className="text-center">
                <div className="text-sm font-semibold text-white">{event.analytics.views}</div>
                <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                  <Eye className="h-3 w-3" />
                  Views
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-white">{event.analytics.likes}</div>
                <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                  <Heart className="h-3 w-3" />
                  Likes
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-white">{event.analytics.shares}</div>
                <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                  <Share2 className="h-3 w-3" />
                  Shares
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-white">{event.analytics.comments}</div>
                <div className="text-xs text-gray-400 flex items-center justify-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  Comments
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isRSVPed ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation()
                handleRSVP()
              }}
              className={`flex-1 ${
                isRSVPed 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "border-white/20 text-white hover:bg-white/10"
              }`}
            >
              <Users className="h-4 w-4 mr-1" />
              {isRSVPed ? "Going" : "RSVP"}
            </Button>
            
            <Button
              size="sm"
              variant={isInterested ? "default" : "outline"}
              onClick={(e) => {
                e.stopPropagation()
                handleInterest()
              }}
              className={`flex-1 ${
                isInterested 
                  ? "bg-blue-600 hover:bg-blue-700 text-white" 
                  : "border-white/20 text-white hover:bg-white/10"
              }`}
            >
              <Heart className="h-4 w-4 mr-1" />
              {isInterested ? "Interested" : "Interest"}
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                handleLike()
              }}
              className={`${
                isLiked 
                  ? "bg-pink-600 hover:bg-pink-700 text-white border-pink-600" 
                  : "border-white/20 text-white hover:bg-white/10"
              }`}
            >
              <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation()
                handleShare('copy')
              }}
              disabled={isSharing}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Links */}
          {event.links && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
              {event.links.ticketUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(event.links!.ticketUrl, '_blank')
                  }}
                  className="flex-1 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/20"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Get Tickets
                </Button>
              )}
              
              {event.links.website && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(event.links!.website, '_blank')
                  }}
                  className="border-blue-500/40 text-blue-200 hover:bg-blue-500/20"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
