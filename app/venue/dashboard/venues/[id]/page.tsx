"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LoadingSpinner } from "../../../components/loading-spinner"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { BookingCalendar } from "../../../components/booking-calendar"
import { DocumentManager } from "../../../components/document-manager"
import { VenueAnalytics } from "../../../components/venue-analytics"
import { formatSafeDate, formatSafeTime } from "@/lib/events/admin-event-normalization"
import {
  Calendar,
  Clock,
  FileText,
  Users,
  MapPin,
  Ticket,
  Settings,
  Share2,
  Edit,
  Star,
  Music,
  Wifi,
  ParkingMeter,
  Accessibility,
  Coffee,
  ImageIcon,
  MessageSquare,
  BarChart3,
  Phone,
  Mail,
  Globe,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

// Mock venue data - in a real app, this would come from an API
const mockVenue = {
  id: "venue-1",
  name: "The Echo Lounge",
  username: "echolounge",
  description:
    "A premier music venue with state-of-the-art sound and lighting systems, hosting both local and touring artists. The Echo Lounge features multiple performance spaces, a full-service bar, and a dedicated team to ensure your event runs smoothly.",
  location: "Los Angeles, CA",
  address: "1234 Sunset Blvd, Los Angeles, CA 90026",
  website: "https://echolounge.com",
  avatar: "/vibrant-urban-gathering.png",
  coverImage: "/vibrant-music-venue.png",
  capacity: 850,
  type: "Music Venue",
  amenities: [
    { name: "Wi-Fi", icon: "Wifi" },
    { name: "Parking", icon: "ParkingMeter" },
    { name: "ADA Access", icon: "Accessibility" },
    { name: "Green Room", icon: "Coffee" },
    { name: "Sound System", icon: "Music" },
  ],
  specs: {
    soundSystem: "Meyer Sound with 32-channel Midas console",
    lighting: "Full DMX system with moving heads and LED pars",
    stage: "24' x 16' with 3' height",
    greenRoom: true,
    parking: "25 spots on-site, street parking available",
    accessibility: "ADA compliant with wheelchair ramp and accessible restrooms",
    bar: "Full-service bar with craft cocktails and local beers",
    foodService: "Small plates menu available until 10pm",
  },
  bookingContact: {
    name: "Alex Johnson",
    email: "booking@echolounge.com",
    phone: "(323) 555-1234",
  },
  stats: {
    events: 125,
    capacity: 850,
    rating: 4.8,
  },
  upcomingEvents: [
    {
      id: "event-1",
      title: "Summer Jam Festival",
      artist: "Various Artists",
      date: "2025-06-15T14:00:00",
      ticketsSold: 450,
      capacity: 850,
      status: "On Sale",
    },
    {
      id: "event-2",
      title: "Midnight Echo",
      artist: "Sarah Williams",
      date: "2025-06-22T19:00:00",
      ticketsSold: 325,
      capacity: 850,
      status: "On Sale",
    },
    {
      id: "event-3",
      title: "Jazz Night",
      artist: "The Blue Notes",
      date: "2025-06-28T20:00:00",
      ticketsSold: 275,
      capacity: 850,
      status: "On Sale",
    },
  ],
  gallery: [
    { id: "img-1", url: "/empty-theater-stage.png", alt: "Main stage" },
    { id: "img-2", url: "/cozy-corner-bar.png", alt: "Bar area" },
    { id: "img-3", url: "/grand-entrance.png", alt: "Venue entrance" },
    { id: "img-4", url: "/placeholder.svg?height=300&width=400&query=Green+Room", alt: "Green room" },
    { id: "img-5", url: "/placeholder.svg?height=300&width=400&query=Sound+Booth", alt: "Sound booth" },
    { id: "img-6", url: "/placeholder.svg?height=300&width=400&query=Crowd", alt: "Crowd view" },
  ],
  documents: [
    {
      id: "doc-1",
      name: "Stage Plot & Technical Rider",
      type: "pdf",
      size: "2.4 MB",
      uploadDate: "2023-05-15",
      url: "#",
    },
    { id: "doc-2", name: "Floor Plan", type: "pdf", size: "1.8 MB", uploadDate: "2023-05-15", url: "#" },
    { id: "doc-3", name: "Booking Policy", type: "pdf", size: "0.5 MB", uploadDate: "2023-05-15", url: "#" },
    { id: "doc-4", name: "Hospitality Information", type: "pdf", size: "0.7 MB", uploadDate: "2023-05-15", url: "#" },
  ],
  isOwner: true,
}

export default function VenuePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [venue, setVenue] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("about")
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    amenities: false,
    specs: false,
  })

  useEffect(() => {
    // In a real app, fetch venue data from API
    const loadVenue = async () => {
      setLoading(true)
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800))
        setVenue(mockVenue)
      } catch (error) {
        console.error("Error loading venue:", error)
        toast({
          title: "Error",
          description: "Failed to load venue information",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadVenue()
  }, [params.id, toast])

  const handleShare = () => {
    // In a real app, use Web Share API or copy to clipboard
    navigator.clipboard.writeText(`https://tourify.com/venues/${venue.id}`)
    toast({
      title: "Link copied",
      description: "Venue profile link copied to clipboard",
    })
  }

  const handleEdit = () => {
    router.push(`/venues/${venue.id}/edit`)
  }

  const handleBookingRequest = (date?: Date) => {
    if (date) {
      setSelectedDate(date)
    }
    setShowBookingForm(true)
    setActiveTab("booking")
  }

  const handleCancelBooking = () => {
    setShowBookingForm(false)
  }

  const handleSubmitBooking = () => {
    toast({
      title: "Booking Request Submitted",
      description: "Your booking request has been sent to the venue. They will contact you shortly.",
    })
    setShowBookingForm(false)
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const formatDate = (dateString: string) => {
    return formatSafeDate(dateString)
  }

  const formatTime = (dateString: string) => {
    return formatSafeTime(dateString)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!venue) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold mb-2">Venue Not Found</h2>
            <p className="text-gray-400 mb-4">The venue you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => router.push("/venues")}>Browse Venues</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Helper function to render amenity icon
  const renderAmenityIcon = (iconName: string) => {
    switch (iconName) {
      case "Wifi":
        return <Wifi className="h-4 w-4 mr-2" />
      case "ParkingMeter":
        return <ParkingMeter className="h-4 w-4 mr-2" />
      case "Accessibility":
        return <Accessibility className="h-4 w-4 mr-2" />
      case "Coffee":
        return <Coffee className="h-4 w-4 mr-2" />
      case "Music":
        return <Music className="h-4 w-4 mr-2" />
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Venue Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="bg-gray-900 border-gray-800 overflow-hidden">
          <div className="h-48 md:h-64 relative">
            <img src={venue.coverImage || "/placeholder.svg"} alt={venue.name} className="w-full h-full object-cover" />
            {venue.isOwner && (
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gray-900/80 border-gray-700 text-white"
                  onClick={handleEdit}
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit Profile
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gray-900/80 border-gray-700 text-white"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 mr-2" /> Share
                </Button>
              </div>
            )}
          </div>
          <CardContent className="p-6 relative">
            <div className="flex flex-col md:flex-row gap-6">
              <Avatar className="h-32 w-32 border-4 border-gray-900 absolute -top-16 left-6 md:relative md:top-0 md:left-0">
                <AvatarImage src={venue.avatar || "/placeholder.svg"} alt={venue.name} />
                <AvatarFallback className="text-2xl">{venue.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 mt-16 md:mt-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white">{venue.name}</h1>
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Badge variant="secondary" className="bg-purple-900 hover:bg-purple-800">
                        {venue.type}
                      </Badge>
                      <span>@{venue.username}</span>
                    </div>
                    <div className="flex items-center mt-1 text-gray-400 text-sm">
                      <MapPin className="h-3 w-3 mr-1" />
                      {venue.location}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!venue.isOwner && (
                      <>
                        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => handleBookingRequest()}>
                          <Calendar className="mr-2 h-4 w-4" /> Request Booking
                        </Button>
                        <Button variant="outline" onClick={handleShare}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <p className="mt-4 text-gray-300">{venue.description}</p>

                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-purple-400">{venue.stats.events.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Events Hosted</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">{venue.stats.capacity.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Capacity</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">{venue.stats.rating}</p>
                    <p className="text-xs text-gray-500">Rating</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Venue Content */}
      <div className="mt-6">
        <Tabs defaultValue="about" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800 w-full justify-start overflow-x-auto">
            <TabsTrigger value="about" className="flex items-center gap-1">
              <Users className="h-4 w-4" /> About
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" /> Events
            </TabsTrigger>
            <TabsTrigger value="booking" className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> Booking
            </TabsTrigger>
            <TabsTrigger value="specs" className="flex items-center gap-1">
              <Music className="h-4 w-4" /> Specs
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-1">
              <ImageIcon className="h-4 w-4" /> Gallery
            </TabsTrigger>
            {venue.isOwner && (
              <TabsTrigger value="analytics" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" /> Analytics
              </TabsTrigger>
            )}
          </TabsList>

          <AnimatePresence mode="wait">
            {/* About Tab */}
            <TabsContent value="about" className="mt-6">
              <motion.div
                key="about"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-purple-400" /> Location & Contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-medium text-white">Address</h3>
                      <p className="text-gray-400">{venue.address}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium text-white">Booking Contact</h3>
                        <div className="flex items-center mt-2">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <a href={`mailto:${venue.bookingContact.email}`} className="text-purple-400 hover:underline">
                            {venue.bookingContact.email}
                          </a>
                        </div>
                        <div className="flex items-center mt-2">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <a href={`tel:${venue.bookingContact.phone}`} className="text-purple-400 hover:underline">
                            {venue.bookingContact.phone}
                          </a>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium text-white">Website</h3>
                        <div className="flex items-center mt-2">
                          <Globe className="h-4 w-4 text-gray-400 mr-2" />
                          <a
                            href={venue.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:underline"
                          >
                            {venue.website}
                          </a>
                        </div>
                      </div>
                    </div>

                    <Button className="bg-purple-600 hover:bg-purple-700">
                      <MessageSquare className="h-4 w-4 mr-2" /> Contact Venue
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader className="pb-2">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleSection("amenities")}
                    >
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-purple-400" /> Amenities
                      </CardTitle>
                      {expandedSections.amenities ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </CardHeader>
                  {(expandedSections.amenities || venue.amenities.length <= 6) && (
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {venue.amenities.map((amenity: any, index: number) => (
                          <div key={index} className="flex items-center">
                            {renderAmenityIcon(amenity.icon)}
                            <span>{amenity.name}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>

                <DocumentManager venueId={venue.id} isOwner={venue.isOwner} documents={venue.documents} />
              </motion.div>
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="mt-6">
              <motion.div
                key="events"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-purple-400" /> Upcoming Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {venue.upcomingEvents.map((event: any) => (
                        <div key={event.id} className="border border-gray-800 rounded-lg p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <h3 className="font-medium text-white">{event.title}</h3>
                              <p className="text-sm text-purple-400">{event.artist}</p>
                              <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                                <Calendar className="h-3 w-3" />
                                <span>{formatDate(event.date)}</span>
                                <Clock className="h-3 w-3 ml-2" />
                                <span>{formatTime(event.date)}</span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Badge>{event.status}</Badge>
                              <Button className="bg-purple-600 hover:bg-purple-700">
                                <Ticket className="h-4 w-4 mr-2" /> Get Tickets
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button variant="outline" className="w-full mt-4">
                      View All Events
                    </Button>
                  </CardContent>
                </Card>

                {venue.isOwner && (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-purple-400" /> Event Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Button className="w-full bg-purple-600 hover:bg-purple-700">
                          <Calendar className="h-4 w-4 mr-2" /> Create New Event
                        </Button>
                        <Button className="w-full" variant="outline">
                          <Calendar className="h-4 w-4 mr-2" /> Manage Existing Events
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </TabsContent>

            {/* Booking Tab */}
            <TabsContent value="booking" className="mt-6">
              <motion.div
                key="booking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {showBookingForm ? (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle>Booking Request</CardTitle>
                      <CardDescription>
                        {selectedDate
                          ? `Request to book ${venue.name} on ${formatSafeDate(selectedDate.toISOString())}`
                          : `Request to book ${venue.name}`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Event Name</label>
                            <input
                              type="text"
                              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2"
                              placeholder="Enter event name"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Event Type</label>
                            <select className="w-full bg-gray-800 border border-gray-700 rounded-md p-2">
                              <option value="">Select event type</option>
                              <option value="concert">Concert</option>
                              <option value="private">Private Event</option>
                              <option value="corporate">Corporate Event</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Date</label>
                            <input
                              type="date"
                              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2"
                              value={selectedDate ? selectedDate.toISOString().split("T")[0] : ""}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Expected Attendance</label>
                            <input
                              type="number"
                              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2"
                              placeholder="Number of attendees"
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-medium">Additional Details</label>
                            <textarea
                              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 min-h-[100px]"
                              placeholder="Provide any additional details about your event"
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <div className="px-6 pb-6 flex justify-end gap-2">
                      <Button variant="outline" onClick={handleCancelBooking}>
                        Cancel
                      </Button>
                      <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleSubmitBooking}>
                        Submit Request
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <>
                    <BookingCalendar
                      venueId={venue.id}
                      onDateSelect={(date) => handleBookingRequest(date)}
                      isOwner={venue.isOwner}
                    />

                    {venue.isOwner && (
                      <Card className="bg-gray-900 border-gray-800">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-purple-400" /> Booking Management
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                              <div>
                                <h3 className="font-medium">Pending Requests</h3>
                                <p className="text-sm text-gray-400">3 new booking requests</p>
                              </div>
                              <Button>View Requests</Button>
                            </div>

                            <div className="flex justify-between items-center p-4 bg-gray-800 rounded-lg">
                              <div>
                                <h3 className="font-medium">Booking Settings</h3>
                                <p className="text-sm text-gray-400">Manage your booking policies</p>
                              </div>
                              <Button variant="outline">
                                <Settings className="h-4 w-4 mr-2" /> Settings
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </motion.div>
            </TabsContent>

            {/* Specs Tab */}
            <TabsContent value="specs" className="mt-6">
              <motion.div
                key="specs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader className="pb-2">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleSection("specs")}
                    >
                      <CardTitle className="flex items-center gap-2">
                        <Music className="h-5 w-5 text-purple-400" /> Venue Specifications
                      </CardTitle>
                      {expandedSections.specs ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </CardHeader>
                  {expandedSections.specs && (
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-medium text-white">Capacity</h3>
                            <p className="text-gray-400">{venue.capacity} people</p>
                          </div>

                          <div>
                            <h3 className="font-medium text-white">Sound System</h3>
                            <p className="text-gray-400">{venue.specs.soundSystem}</p>
                          </div>

                          <div>
                            <h3 className="font-medium text-white">Lighting</h3>
                            <p className="text-gray-400">{venue.specs.lighting}</p>
                          </div>

                          <div>
                            <h3 className="font-medium text-white">Stage</h3>
                            <p className="text-gray-400">{venue.specs.stage}</p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h3 className="font-medium text-white">Parking</h3>
                            <p className="text-gray-400">{venue.specs.parking}</p>
                          </div>

                          <div>
                            <h3 className="font-medium text-white">Accessibility</h3>
                            <p className="text-gray-400">{venue.specs.accessibility}</p>
                          </div>

                          <div>
                            <h3 className="font-medium text-white">Bar Service</h3>
                            <p className="text-gray-400">{venue.specs.bar}</p>
                          </div>

                          <div>
                            <h3 className="font-medium text-white">Food Service</h3>
                            <p className="text-gray-400">{venue.specs.foodService}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 space-y-2">
                        <h3 className="font-medium text-white">Technical Documents</h3>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline">
                            <FileText className="h-4 w-4 mr-2" /> Stage Plot
                          </Button>
                          <Button variant="outline">
                            <FileText className="h-4 w-4 mr-2" /> Technical Rider
                          </Button>
                          <Button variant="outline">
                            <FileText className="h-4 w-4 mr-2" /> Floor Plan
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            </TabsContent>

            {/* Gallery Tab */}
            <TabsContent value="gallery" className="mt-6">
              <motion.div
                key="gallery"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-purple-400" /> Venue Gallery
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {venue.gallery.map((item: any) => (
                        <motion.div key={item.id} whileHover={{ scale: 1.03 }} className="overflow-hidden rounded-lg">
                          <img
                            src={item.url || "/placeholder.svg"}
                            alt={item.alt}
                            className="w-full h-48 object-cover hover:opacity-90 transition-opacity cursor-pointer"
                          />
                        </motion.div>
                      ))}
                    </div>

                    {venue.isOwner && (
                      <Button className="w-full mt-4">
                        <ImageIcon className="h-4 w-4 mr-2" /> Manage Gallery
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Analytics Tab (Owner Only) */}
            {venue.isOwner && (
              <TabsContent value="analytics" className="mt-6">
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <VenueAnalytics venueId={venue.id} />
                </motion.div>
              </TabsContent>
            )}
          </AnimatePresence>
        </Tabs>
      </div>
    </div>
  )
}
