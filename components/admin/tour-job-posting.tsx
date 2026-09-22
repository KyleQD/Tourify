"use client"

import { useCallback, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"

import { ArtistJobPostingWizard } from "@/components/job-posting/artist-job-posting-wizard"
import { Button } from "@/components/ui/button"
import { useActingContext } from "@/hooks/use-acting-context"
import { buildTourJobPayload } from "@/lib/job-posting/job-posting-adapters"
import {
  buildTourJobInitialValues,
  type TourJobPrefillStop,
} from "@/lib/job-posting/job-posting-prefill"
import type { CreateJobFormData } from "@/types/artist-jobs"

interface TourJobPostingProps {
  tourId: string
  tourName: string
  tourDescription?: string
  tourStartDate: string
  tourEndDate: string
  tourTransportation?: string
  tourAccommodation?: string
  tourEquipmentRequirements?: string
  tourSpecialRequirements?: string
  tourStops?: TourJobPrefillStop[]
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

export function TourJobPosting({
  tourId,
  tourName,
  tourDescription,
  tourStartDate,
  tourEndDate,
  tourTransportation,
  tourAccommodation,
  tourEquipmentRequirements,
  tourSpecialRequirements,
  tourStops,
  onJobPosted,
}: TourJobPostingProps) {
  const { actingHeaders, isActingReady } = useActingContext()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const adminRequest = useCallback(
    (input?: RequestInit): RequestInit => ({
      ...input,
      headers: { ...actingHeaders, ...(input?.headers || {}) },
    }),
    [actingHeaders],
  )

  async function handleSubmit(values: CreateJobFormData) {
    setIsSubmitting(true)
    try {
      if (!isActingReady) throw new Error("Select an organization account first")
      const response = await fetch(
        `/api/tours/${tourId}/jobs`,
        adminRequest({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildTourJobPayload({
              values,
              context: {
                tourId,
                tourName,
                tourStartDate,
                tourEndDate,
              },
            }),
          ),
        }),
      )

      const result = await response.json().catch(() => ({}))
      if (!response.ok || result.success === false) {
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
        Post Tour Job
      </Button>
      <ArtistJobPostingWizard
        open={isOpen}
        onOpenChange={setIsOpen}
        title={`Post Job for Tour: ${tourName}`}
        description="Create a tour-scoped opportunity prefilled from the current tour and its stops."
        categories={tourJobCategories}
        initialValues={buildTourJobInitialValues({
          description: tourDescription,
          startDate: tourStartDate,
          transportation: tourTransportation,
          accommodation: tourAccommodation,
          equipmentRequirements: tourEquipmentRequirements,
          specialRequirements: tourSpecialRequirements,
          stops: tourStops,
        })}
        submitLabel="Post tour job"
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </>
  )
}
