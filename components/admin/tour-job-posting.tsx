"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { ArtistJobPostingWizard } from "@/components/job-posting/artist-job-posting-wizard"
import { Button } from "@/components/ui/button"
import { buildTourJobPayload } from "@/lib/job-posting/job-posting-adapters"
import type { CreateJobFormData } from "@/types/artist-jobs"

interface TourJobPostingProps {
  tourId: string
  tourName: string
  tourStartDate: string
  tourEndDate: string
  onJobPosted?: (job: { title?: string; [key: string]: unknown }) => void
}

const tourJobCategories = [
  { id: "1", name: "Musicians" },
  { id: "2", name: "Vocalists" },
  { id: "3", name: "Sound Engineers" },
  { id: "4", name: "Lighting Technicians" },
  { id: "5", name: "Stage Crew" },
  { id: "6", name: "Photographers" },
  { id: "7", name: "Videographers" },
  { id: "8", name: "Transportation" },
  { id: "9", name: "Security" },
  { id: "10", name: "Catering" },
  { id: "11", name: "Tour Management" },
  { id: "12", name: "Accommodation" },
]

export function TourJobPosting({ tourId, tourName, tourStartDate, tourEndDate, onJobPosted }: TourJobPostingProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(values: CreateJobFormData) {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/tours/${tourId}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildTourJobPayload({
            values,
            context: { tourId, tourName, tourStartDate, tourEndDate },
          })
        ),
      })

      if (!response.ok) {
        throw new Error("Failed to post job")
      }

      const result = await response.json()
      toast.success("Job posted successfully!")
      onJobPosted?.(result.job ?? {})
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
        Post Tour Job
      </Button>
      <ArtistJobPostingWizard
        open={isOpen}
        onOpenChange={setIsOpen}
        title={`Post Job for Tour: ${tourName}`}
        description="Create a tour-scoped opportunity while preserving the existing tour job workflow."
        categories={tourJobCategories}
        initialValues={{
          job_type: "tour",
          payment_type: "paid",
          payment_amount: 0,
          payment_currency: "USD",
          location: "Multiple Locations",
          location_type: "in_person",
          event_date: tourStartDate,
          status: "open",
        }}
        submitLabel="Post tour job"
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </>
  )
}
