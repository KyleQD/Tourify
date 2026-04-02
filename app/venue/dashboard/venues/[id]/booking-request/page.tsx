"use client"

import type React from "react"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Clock, Users, Music, FileText, ArrowLeft } from "lucide-react"
import { LoadingSpinner } from "../../../../components/loading-spinner"
import { NeoDateInput } from "@/components/ui/neo-date-input"

export default function BookingRequestPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    artistName: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    eventDate: "",
    alternativeDate: "",
    startTime: "",
    endTime: "",
    expectedAttendance: "",
    eventType: "",
    additionalInfo: "",
    agreeToTerms: false,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, agreeToTerms: checked }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.agreeToTerms) {
      toast({
        title: "Agreement Required",
        description: "Please agree to the terms and conditions to submit your booking request.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const venueId = Array.isArray(params.id) ? params.id[0] : params.id
      const response = await fetch("/api/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venueId,
          email: formData.contactEmail,
          phone: formData.contactPhone,
          eventName: formData.artistName,
          eventType: formData.eventType,
          eventDate: formData.eventDate,
          expectedAttendance: Number(formData.expectedAttendance || 0),
          bookingDetails: {
            performanceType: formData.eventType,
            description: formData.additionalInfo || `${formData.artistName} booking request`,
            performanceDate: formData.eventDate,
            soundcheckTime: "",
            performanceTime: formData.startTime,
            duration: `${formData.startTime}-${formData.endTime}`,
            venue: `venue-${venueId}`,
            location: "TBD",
            compensation: "TBD",
            requirements: "",
            additionalNotes: [
              `contact_name:${formData.contactName}`,
              `artist_name:${formData.artistName}`,
              `expected_attendance:${formData.expectedAttendance}`,
              `alternative_date:${formData.alternativeDate || "none"}`,
            ].join(" | "),
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit booking request")
      }

      toast({
        title: "Booking Request Submitted",
        description: "Your booking request has been sent to the venue. They will contact you shortly.",
      })

      router.push(`/venues/${params.id}`)
    } catch (error) {
      console.error("Error submitting booking request:", error)
      toast({
        title: "Submission Error",
        description: "There was an error submitting your booking request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <Button variant="ghost" className="mb-4" onClick={() => router.push(`/venues/${params.id}`)}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Venue
      </Button>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Booking Request</CardTitle>
          <CardDescription>Submit a request to book this venue for your event</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Artist/Event Information</h3>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="artistName">Artist/Event Name *</Label>
                  <div className="relative">
                    <Music className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="artistName"
                      name="artistName"
                      value={formData.artistName}
                      onChange={handleChange}
                      className="pl-10 bg-gray-800 border-gray-700"
                      placeholder="Enter artist or event name"
                      required
                    />
                  </div>
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
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleChange}
                    className="bg-gray-800 border-gray-700"
                    placeholder="Your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email *</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleChange}
                    className="bg-gray-800 border-gray-700"
                    placeholder="Your email address"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Phone Number *</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleChange}
                    className="bg-gray-800 border-gray-700"
                    placeholder="Your phone number"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Event Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Preferred Date *</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <NeoDateInput
                      id="eventDate"
                      name="eventDate"
                      value={formData.eventDate}
                      onChange={handleChange}
                      className="pl-10 bg-gray-800 border-gray-700"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alternativeDate">Alternative Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <NeoDateInput
                      id="alternativeDate"
                      name="alternativeDate"
                      value={formData.alternativeDate}
                      onChange={handleChange}
                      className="pl-10 bg-gray-800 border-gray-700"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="startTime"
                      name="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={handleChange}
                      className="pl-10 bg-gray-800 border-gray-700"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="endTime"
                      name="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={handleChange}
                      className="pl-10 bg-gray-800 border-gray-700"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedAttendance">Expected Attendance *</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="expectedAttendance"
                      name="expectedAttendance"
                      type="number"
                      value={formData.expectedAttendance}
                      onChange={handleChange}
                      className="pl-10 bg-gray-800 border-gray-700"
                      placeholder="Estimated number of attendees"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="eventType">Event Type *</Label>
                  <select
                    id="eventType"
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleChange}
                    className="w-full bg-gray-800 border-gray-700 rounded-md p-2"
                    required
                  >
                    <option value="" disabled>
                      Select event type
                    </option>
                    <option value="concert">Concert</option>
                    <option value="private">Private Event</option>
                    <option value="corporate">Corporate Event</option>
                    <option value="wedding">Wedding</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Additional Information</Label>
                <Textarea
                  id="additionalInfo"
                  name="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={handleChange}
                  className="bg-gray-800 border-gray-700 min-h-[100px]"
                  placeholder="Please provide any additional details about your event, technical requirements, etc."
                />
              </div>

              <div className="space-y-2">
                <Label>Technical Rider</Label>
                <div className="border border-dashed border-gray-700 rounded-lg p-6 text-center">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <FileText className="h-8 w-8 text-gray-500" />
                    <p className="text-sm font-medium">Upload Technical Rider</p>
                    <p className="text-xs text-gray-400">Drag and drop or click to upload</p>
                    <Button type="button" variant="outline" size="sm" className="mt-2 border-gray-700">
                      Choose File
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="agreeToTerms" checked={formData.agreeToTerms} onCheckedChange={handleCheckboxChange} />
                <Label htmlFor="agreeToTerms" className="text-sm">
                  I agree to the venue's booking terms and conditions
                </Label>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button type="button" variant="outline" onClick={() => router.push(`/venues/${params.id}`)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700">
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" /> Submitting...
                </>
              ) : (
                "Submit Booking Request"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
