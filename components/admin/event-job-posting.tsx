"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { ArtistJobPostingWizard } from "@/components/job-posting/artist-job-posting-wizard"
import { Button } from "@/components/ui/button"
import { buildEventJobPayload } from "@/lib/job-posting/job-posting-adapters"
import type { CreateJobFormData } from "@/types/artist-jobs"

interface EventJobPostingProps {
  eventId: string
  eventName: string
  eventDate: string
  eventLocation: string
  onJobPosted?: (job: { title?: string; [key: string]: unknown }) => void
}

const eventJobCategories = [
  { id: "1", name: "Opening Slots" },
  { id: "2", name: "Band Members" },
  { id: "3", name: "Technical Crew" },
  { id: "4", name: "Session Work" },
  { id: "5", name: "Sound Engineers" },
  { id: "6", name: "Lighting Techs" },
  { id: "7", name: "Photographers" },
  { id: "8", name: "Videographers" },
  { id: "9", name: "Security" },
  { id: "10", name: "Catering" },
  { id: "11", name: "Transportation" },
  { id: "12", name: "Other" },
]

export function EventJobPosting({ eventId, eventName, eventDate, eventLocation, onJobPosted }: EventJobPostingProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(values: CreateJobFormData) {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/events/${eventId}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildEventJobPayload({ values, context: { eventDate, eventLocation } })),
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to post job")
      }

      toast.success("Job posted successfully!")
      onJobPosted?.(result.data ?? result.job ?? {})
      setIsOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post job")
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="bg-purple-600 hover:bg-purple-700">
        <Plus className="mr-2 h-4 w-4" />
        Post Job for Event
      </Button>
      <ArtistJobPostingWizard
        open={isOpen}
        onOpenChange={setIsOpen}
        title={`Post Job for ${eventName}`}
        description="Create an event-scoped opportunity while preserving the existing event job workflow."
        categories={eventJobCategories}
        initialValues={{
          location: eventLocation,
          event_date: eventDate,
          job_type: "one_time",
          status: "open",
        }}
        submitLabel="Post event job"
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </>
  )
}
