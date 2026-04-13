"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "../../../../components/loading-spinner"
import {
  ArrowLeft,
  Save,
  Upload,
  Trash,
  Plus,
  Calendar,
  FileText,
  Users,
  Settings,
  ImageIcon,
  Music,
  Wifi,
  ParkingMeter,
  Accessibility,
  Coffee,
} from "lucide-react"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"

// Mock venue data - in a real app, this would come from an API
const mockVenue = {
  id: "venue-1",
  name: "The Echo Lounge",
  username: "echolounge",
  description:
    "A premier music venue with state-of-the-art sound and lighting systems, hosting both local and touring artists.",
  location: "Los Angeles, CA",
  address: "1234 Sunset Blvd, Los Angeles, CA 90026",
  avatar: "/placeholder.svg?height=200&width=200&text=Echo+Lounge",
  coverImage: "/placeholder.svg?height=400&width=1200&text=Echo+Lounge+Stage",
  capacity: 850,
  type: "Music Venue",
  amenities: [
    { id: "wifi", name: "Wi-Fi", icon: "Wifi", enabled: true },
    { id: "parking", name: "Parking", icon: "ParkingMeter", enabled: true },
    { id: "ada", name: "ADA Access", icon: "Accessibility", enabled: true },
    { id: "greenroom", name: "Green Room", icon: "Coffee", enabled: true },
    { id: "sound", name: "Sound System", icon: "Music", enabled: true },
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
  bookingSettings: {
    allowDirectBooking: false,
    requireDeposit: true,
    depositAmount: 500,
    cancellationPolicy: "48 hours notice required for full refund",
    autoAcceptBookings: false,
  },
  gallery: [
    { id: "img-1", url: "/placeholder.svg?height=300&width=400&text=Stage", alt: "Main stage" },
    { id: "img-2", url: "/placeholder.svg?height=300&width=400&text=Bar", alt: "Bar area" },
    { id: "img-3", url: "/placeholder.svg?height=300&width=400&text=Entrance", alt: "Venue entrance" },
    { id: "img-4", url: "/placeholder.svg?height=300&width=400&text=Green+Room", alt: "Green room" },
    { id: "img-5", url: "/placeholder.svg?height=300&width=400&text=Sound+Booth", alt: "Sound booth" },
    { id: "img-6", url: "/placeholder.svg?height=300&width=400&text=Crowd", alt: "Crowd view" },
  ],
  documents: [
    { id: "doc-1", name: "Stage Plot & Technical Rider", type: "pdf", url: "#" },
    { id: "doc-2", name: "Floor Plan", type: "pdf", url: "#" },
    { id: "doc-3", name: "Booking Policy", type: "pdf", url: "#" },
    { id: "doc-4", name: "Hospitality Information", type: "pdf", url: "#" },
  ],
}

export default function EditVenuePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [venue, setVenue] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("basic")

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setVenue((prev: any) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setVenue((prev: any) => ({
      ...prev,
      bookingContact: {
        ...prev.bookingContact,
        [name]: value,
      },
    }))
  }

  const handleSpecsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setVenue((prev: any) => ({
      ...prev,
      specs: {
        ...prev.specs,
        [name]: value,
      },
    }))
  }

  const handleBookingSettingToggle = (setting: string, checked: boolean) => {
    setVenue((prev: any) => ({
      ...prev,
      bookingSettings: {
        ...prev.bookingSettings,
        [setting]: checked,
      },
    }))
  }

  const handleBookingSettingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setVenue((prev: any) => ({
      ...prev,
      bookingSettings: {
        ...prev.bookingSettings,
        [name]: value,
      },
    }))
  }

  const handleAmenityToggle = (id: string, checked: boolean) => {
    setVenue((prev: any) => ({
      ...prev,
      amenities: prev.amenities.map((amenity: any) => (amenity.id === id ? { ...amenity, enabled: checked } : amenity)),
    }))
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Changes Saved",
        description: "Your venue profile has been updated successfully.",
      })

      router.push(`/venues/${params.id}`)
    } catch (error) {
      console.error("Error saving venue:", error)
      toast({
        title: "Save Error",
        description: "There was an error saving your changes. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push(`/venues/${params.id}`)
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
            <p className="text-gray-400 mb-4">The venue you're trying to edit doesn't exist or has been removed.</p>
            <Button onClick={() => router.push("/venues")}>Browse Venues</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Venue
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Edit Venue Profile</CardTitle>
          <CardDescription>Update your venue's information and settings</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`mb-6 ${venueDashboardTabListClass}`}>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="specs">Venue Specs</TabsTrigger>
              <TabsTrigger value="booking">Booking Settings</TabsTrigger>
              <TabsTrigger value="media">Media & Documents</TabsTrigger>
              <TabsTrigger value="team">Team Access</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Profile Images</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Profile Image</Label>
                    <div className="border border-dashed border-gray-700 rounded-lg p-4 text-center">
                      <div className="flex flex-col items-center">
                        <img
                          src={venue.avatar || "/placeholder.svg"}
                          alt="Venue profile"
                          className="w-32 h-32 object-cover rounded-lg mb-4"
                        />
                        <Button variant="outline" size="sm" className="border-gray-700">
                          <Upload className="h-4 w-4 mr-2" /> Change Image
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cover Image</Label>
                    <div className="border border-dashed border-gray-700 rounded-lg p-4 text-center">
                      <div className="flex flex-col items-center">
                        <img
                          src={venue.coverImage || "/placeholder.svg"}
                          alt="Venue cover"
                          className="w-full h-32 object-cover rounded-lg mb-4"
                        />
                        <Button variant="outline" size="sm" className="border-gray-700">
                          <Upload className="h-4 w-4 mr-2" /> Change Cover
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Venue Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Venue Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={venue.name}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      name="username"
                      value={venue.username}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Venue Type *</Label>
                    <Input
                      id="type"
                      name="type"
                      value={venue.type}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity *</Label>
                    <Input
                      id="capacity"
                      name="capacity"
                      type="number"
                      value={venue.capacity}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700"
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={venue.description}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700 min-h-[100px]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Location</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">City/State *</Label>
                    <Input
                      id="location"
                      name="location"
                      value={venue.location}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700"
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Full Address *</Label>
                    <Input
                      id="address"
                      name="address"
                      value={venue.address}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Contact Information</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Contact Name *</Label>
                    <Input
                      id="contactName"
                      name="name"
                      value={venue.bookingContact.name}
                      onChange={handleContactChange}
                      className="bg-gray-800 border-gray-700"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Email *</Label>
                    <Input
                      id="contactEmail"
                      name="email"
                      value={venue.bookingContact.email}
                      onChange={handleContactChange}
                      className="bg-gray-800 border-gray-700"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Phone *</Label>
                    <Input
                      id="contactPhone"
                      name="phone"
                      value={venue.bookingContact.phone}
                      onChange={handleContactChange}
                      className="bg-gray-800 border-gray-700"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Amenities</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {venue.amenities.map((amenity: any) => (
                    <div key={amenity.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center">
                        {amenity.icon === "Wifi" && <Wifi className="h-4 w-4 mr-2" />}
                        {amenity.icon === "ParkingMeter" && <ParkingMeter className="h-4 w-4 mr-2" />}
                        {amenity.icon === "Accessibility" && <Accessibility className="h-4 w-4 mr-2" />}
                        {amenity.icon === "Coffee" && <Coffee className="h-4 w-4 mr-2" />}
                        {amenity.icon === "Music" && <Music className="h-4 w-4 mr-2" />}
                        <span>{amenity.name}</span>
                      </div>
                      <Switch
                        checked={amenity.enabled}
                        onCheckedChange={(checked) => handleAmenityToggle(amenity.id, checked)}
                      />
                    </div>
                  ))}

                  <Button variant="outline" className="border-dashed border-gray-700">
                    <Plus className="h-4 w-4 mr-2" /> Add Amenity
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Venue Specs Tab */}
            <TabsContent value="specs" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Technical Specifications</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="soundSystem">Sound System</Label>
                    <Textarea
                      id="soundSystem"
                      name="soundSystem"
                      value={venue.specs.soundSystem}
                      onChange={handleSpecsChange}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lighting">Lighting</Label>
                    <Textarea
                      id="lighting"
                      name="lighting"
                      value={venue.specs.lighting}
                      onChange={handleSpecsChange}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stage">Stage Dimensions</Label>
                    <Input
                      id="stage"
                      name="stage"
                      value={venue.specs.stage}
                      onChange={handleSpecsChange}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parking">Parking</Label>
                    <Input
                      id="parking"
                      name="parking"
                      value={venue.specs.parking}
                      onChange={handleSpecsChange}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accessibility">Accessibility</Label>
                    <Input
                      id="accessibility"
                      name="accessibility"
                      value={venue.specs.accessibility}
                      onChange={handleSpecsChange}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bar">Bar Service</Label>
                    <Input
                      id="bar"
                      name="bar"
                      value={venue.specs.bar}
                      onChange={handleSpecsChange}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="foodService">Food Service</Label>
                    <Input
                      id="foodService"
                      name="foodService"
                      value={venue.specs.foodService}
                      onChange={handleSpecsChange}
                      className="bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Technical Documents</h3>

                <div className="space-y-2">
                  {venue.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        <span>{doc.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 border-gray-700">
                          <Upload className="h-4 w-4 mr-2" /> Update
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 border-gray-700 text-red-500">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" className="w-full border-dashed border-gray-700">
                    <Plus className="h-4 w-4 mr-2" /> Add Document
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Booking Settings Tab */}
            <TabsContent value="booking" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Booking Preferences</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium">Allow Direct Booking</h4>
                      <p className="text-sm text-gray-400">Let artists book your venue without manual approval</p>
                    </div>
                    <Switch
                      checked={venue.bookingSettings.allowDirectBooking}
                      onCheckedChange={(checked) => handleBookingSettingToggle("allowDirectBooking", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium">Require Deposit</h4>
                      <p className="text-sm text-gray-400">Require a deposit payment to confirm bookings</p>
                    </div>
                    <Switch
                      checked={venue.bookingSettings.requireDeposit}
                      onCheckedChange={(checked) => handleBookingSettingToggle("requireDeposit", checked)}
                    />
                  </div>

                  {venue.bookingSettings.requireDeposit && (
                    <div className="space-y-2 ml-4">
                      <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
                      <Input
                        id="depositAmount"
                        name="depositAmount"
                        type="number"
                        value={venue.bookingSettings.depositAmount}
                        onChange={handleBookingSettingChange}
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                      <h4 className="font-medium">Auto-Accept Bookings</h4>
                      <p className="text-sm text-gray-400">
                        Automatically accept booking requests if the date is available
                      </p>
                    </div>
                    <Switch
                      checked={venue.bookingSettings.autoAcceptBookings}
                      onCheckedChange={(checked) => handleBookingSettingToggle("autoAcceptBookings", checked)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Policies</h3>

                <div className="space-y-2">
                  <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
                  <Textarea
                    id="cancellationPolicy"
                    name="cancellationPolicy"
                    value={venue.bookingSettings.cancellationPolicy}
                    onChange={handleBookingSettingChange}
                    className="bg-gray-800 border-gray-700 min-h-[100px]"
                    placeholder="Describe your cancellation policy..."
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Calendar Integration</h3>

                <div className="p-4 bg-gray-800 rounded-lg">
                  <h4 className="font-medium mb-2">Connected Calendars</h4>
                  <p className="text-sm text-gray-400 mb-4">Sync your venue's availability with external calendars</p>

                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Calendar className="h-4 w-4 mr-2" /> Connect Calendar
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Media & Documents Tab */}
            <TabsContent value="media" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Gallery</h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {venue.gallery.map((item: any) => (
                    <div key={item.id} className="relative group">
                      <img
                        src={item.url || "/placeholder.svg"}
                        alt={item.alt}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                        <Button variant="outline" size="sm" className="h-8 border-white text-white">
                          <Upload className="h-4 w-4 mr-2" /> Replace
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 border-white text-white">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="border border-dashed border-gray-700 rounded-lg flex items-center justify-center h-32">
                    <Button variant="ghost">
                      <Plus className="h-4 w-4 mr-2" /> Add Image
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Virtual Tour</h3>

                <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <ImageIcon className="h-8 w-8 text-gray-500" />
                    <p className="text-sm font-medium">Upload 360° Images or Video Tour</p>
                    <p className="text-xs text-gray-400">Provide a virtual walkthrough of your venue</p>
                    <Button variant="outline" size="sm" className="mt-2 border-gray-700">
                      Upload Media
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Team Access Tab */}
            <TabsContent value="team" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Team Members</h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-purple-800 flex items-center justify-center mr-3">
                        AJ
                      </div>
                      <div>
                        <h4 className="font-medium">Alex Johnson</h4>
                        <p className="text-sm text-gray-400">Owner/Admin</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-gray-700">
                      <Settings className="h-4 w-4 mr-2" /> Manage
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-800 flex items-center justify-center mr-3">SM</div>
                      <div>
                        <h4 className="font-medium">Sarah Miller</h4>
                        <p className="text-sm text-gray-400">Booking Manager</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-gray-700">
                      <Settings className="h-4 w-4 mr-2" /> Manage
                    </Button>
                  </div>

                  <Button variant="outline" className="w-full border-dashed border-gray-700">
                    <Users className="h-4 w-4 mr-2" /> Invite Team Member
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Role Permissions</h3>

                <div className="space-y-2">
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">Admin</h4>
                    <p className="text-sm text-gray-400 mb-2">Full access to all venue settings and features</p>
                    <Button variant="outline" size="sm" className="border-gray-700">
                      <Settings className="h-4 w-4 mr-2" /> Edit Permissions
                    </Button>
                  </div>

                  <div className="p-3 bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">Booking Manager</h4>
                    <p className="text-sm text-gray-400 mb-2">Can manage bookings, events, and calendar</p>
                    <Button variant="outline" size="sm" className="border-gray-700">
                      <Settings className="h-4 w-4 mr-2" /> Edit Permissions
                    </Button>
                  </div>

                  <div className="p-3 bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">Staff</h4>
                    <p className="text-sm text-gray-400 mb-2">Limited access to view events and assigned tasks</p>
                    <Button variant="outline" size="sm" className="border-gray-700">
                      <Settings className="h-4 w-4 mr-2" /> Edit Permissions
                    </Button>
                  </div>

                  <Button variant="outline" className="w-full border-dashed border-gray-700">
                    <Plus className="h-4 w-4 mr-2" /> Create Custom Role
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" /> Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
