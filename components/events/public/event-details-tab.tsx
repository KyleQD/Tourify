"use client"

import { format } from "date-fns"
import {
  Calendar,
  Clock,
  DollarSign,
  ExternalLink,
  Link as LinkIcon,
  MapPin,
  Play,
  Share2,
  Square,
  Ticket,
  User,
  Users,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EventConnectedAccountCard } from "@/components/events/event-connected-account-card"
import { formatEventTime } from "@/lib/events/format-event-time"
import { cn } from "@/lib/utils"
import { useEventSkin } from "./event-skin-context"
import type { EventData } from "./types"
import { buildVenueAddressLine } from "./utils"

interface EventDetailsTabProps {
  event: EventData
}

export function EventDetailsTab({ event }: EventDetailsTabProps) {
  const { tokens } = useEventSkin()
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <Card className={cn(tokens.card, tokens.body)}>
          <CardHeader className="pb-4">
            <CardTitle className={cn("flex items-center gap-2", tokens.heading)}>
              <Calendar className="h-5 w-5 text-blue-400" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn(tokens.inset, "p-4")}>
              <h4 className="mb-3 flex items-center gap-2 font-semibold text-white">
                <Clock className="h-4 w-4 text-purple-400" />
                Date & Time
              </h4>
              <div className="space-y-2 text-white/80">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <span>{format(new Date(event.event_date), "EEEE, MMMM d, yyyy")}</span>
                </div>
                {event.doors_open && formatEventTime(event.doors_open) && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-400" />
                    <span>Doors: {formatEventTime(event.doors_open)}</span>
                  </div>
                )}
                {event.start_time && formatEventTime(event.start_time) && (
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-purple-400" />
                    <span>Start: {formatEventTime(event.start_time)}</span>
                  </div>
                )}
                {event.end_time && formatEventTime(event.end_time) && (
                  <div className="flex items-center gap-2">
                    <Square className="h-4 w-4 text-red-400" />
                    <span>End: {formatEventTime(event.end_time)}</span>
                  </div>
                )}
              </div>
            </div>

            {event.capacity ? (
              <div className={cn(tokens.inset, "p-4")}>
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-white">
                  <Users className="h-4 w-4 text-green-400" />
                  Capacity
                </h4>
                <div className="text-white/80">{event.capacity.toLocaleString()} people</div>
              </div>
            ) : null}

            {(event.ticket_price_min || event.ticket_price_max) && (
              <div className={cn(tokens.inset, "p-4")}>
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-white">
                  <DollarSign className="h-4 w-4 text-amber-300" />
                  Ticket Prices
                </h4>
                <div className="text-white/80">
                  {event.ticket_price_min && event.ticket_price_max
                    ? `$${event.ticket_price_min} - $${event.ticket_price_max}`
                    : `$${event.ticket_price_min || event.ticket_price_max}`}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {event.linkedVenue ? (
          <EventConnectedAccountCard
            variant="venue"
            title="Venue"
            displayName={event.linkedVenue.venue_name || event.venue_name || "Venue"}
            avatarUrl={event.linkedVenue.avatar_url}
            about={event.linkedVenue.description}
            tagline={event.linkedVenue.tagline}
            profilePath={event.linkedVenue.profile_path}
            addressLine={buildVenueAddressLine(event, event.linkedVenue)}
            socialLinks={event.linkedVenue.social_links}
          />
        ) : event.venue_name ? (
          <Card className={cn(tokens.card, tokens.body)}>
            <CardHeader className="pb-3">
              <CardTitle className={cn("flex items-center gap-2 text-base", tokens.heading)}>
                <MapPin className="h-5 w-5 text-rose-400" />
                Venue Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-white/80">
              <div className="font-medium text-white">{event.venue_name}</div>
              {event.venue_address && <div>{event.venue_address}</div>}
              <div>{[event.venue_city, event.venue_state].filter(Boolean).join(", ")}</div>
              {event.venue_country && <div>{event.venue_country}</div>}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-6">
        <Card className={cn(tokens.card, tokens.body)}>
          <CardHeader className="pb-4">
            <CardTitle className={cn("flex items-center gap-2", tokens.heading)}>
              <LinkIcon className="h-5 w-5 text-purple-400" />
              Links & Social
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.ticket_url && (
              <div className={cn(tokens.inset, "p-4")}>
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-white">
                  <Ticket className="h-4 w-4 text-green-400" />
                  Tickets
                </h4>
                <Button asChild className={cn(tokens.btnTicket, "w-full")}>
                  <a href={event.ticket_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Get Tickets
                  </a>
                </Button>
              </div>
            )}

            {event.social_links && (
              <div className={cn(tokens.inset, "p-4")}>
                <h4 className="mb-3 flex items-center gap-2 font-semibold text-white">
                  <Share2 className="h-4 w-4 text-blue-400" />
                  Social Media
                </h4>
                <div className="space-y-3">
                  {event.social_links.facebook && (
                    <Button
                      asChild
                      variant="outline"
                      className={cn(tokens.btnGhost, "w-full")}
                    >
                      <a href={event.social_links.facebook} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Facebook
                      </a>
                    </Button>
                  )}
                  {event.social_links.twitter && (
                    <Button
                      asChild
                      variant="outline"
                      className={cn(tokens.btnGhost, "w-full")}
                    >
                      <a href={event.social_links.twitter} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Twitter
                      </a>
                    </Button>
                  )}
                  {event.social_links.instagram && (
                    <Button
                      asChild
                      variant="outline"
                      className={cn(tokens.btnGhost, "w-full")}
                    >
                      <a href={event.social_links.instagram} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Instagram
                      </a>
                    </Button>
                  )}
                  {event.social_links.website && (
                    <Button
                      asChild
                      variant="outline"
                      className={cn(tokens.btnGhost, "w-full")}
                    >
                      <a href={event.social_links.website} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Website
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {!event.ticket_url && !event.social_links && !event.hostArtist && (
              <p className="text-sm text-white/50">No links added for this event yet.</p>
            )}
          </CardContent>
        </Card>

        {event.hostArtist && (event.hostArtist.full_name || event.hostArtist.profile_path) ? (
          <EventConnectedAccountCard
            variant="artist"
            title="Host Artist"
            displayName={
              event.hostArtist.full_name ||
              event.hostArtist.artist_name ||
              event.hostArtist.username ||
              "Artist"
            }
            handle={event.hostArtist.url_slug || event.hostArtist.username}
            avatarUrl={event.hostArtist.avatar_url}
            isVerified={event.hostArtist.is_verified}
            about={event.hostArtist.bio}
            profilePath={event.hostArtist.profile_path}
            socialLinks={event.hostArtist.social_links}
          />
        ) : event.creator?.full_name || event.creator?.username ? (
          <Card className={cn(tokens.card, tokens.body)}>
            <CardHeader className="pb-3">
              <CardTitle className={cn("flex items-center gap-2 text-base", tokens.heading)}>
                <User className="h-4 w-4 text-purple-400" />
                Host Artist
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={event.creator?.avatar_url} />
                  <AvatarFallback className="bg-purple-500/20 text-purple-300">
                    {event.creator?.full_name?.charAt(0) || event.creator?.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-white">
                    {event.creator?.full_name}
                    {event.creator?.is_verified && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        ✓
                      </Badge>
                    )}
                  </div>
                  {event.creator?.username && (
                    <div className={'text-sm '}>@{event.creator.username}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
