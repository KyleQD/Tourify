"use client"

import { BarChart, Clock, MapPin, Music, Sparkles, Zap } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EventConnectedAccountCard } from "@/components/events/event-connected-account-card"
import { formatEventTime } from "@/lib/events/format-event-time"
import { cn } from "@/lib/utils"
import { useEventSkin } from "./event-skin-context"
import type { AttendanceData, AttendanceStatus, EventData } from "./types"
import { EventRsvpActions } from "./event-rsvp-actions"
import { EventStatTile } from "./event-stat-tile"
import { buildVenueAddressLine } from "./utils"

interface EventOverviewTabProps {
  event: EventData
  attendance: AttendanceData | null
  isSignedIn: boolean
  isUpdatingAttendance: boolean
  isEventCreator: boolean
  onAttendanceUpdate: (status: AttendanceStatus) => void
  onShare: () => void
}

export function EventOverviewTab({
  event,
  attendance,
  isSignedIn,
  isUpdatingAttendance,
  isEventCreator,
  onAttendanceUpdate,
  onShare,
}: EventOverviewTabProps) {
  const { tokens } = useEventSkin()
  const hasTimeline =
    (event.doors_open && formatEventTime(event.doors_open)) ||
    (event.start_time && formatEventTime(event.start_time)) ||
    (event.end_time && formatEventTime(event.end_time))

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card className={cn(tokens.card, tokens.body)}>
          <CardHeader className="pb-4">
            <CardTitle className={cn("flex items-center gap-2", tokens.heading)}>
              <Sparkles className="h-5 w-5 text-purple-400" />
              About This Event
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {event.description ? (
              <p className="text-lg leading-relaxed text-white/90">{event.description}</p>
            ) : (
              <p className="text-white/50">No description yet.</p>
            )}

            {event.setlist && event.setlist.length > 0 && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
                  <Music className="h-5 w-5 text-purple-400" />
                  Setlist
                </h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {event.setlist.map((song, index) => (
                    <div key={`${song}-${index}`} className={cn(tokens.inset, "flex items-center gap-3 p-3")}>
                      <span className="rounded bg-purple-500/20 px-2 py-1 font-mono text-sm text-purple-300">
                        {index + 1}
                      </span>
                      <span className="text-white/90">{song}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event.tags && event.tags.length > 0 && (
              <div>
                <h3 className="mb-3 font-semibold text-white">Event Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="rounded-full border-purple-500/30 bg-purple-500/10 text-purple-200"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {event.hostArtist &&
          (event.hostArtist.bio || event.hostArtist.profile_path || event.hostArtist.full_name) && (
            <EventConnectedAccountCard
              variant="artist"
              title="About the Artist"
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
          )}

        {(event.linkedVenue || event.venue_name) &&
          (event.linkedVenue ? (
            <EventConnectedAccountCard
              variant="venue"
              title="About the Venue"
              displayName={event.linkedVenue.venue_name || event.venue_name || "Venue"}
              avatarUrl={event.linkedVenue.avatar_url}
              about={event.linkedVenue.description}
              tagline={event.linkedVenue.tagline}
              profilePath={event.linkedVenue.profile_path}
              addressLine={buildVenueAddressLine(event, event.linkedVenue)}
              socialLinks={event.linkedVenue.social_links}
            />
          ) : (
            <Card className={cn(tokens.card, tokens.body)}>
              <CardHeader className="pb-3">
                <CardTitle className={cn("flex items-center gap-2 text-base", tokens.heading)}>
                  <MapPin className="h-5 w-5 text-rose-400" />
                  Venue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-white/80">
                <div className="font-medium text-white">{event.venue_name}</div>
                {buildVenueAddressLine(event) && (
                  <div className="text-sm text-white/60">{buildVenueAddressLine(event)}</div>
                )}
              </CardContent>
            </Card>
          ))}

        {hasTimeline && (
          <Card className={cn(tokens.card, tokens.body)}>
            <CardHeader className="pb-4">
              <CardTitle className={cn("flex items-center gap-2", tokens.heading)}>
                <Clock className="h-5 w-5 text-blue-400" />
                Event Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {event.doors_open && formatEventTime(event.doors_open) && (
                  <div className={cn(tokens.inset, "flex items-center gap-4 p-3")}>
                    <div className="h-3 w-3 rounded-full bg-green-500" />
                    <div>
                      <p className="font-medium text-white">Doors Open</p>
                      <p className="text-sm text-white/60">{formatEventTime(event.doors_open)}</p>
                    </div>
                  </div>
                )}
                {event.start_time && formatEventTime(event.start_time) && (
                  <div className={cn(tokens.inset, "flex items-center gap-4 p-3")}>
                    <div className="h-3 w-3 rounded-full bg-purple-500" />
                    <div>
                      <p className="font-medium text-white">Show Starts</p>
                      <p className="text-sm text-white/60">{formatEventTime(event.start_time)}</p>
                    </div>
                  </div>
                )}
                {event.end_time && formatEventTime(event.end_time) && (
                  <div className={cn(tokens.inset, "flex items-center gap-4 p-3")}>
                    <div className="h-3 w-3 rounded-full bg-red-500" />
                    <div>
                      <p className="font-medium text-white">Show Ends</p>
                      <p className="text-sm text-white/60">{formatEventTime(event.end_time)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        <Card className={cn(tokens.card, tokens.body)}>
          <CardHeader className="pb-4">
            <CardTitle className={cn("flex items-center gap-2", tokens.heading)}>
              <Sparkles className="h-5 w-5 text-green-400" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              <EventStatTile value={attendance?.attending || 0} label="Attending" tone="green" />
              <EventStatTile value={attendance?.interested || 0} label="Interested" tone="blue" />
              <EventStatTile value={attendance?.not_going || 0} label="Not Going" tone="red" />
            </div>
            <EventRsvpActions
              event={event}
              attendance={attendance}
              isSignedIn={isSignedIn}
              isUpdating={isUpdatingAttendance}
              layout="sidebar"
              onUpdate={onAttendanceUpdate}
              onShare={onShare}
            />
          </CardContent>
        </Card>

        <Card className={cn(tokens.card, tokens.body)}>
          <CardHeader className="pb-4">
            <CardTitle className={cn("flex items-center gap-2", tokens.heading)}>
              <BarChart className="h-5 w-5 text-purple-400" />
              Event Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {event.capacity ? (
              <div className={cn(tokens.inset, "flex items-center justify-between p-3")}>
                <span className="text-white/70">Capacity</span>
                <span className="font-semibold text-white">{event.capacity.toLocaleString()}</span>
              </div>
            ) : null}
            {(event.ticket_price_min || event.ticket_price_max) && (
              <div className={cn(tokens.inset, "flex items-center justify-between p-3")}>
                <span className="text-white/70">Ticket Price</span>
                <span className="font-semibold text-white">
                  ${event.ticket_price_min}
                  {event.ticket_price_max &&
                    event.ticket_price_max !== event.ticket_price_min &&
                    ` - $${event.ticket_price_max}`}
                </span>
              </div>
            )}
            <div className={cn(tokens.inset, "flex items-center justify-between p-3")}>
              <span className="text-white/70">Event Type</span>
              <Badge
                variant="outline"
                className="rounded-full border-purple-500/30 bg-purple-500/10 text-purple-200"
              >
                {event.type}
              </Badge>
            </div>
            <div className={cn(tokens.inset, "flex items-center justify-between p-3")}>
              <span className="text-white/70">Status</span>
              <Badge
                variant="outline"
                className="rounded-full border-green-500/30 bg-green-500/10 text-green-300"
              >
                {event.status.replace("_", " ")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(tokens.card, tokens.body)}>
          <CardHeader className="pb-4">
            <CardTitle className={cn("flex items-center gap-2", tokens.heading)}>
              <Zap className="h-5 w-5 text-amber-300" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {event.hostArtist?.profile_path && (
              <Button asChild variant="outline" className={cn(tokens.btnGhost, "w-full")}>
                <Link href={event.hostArtist.profile_path}>
                  <Music className="mr-2 h-4 w-4" />
                  View artist
                </Link>
              </Button>
            )}
            {event.linkedVenue?.profile_path && (
              <Button asChild variant="outline" className={cn(tokens.btnGhost, "w-full")}>
                <Link href={event.linkedVenue.profile_path}>
                  <MapPin className="mr-2 h-4 w-4" />
                  View venue
                </Link>
              </Button>
            )}
            {isEventCreator && (
              <Button variant="outline" className={cn(tokens.btnGhost, "w-full")}>
                Edit Event
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
