"use client"

import type React from "react"

import { useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, DollarSign, MapPin, Upload, Users } from "lucide-react"
import type { EventData } from "@/lib/venue/types"

interface CreateEventModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateEventModal({ isOpen, onClose }: CreateEventModalProps) {
  // VEN-035: legacy localStorage profile context retired. Real event creation
  // lands with the canonical events service (VEN-091); until then this modal
  // must not fabricate success.
  const { toast } = useToast()
  const [formData, setFormData] = useState<EventData>({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
    location: "",
    venue: "",
    isPublic: true,
    capacity: 0,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: Number.parseInt(value) || 0 }))
  }

  const handleSwitchChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, isPublic: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.startDate || !formData.venue) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    // VEN-035/VEN-091: no server-side event creation exists yet — surface a
    // truthful unavailable state instead of fabricating success.
    toast({
      title: "Event creation not available yet",
      description:
        "Venue event publishing is being migrated to the canonical events service. Use the venue dashboard events tools in the meantime.",
      variant: "destructive",
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>Create a New Event</DialogTitle>
          <DialogDescription className="text-gray-400">
            Create an event that can be found on the heatmap and generate tickets.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Event Title*</Label>
            <Input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter event title"
              className="bg-gray-800 border-gray-700"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your event"
              className="bg-gray-800 border-gray-700 min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date & Time*</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="startDate"
                  name="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="bg-gray-800 border-gray-700 pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date & Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="endDate"
                  name="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="bg-gray-800 border-gray-700 pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="venue">Venue*</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="venue"
                  name="venue"
                  value={formData.venue}
                  onChange={handleChange}
                  placeholder="Venue name"
                  className="bg-gray-800 border-gray-700 pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="City, State"
                  className="bg-gray-800 border-gray-700 pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <div className="relative">
                <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="0"
                  value={formData.capacity || ""}
                  onChange={handleNumberChange}
                  placeholder="Maximum attendees"
                  className="bg-gray-800 border-gray-700 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketPrice">Ticket Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="ticketPrice"
                  name="ticketPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.ticketPrice || ""}
                  onChange={handleNumberChange}
                  placeholder="0.00"
                  className="bg-gray-800 border-gray-700 pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isPublic">Public Event</Label>
              <p className="text-sm text-gray-400">Event will be visible on the heatmap</p>
            </div>
            <Switch id="isPublic" checked={formData.isPublic} onCheckedChange={handleSwitchChange} />
          </div>

          <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center">
            <div className="flex flex-col items-center justify-center gap-1">
              <Upload className="h-8 w-8 text-gray-500" />
              <p className="text-sm font-medium">Upload Event Cover Image</p>
              <p className="text-xs text-gray-400">Drag and drop or click to upload</p>
              <Input id="coverImage" name="coverImage" type="file" accept="image/*" className="hidden" />
              <Button type="button" variant="outline" size="sm" className="mt-2 border-gray-700">
                Choose File
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-700">
              Cancel
            </Button>
            <Button type="submit">Create Event</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
