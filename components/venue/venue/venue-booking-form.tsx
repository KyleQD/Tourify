"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"

interface VenueBookingFormProps {
  venue: any
  selectedDate: Date | null
  onCancel: () => void
  onSubmit: () => void
}

export function VenueBookingForm({ venue, selectedDate, onCancel, onSubmit }: VenueBookingFormProps) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Booking Request</CardTitle>
            <CardDescription>
              {selectedDate
                ? `Request to book ${venue.name} on ${formatSafeDate(selectedDate.toISOString())}`
                : `Request to book ${venue.name}`}
            </CardDescription>
          </div>
          <img src="/images/tourify-logo-white.png" alt="Tourify" className="h-6" />
        </div>
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
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={onSubmit}>
          Submit Request
        </Button>
      </div>
    </Card>
  )
}
