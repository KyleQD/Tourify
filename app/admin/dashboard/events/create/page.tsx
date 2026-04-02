"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { AddArtistDialog } from "../add-artist-dialog"
import { Calendar, MapPin, Music, Users, Plus, X } from "lucide-react"

interface Artist {
  id: string
  name: string
  email: string
  genres?: string[]
  bookingDetails?: any
  status?: string
  requestType?: string
}

function parseOptionalVenueUuid(value: string): string | null {
  const u = value.trim()
  if (!u) return null
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(u)
  ) {
    return u
  }
  return null
}

function toStartIso(date: string, time: string): string {
  const t = (time || "00:00").slice(0, 5)
  return new Date(`${date}T${t}:00`).toISOString()
}

function addTwoHoursIso(startIso: string): string {
  const d = new Date(startIso)
  d.setTime(d.getTime() + 2 * 60 * 60 * 1000)
  return d.toISOString()
}

export default function CreateEventPage() {
  const router = useRouter()
  const [eventData, setEventData] = React.useState({
    title: "",
    description: "",
    date: "",
    time: "",
    venue: "",
    location: "",
    capacity: "",
    ticketPrice: ""
  })
  
  const [bookedArtists, setBookedArtists] = React.useState<Artist[]>([])
  const [showAddArtistDialog, setShowAddArtistDialog] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const { toast } = useToast()

  // Mock existing artists data - in real app this would come from API
  const existingArtists: Artist[] = [
    {
      id: "1",
      name: "The Electric Waves",
      email: "contact@electricwaves.com",
      genres: ["Rock", "Alternative", "Indie"]
    },
    {
      id: "2", 
      name: "DJ Luna",
      email: "luna@djluna.com",
      genres: ["Electronic", "House", "Techno"]
    },
    {
      id: "3",
      name: "Acoustic Soul",
      email: "booking@acousticsoul.com", 
      genres: ["Folk", "Acoustic", "Singer-Songwriter"]
    }
  ]

  const handleAddArtist = (artist: Artist) => {
    setBookedArtists(prev => [...prev, artist])
    toast({
      title: "Artist booking request sent",
      description: `Booking request sent to ${artist.name || artist.email}`
    })
  }

  const handleRemoveArtist = (index: number) => {
    setBookedArtists(prev => prev.filter((_, i) => i !== index))
  }

  const handleCreateEvent = async () => {
    if (!eventData.date) return

    setIsLoading(true)
    try {
      const startAt = toStartIso(eventData.date, eventData.time)
      const endAt = addTwoHoursIso(startAt)
      const venueId = parseOptionalVenueUuid(eventData.venue)
      const capacityRaw = eventData.capacity.trim()
      const capacity =
        capacityRaw === "" ? null : Number.parseInt(capacityRaw, 10)
      const capacityPayload =
        capacity !== null && !Number.isNaN(capacity) ? capacity : null

      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: eventData.title.trim(),
          description: eventData.description || "",
          start_at: startAt,
          end_at: endAt,
          venue_id: venueId,
          capacity: capacityPayload,
          status: "draft",
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        toast({
          title: "Error",
          description:
            typeof data?.error === "string"
              ? data.error
              : "Failed to create event. Please try again.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Event created successfully",
        description: "Your event has been saved as a draft.",
      })
      router.push("/admin/dashboard/events")
    } catch {
      toast({
        title: "Error",
        description: "Failed to create event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      case "accepted":
        return <Badge variant="default" className="bg-green-600">Accepted</Badge>
      case "declined":
        return <Badge variant="destructive">Declined</Badge>
      default:
        return <Badge variant="outline">Invited</Badge>
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Event</h1>
        <p className="text-muted-foreground">
          Set up your event details and book artists for performances
        </p>
      </div>

      <div className="grid gap-6">
        {/* Event Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Event Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  placeholder="Summer Music Festival"
                  value={eventData.title}
                  onChange={e => setEventData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="500"
                  value={eventData.capacity}
                  onChange={e => setEventData(prev => ({ ...prev, capacity: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your event..."
                value={eventData.description}
                onChange={e => setEventData(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={eventData.date}
                  onChange={e => setEventData(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={eventData.time}
                  onChange={e => setEventData(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticketPrice">Ticket Price</Label>
                <Input
                  id="ticketPrice"
                  placeholder="$25"
                  value={eventData.ticketPrice}
                  onChange={e => setEventData(prev => ({ ...prev, ticketPrice: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="venue">Venue</Label>
                <Input
                  id="venue"
                  placeholder="Madison Square Garden"
                  value={eventData.venue}
                  onChange={e => setEventData(prev => ({ ...prev, venue: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="New York, NY"
                  value={eventData.location}
                  onChange={e => setEventData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Artists & Performers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Artists & Performers
              </CardTitle>
              <Button
                onClick={() => setShowAddArtistDialog(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Book Artist
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {bookedArtists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No artists booked yet</p>
                <p className="text-sm">Click "Book Artist" to send booking requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookedArtists.map((artist, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium">
                            {artist.name || artist.email}
                          </h4>
                          {artist.email && artist.name && (
                            <p className="text-sm text-muted-foreground">{artist.email}</p>
                          )}
                          {artist.bookingDetails && (
                            <p className="text-sm text-muted-foreground">
                              {artist.bookingDetails.performanceType} • {artist.bookingDetails.compensation}
                            </p>
                          )}
                        </div>
                        {artist.genres && (
                          <div className="flex gap-1">
                            {artist.genres.slice(0, 2).map(genre => (
                              <Badge key={genre} variant="secondary" className="text-xs">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(artist.status || "pending")}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveArtist(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Event Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleCreateEvent}
            disabled={isLoading || !eventData.title || !eventData.date}
            className="px-8"
          >
            {isLoading ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </div>

      {/* Add Artist Dialog */}
      <AddArtistDialog
        open={showAddArtistDialog}
        onOpenChange={setShowAddArtistDialog}
        onAdd={handleAddArtist}
        existingArtists={existingArtists}
        eventDetails={{
          title: eventData.title || "New Event",
          date: eventData.date,
          venue: eventData.venue,
          location: eventData.location
        }}
      />
    </div>
  )
} 