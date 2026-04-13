"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "../../../components/loading-spinner"
import { ArrowLeft, Save, Upload, Plus, Music, Wifi, ParkingMeter, Accessibility, Coffee } from "lucide-react"
import { venueDashboardTabListClass } from "@/app/venue/lib/dashboard-ui"

export default function CreateVenuePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [venueData, setVenueData] = useState({
    name: "",
    username: "",
    description: "",
    location: "",
    address: "",
    capacity: "",
    type: "",
    bookingContact: {
      name: "",
      email: "",
      phone: "",
    },
    specs: {
      soundSystem: "",
      lighting: "",
      stage: "",
      parking: "",
      accessibility: "",
      bar: "",
      foodService: "",
    },
    amenities: [
      { id: "wifi", name: "Wi-Fi", icon: "Wifi", enabled: false },
      { id: "parking", name: "Parking", icon: "ParkingMeter", enabled: false },
      { id: "ada", name: "ADA Access", icon: "Accessibility", enabled: false },
      { id: "greenroom", name: "Green Room", icon: "Coffee", enabled: false },
      { id: "sound", name: "Sound System", icon: "Music", enabled: false },
    ],
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setVenueData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setVenueData((prev) => ({
      ...prev,
      bookingContact: {
        ...prev.bookingContact,
        [name]: value,
      },
    }))
  }

  const handleSpecsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setVenueData((prev) => ({
      ...prev,
      specs: {
        ...prev.specs,
        [name]: value,
      },
    }))
  }

  const handleAmenityToggle = (id: string, checked: boolean) => {
    setVenueData((prev) => ({
      ...prev,
      amenities: prev.amenities.map((amenity) => (amenity.id === id ? { ...amenity, enabled: checked } : amenity)),
    }))
  }

  const handleSave = async () => {
    // Validate required fields
    if (!venueData.name || !venueData.location || !venueData.type) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Venue Created",
        description: "Your venue has been created successfully.",
      })

      router.push("/venues")
    } catch (error) {
      console.error("Error creating venue:", error)
      toast({
        title: "Creation Error",
        description: "There was an error creating your venue. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push("/venues")
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
      <div className="flex justify-between items-center mb-6">
        <Button variant="ghost" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Venues
        </Button>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" /> Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Create Venue
              </>
            )}
          </Button>
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Create New Venue</CardTitle>
          <CardDescription>Set up your venue profile and start accepting bookings</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`mb-6 ${venueDashboardTabListClass}`}>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="specs">Venue Specs</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Profile Images</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Profile Image</Label>
                    <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Upload className="h-8 w-8 text-gray-500" />
                        <p className="text-sm font-medium">Upload Profile Image</p>
                        <p className="text-xs text-gray-400">Drag and drop or click to upload</p>
                        <Button variant="outline" size="sm" className="mt-2 border-gray-700">
                          Choose File
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cover Image</Label>
                    <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Upload className="h-8 w-8 text-gray-500" />
                        <p className="text-sm font-medium">Upload Cover Image</p>
                        <p className="text-xs text-gray-400">Drag and drop or click to upload</p>
                        <Button variant="outline" size="sm" className="mt-2 border-gray-700">
                          Choose File
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
                      value={venueData.name}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Enter venue name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      name="username"
                      value={venueData.username}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Choose a unique username"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Venue Type *</Label>
                    <Input
                      id="type"
                      name="type"
                      value={venueData.type}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="e.g. Music Venue, Club, Theater"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity *</Label>
                    <Input
                      id="capacity"
                      name="capacity"
                      type="number"
                      value={venueData.capacity}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Maximum capacity"
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={venueData.description}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700 min-h-[100px]"
                      placeholder="Describe your venue"
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
                      value={venueData.location}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="e.g. Los Angeles, CA"
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Full Address *</Label>
                    <Input
                      id="address"
                      name="address"
                      value={venueData.address}
                      onChange={handleInputChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Street address, city, state, zip"
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
                      value={venueData.bookingContact.name}
                      onChange={handleContactChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Name of booking contact"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Email *</Label>
                    <Input
                      id="contactEmail"
                      name="email"
                      type="email"
                      value={venueData.bookingContact.email}
                      onChange={handleContactChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Booking email address"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Phone *</Label>
                    <Input
                      id="contactPhone"
                      name="phone"
                      value={venueData.bookingContact.phone}
                      onChange={handleContactChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Contact phone number"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Amenities</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {venueData.amenities.map((amenity) => (
                    <div key={amenity.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center">
                        {renderAmenityIcon(amenity.icon)}
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
                      value={venueData.specs.soundSystem}
                      onChange={handleSpecsChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Describe your sound system"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lighting">Lighting</Label>
                    <Textarea
                      id="lighting"
                      name="lighting"
                      value={venueData.specs.lighting}
                      onChange={handleSpecsChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Describe your lighting setup"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stage">Stage Dimensions</Label>
                    <Input
                      id="stage"
                      name="stage"
                      value={venueData.specs.stage}
                      onChange={handleSpecsChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="e.g. 24' x 16' with 3' height"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parking">Parking</Label>
                    <Input
                      id="parking"
                      name="parking"
                      value={venueData.specs.parking}
                      onChange={handleSpecsChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Describe parking options"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accessibility">Accessibility</Label>
                    <Input
                      id="accessibility"
                      name="accessibility"
                      value={venueData.specs.accessibility}
                      onChange={handleSpecsChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Describe accessibility features"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bar">Bar Service</Label>
                    <Input
                      id="bar"
                      name="bar"
                      value={venueData.specs.bar}
                      onChange={handleSpecsChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Describe bar service"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="foodService">Food Service</Label>
                    <Input
                      id="foodService"
                      name="foodService"
                      value={venueData.specs.foodService}
                      onChange={handleSpecsChange}
                      className="bg-gray-800 border-gray-700"
                      placeholder="Describe food service options"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Technical Documents</h3>

                <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Upload className="h-8 w-8 text-gray-500" />
                    <p className="text-sm font-medium">Upload Technical Documents</p>
                    <p className="text-xs text-gray-400">Stage plots, floor plans, tech riders, etc.</p>
                    <Button variant="outline" size="sm" className="mt-2 border-gray-700">
                      Choose Files
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Gallery</h3>

                <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Upload className="h-8 w-8 text-gray-500" />
                    <p className="text-sm font-medium">Upload Gallery Images</p>
                    <p className="text-xs text-gray-400">Add photos of your venue</p>
                    <Button variant="outline" size="sm" className="mt-2 border-gray-700">
                      Choose Files
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Virtual Tour</h3>

                <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Upload className="h-8 w-8 text-gray-500" />
                    <p className="text-sm font-medium">Upload 360° Images or Video Tour</p>
                    <p className="text-xs text-gray-400">Provide a virtual walkthrough of your venue</p>
                    <Button variant="outline" size="sm" className="mt-2 border-gray-700">
                      Upload Media
                    </Button>
                  </div>
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
                <LoadingSpinner size="sm" className="mr-2" /> Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Create Venue
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
