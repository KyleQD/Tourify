"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Search, UserPlus, Mail, Phone, Calendar, MapPin, DollarSign, Music } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AddArtistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (booking: any) => void
  existingArtists: { id: string; name: string; email: string; genres?: string[] }[]
  eventId?: string
  tourId?: string
  eventDetails?: {
    title: string
    date: string
    venue: string
    location: string
  }
}

interface BookingDetails {
  performanceType: string
  description: string
  performanceDate: string
  soundcheckTime?: string
  performanceTime?: string
  duration?: string
  venue: string
  location: string
  compensation: string
  requirements?: string
  additionalNotes?: string
}

export function AddArtistDialog({ 
  open, 
  onOpenChange, 
  onAdd, 
  existingArtists, 
  eventId, 
  tourId,
  eventDetails
}: AddArtistDialogProps) {
  const [tab, setTab] = React.useState("existing")
  const [search, setSearch] = React.useState("")
  const [selectedArtist, setSelectedArtist] = React.useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [invitePhone, setInvitePhone] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [bookingDetails, setBookingDetails] = React.useState<BookingDetails>({
    performanceType: "",
    description: "",
    performanceDate: eventDetails?.date || "",
    soundcheckTime: "",
    performanceTime: "",
    duration: "",
    venue: eventDetails?.venue || "",
    location: eventDetails?.location || "",
    compensation: "",
    requirements: "",
    additionalNotes: ""
  })
  const { toast } = useToast()

  const filteredArtists = React.useMemo(() => {
    return existingArtists.filter(artist => 
      artist.name.toLowerCase().includes(search.toLowerCase()) ||
      artist.email.toLowerCase().includes(search.toLowerCase()) ||
      artist.genres?.some(genre => genre.toLowerCase().includes(search.toLowerCase()))
    )
  }, [existingArtists, search])

  const performanceTypes = [
    "Headliner",
    "Supporting Act", 
    "Opening Act",
    "DJ Set",
    "Acoustic Performance",
    "Band Performance",
    "Solo Performance",
    "Collaboration",
    "Special Guest",
    "Other"
  ]

  async function handleBookExisting() {
    const artist = existingArtists.find(a => a.id === selectedArtist)
    if (artist) {
      setIsLoading(true)
      try {
        // Send booking request notification to the selected artist
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "booking_request",
            data: {
              userId: artist.id,
              bookingDetails,
              eventId,
              tourId,
              status: "pending",
              requestType: "performance"
            }
          })
        })

        // Store the booking request
        await fetch("/api/booking-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            artistId: artist.id,
            eventId,
            tourId,
            bookingDetails,
            status: "pending",
            requestType: "performance"
          })
        })
        
        onAdd({ 
          ...artist, 
          bookingDetails, 
          status: "pending",
          requestType: "performance"
        })
        toast({ 
          title: "Booking request sent", 
          description: `Performance booking request sent to ${artist.name}. They will be notified to accept or decline.` 
        })
        onOpenChange(false)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to send booking request. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  async function handleInviteNew() {
    if (inviteEmail || invitePhone) {
      setIsLoading(true)
      try {
        // Generate a unique invitation link
        const inviteToken = crypto.randomUUID()
        
        // Store the booking invitation in the database
        await fetch("/api/booking-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteEmail,
            phone: invitePhone,
            eventId,
            tourId,
            bookingDetails,
            token: inviteToken,
            status: "pending",
            requestType: "performance"
          })
        })

        // Send email with signup link
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "artist_signup_invite",
            data: {
              email: inviteEmail,
              phone: invitePhone,
              bookingDetails,
              eventDetails: eventDetails || { title: "Upcoming Event" },
              signupLink: `${window.location.origin}/login?token=${inviteToken}&type=artist`
            }
          })
        })

        onAdd({ 
          email: inviteEmail, 
          phone: invitePhone, 
          bookingDetails, 
          status: "pending",
          token: inviteToken,
          requestType: "performance"
        })
        
        toast({ 
          title: "Invitation sent", 
          description: `Booking invitation sent to ${inviteEmail || invitePhone}. They will create an account and respond to your booking request.` 
        })
        onOpenChange(false)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to send invitation. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Book Artist/Performer
          </DialogTitle>
          <DialogDescription>
            Send booking requests to artists for your {tourId ? "tour" : "event"}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="mb-4 bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30">
            <TabsTrigger value="existing" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">
              <UserPlus className="h-4 w-4" />
              Book Existing Artist
            </TabsTrigger>
            <TabsTrigger value="invite" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">
              <Mail className="h-4 w-4" />
              Invite New Artist
            </TabsTrigger>
          </TabsList>
          
          {/* Performance Details Section - Common for both tabs */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <h3 className="font-medium mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Performance Details
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="performanceType">Performance Type</Label>
                    <Select 
                      value={bookingDetails.performanceType} 
                      onValueChange={value => setBookingDetails(prev => ({ ...prev, performanceType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select performance type" />
                      </SelectTrigger>
                      <SelectContent>
                        {performanceTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Input
                      id="duration"
                      placeholder="e.g., 45 minutes, 1 hour"
                      value={bookingDetails.duration}
                      onChange={e => setBookingDetails(prev => ({ ...prev, duration: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Performance Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the performance, style, or requirements..."
                    value={bookingDetails.description}
                    onChange={e => setBookingDetails(prev => ({ ...prev, description: e.target.value }))}
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="performanceDate">Performance Date</Label>
                    <div className="relative">
                      <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="performanceDate"
                        type="date"
                        value={bookingDetails.performanceDate}
                        onChange={e => setBookingDetails(prev => ({ ...prev, performanceDate: e.target.value }))}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="soundcheckTime">Soundcheck Time</Label>
                    <Input
                      id="soundcheckTime"
                      type="time"
                      value={bookingDetails.soundcheckTime}
                      onChange={e => setBookingDetails(prev => ({ ...prev, soundcheckTime: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="performanceTime">Performance Time</Label>
                    <Input
                      id="performanceTime"
                      type="time"
                      value={bookingDetails.performanceTime}
                      onChange={e => setBookingDetails(prev => ({ ...prev, performanceTime: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="venue">Venue</Label>
                    <div className="relative">
                      <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="venue"
                        placeholder="e.g., Madison Square Garden"
                        value={bookingDetails.venue}
                        onChange={e => setBookingDetails(prev => ({ ...prev, venue: e.target.value }))}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., New York, NY"
                      value={bookingDetails.location}
                      onChange={e => setBookingDetails(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="compensation">Compensation</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="compensation"
                      placeholder="e.g., $5,000, $500/hour, Revenue share"
                      value={bookingDetails.compensation}
                      onChange={e => setBookingDetails(prev => ({ ...prev, compensation: e.target.value }))}
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="requirements">Technical Requirements</Label>
                  <Textarea
                    id="requirements"
                    placeholder="Sound equipment, lighting, stage setup requirements..."
                    value={bookingDetails.requirements}
                    onChange={e => setBookingDetails(prev => ({ ...prev, requirements: e.target.value }))}
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="additionalNotes">Additional Notes</Label>
                  <Textarea
                    id="additionalNotes"
                    placeholder="Any additional information, special requests, or notes..."
                    value={bookingDetails.additionalNotes}
                    onChange={e => setBookingDetails(prev => ({ ...prev, additionalNotes: e.target.value }))}
                    className="min-h-[60px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <TabsContent value="existing">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or genre..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <ScrollArea className="h-[200px] rounded-md border p-4">
                {filteredArtists.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No matching artists found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredArtists.map(artist => (
                      <div
                        key={artist.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedArtist === artist.id 
                            ? "border-primary bg-primary/5" 
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => setSelectedArtist(artist.id)}
                      >
                        <div className="font-medium">{artist.name}</div>
                        <div className="text-sm text-muted-foreground">{artist.email}</div>
                        {artist.genres && artist.genres.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {artist.genres.slice(0, 3).map(genre => (
                              <Badge key={genre} variant="secondary" className="text-xs">
                                {genre}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              
              <Button 
                className="w-full" 
                disabled={!selectedArtist || !bookingDetails.performanceType || !bookingDetails.performanceDate || isLoading} 
                onClick={handleBookExisting}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Booking Request...
                  </>
                ) : (
                  "Send Booking Request"
                )}
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="invite">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    placeholder="artist@example.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    type="email"
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <div className="relative">
                  <Phone className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="+1 (555) 000-0000"
                    value={invitePhone}
                    onChange={e => setInvitePhone(e.target.value)}
                    type="tel"
                    className="pl-8"
                  />
                </div>
              </div>
              
              <Button 
                className="w-full" 
                disabled={(!inviteEmail && !invitePhone) || !bookingDetails.performanceType || !bookingDetails.performanceDate || isLoading} 
                onClick={handleInviteNew}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  "Send Booking Invitation"
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
} 