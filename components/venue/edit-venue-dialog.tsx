"use client"

import type React from "react"

import { useState } from "react"
import { Building2, MapPin, Users, Mail, Phone, Globe, Instagram, Twitter, Facebook, Save, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { detailSurfacePattern } from "@/components/dashboard/detail-surface-pattern"
import { cn } from "@/lib/utils"

export type VenueData = {
  id: string
  name: string
  type: string
  location: string
  capacity: number
  rating: number
  reviewCount: number
  description: string
  amenities: string[]
  contactEmail: string
  contactPhone: string
  website: string
  socialMedia: {
    instagram: string
    twitter: string
    facebook: string
  }
}

interface EditVenueDialogProps {
  venue: VenueData
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (updatedVenue: VenueData) => void
}

export function EditVenueDialog({ venue, open, onOpenChange, onSave }: EditVenueDialogProps) {
  const [venueData, setVenueData] = useState<VenueData>({ ...venue })
  const [activeTab, setActiveTab] = useState("general")
  const [newAmenity, setNewAmenity] = useState("")

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target

    if (name.includes(".")) {
      const [parent, child] = name.split(".")
      const parentValue = venueData[parent as keyof VenueData]
      if (typeof parentValue === 'object' && parentValue !== null) {
        setVenueData({
          ...venueData,
          [parent]: {
            ...parentValue,
            [child]: value,
          },
        })
      }
    } else {
      setVenueData({
        ...venueData,
        [name]: value,
      })
    }
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setVenueData({
      ...venueData,
      [name]: Number.parseInt(value) || 0,
    })
  }

  const handleAddAmenity = () => {
    if (newAmenity.trim()) {
      setVenueData({
        ...venueData,
        amenities: [...venueData.amenities, newAmenity.trim()],
      })
      setNewAmenity("")
    }
  }

  const handleRemoveAmenity = (index: number) => {
    setVenueData({
      ...venueData,
      amenities: venueData.amenities.filter((_, i) => i !== index),
    })
  }

  const handleSave = () => {
    onSave(venueData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-[600px]", detailSurfacePattern.dialogContent)}>
        <div className={detailSurfacePattern.topAccent} />
        <DialogHeader>
          <DialogTitle className={cn(detailSurfacePattern.title, "text-xl font-bold")}>Edit Venue Profile</DialogTitle>
          <DialogDescription className={detailSurfacePattern.description}>Update your venue information and details</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className={cn(detailSurfacePattern.tabsList, "p-1")}>
            <TabsTrigger value="general" className={detailSurfacePattern.tabsTrigger}>
              General
            </TabsTrigger>
            <TabsTrigger value="contact" className={detailSurfacePattern.tabsTrigger}>
              Contact
            </TabsTrigger>
            <TabsTrigger value="amenities" className={detailSurfacePattern.tabsTrigger}>
              Amenities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className={detailSurfacePattern.label}>
                  Venue Name
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    id="name"
                    name="name"
                    value={venueData.name}
                    onChange={handleInputChange}
                    className={cn(detailSurfacePattern.input, "pl-8")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type" className={detailSurfacePattern.label}>
                  Venue Type
                </Label>
                <Input
                  id="type"
                  name="type"
                  value={venueData.type}
                  onChange={handleInputChange}
                  className={detailSurfacePattern.input}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location" className={detailSurfacePattern.label}>
                  Location
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    id="location"
                    name="location"
                    value={venueData.location}
                    onChange={handleInputChange}
                    className={cn(detailSurfacePattern.input, "pl-8")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity" className={detailSurfacePattern.label}>
                  Capacity
                </Label>
                <div className="relative">
                  <Users className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    value={venueData.capacity}
                    onChange={handleNumberChange}
                    className={cn(detailSurfacePattern.input, "pl-8")}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className={detailSurfacePattern.label}>
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={venueData.description}
                onChange={handleInputChange}
                className={cn(detailSurfacePattern.textarea, "min-h-[120px]")}
              />
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className={detailSurfacePattern.label}>
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    value={venueData.contactEmail}
                    onChange={handleInputChange}
                    className={cn(detailSurfacePattern.input, "pl-8")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone" className={detailSurfacePattern.label}>
                  Phone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    value={venueData.contactPhone}
                    onChange={handleInputChange}
                    className={cn(detailSurfacePattern.input, "pl-8")}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className={detailSurfacePattern.label}>
                Website
              </Label>
              <div className="relative">
                <Globe className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  id="website"
                  name="website"
                  value={venueData.website}
                  onChange={handleInputChange}
                  className={cn(detailSurfacePattern.input, "pl-8")}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className={cn(detailSurfacePattern.label, "text-sm font-medium")}>Social Media</h3>

              <div className="space-y-2">
                <Label htmlFor="instagram" className={detailSurfacePattern.label}>
                  Instagram
                </Label>
                <div className="relative">
                  <Instagram className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    id="instagram"
                    name="socialMedia.instagram"
                    value={venueData.socialMedia.instagram}
                    onChange={handleInputChange}
                    className={cn(detailSurfacePattern.input, "pl-8")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter" className={detailSurfacePattern.label}>
                  Twitter
                </Label>
                <div className="relative">
                  <Twitter className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    id="twitter"
                    name="socialMedia.twitter"
                    value={venueData.socialMedia.twitter}
                    onChange={handleInputChange}
                    className={cn(detailSurfacePattern.input, "pl-8")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facebook" className={detailSurfacePattern.label}>
                  Facebook
                </Label>
                <div className="relative">
                  <Facebook className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    id="facebook"
                    name="socialMedia.facebook"
                    value={venueData.socialMedia.facebook}
                    onChange={handleInputChange}
                    className={cn(detailSurfacePattern.input, "pl-8")}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="amenities" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className={detailSurfacePattern.label}>Current Amenities</Label>
              <div className={cn(detailSurfacePattern.panelMuted, "flex flex-wrap gap-2 p-4 min-h-[100px]")}>
                {venueData.amenities.length > 0 ? (
                  venueData.amenities.map((amenity, index) => (
                    <Badge key={index} className={cn(detailSurfacePattern.badge, "px-3 py-1")}>
                      {amenity}
                      <button
                        onClick={() => handleRemoveAmenity(index)}
                        className="ml-2 text-white/60 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <div className={cn(detailSurfacePattern.description, "text-sm")}>No amenities added yet</div>
                )}
              </div>
            </div>

            <div className="flex space-x-2">
              <div className="flex-1">
                <Input
                  placeholder="Add new amenity..."
                  value={newAmenity}
                  onChange={(e) => setNewAmenity(e.target.value)}
                  className={detailSurfacePattern.input}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddAmenity()
                    }
                  }}
                />
              </div>
              <Button onClick={handleAddAmenity} className={detailSurfacePattern.btnPrimary}>
                Add
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={detailSurfacePattern.btnOutline}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className={detailSurfacePattern.btnPrimary}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
