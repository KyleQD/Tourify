"use client"

import { useState } from "react"

import { ArtistJobPostingWizard } from "@/components/job-posting/artist-job-posting-wizard"
import { useToast } from "@/components/ui/use-toast"
import { useActingContext } from "@/hooks/use-acting-context"
import { buildArtistJobPayload } from "@/lib/job-posting/job-posting-adapters"
import type { ArtistJobCategory, CreateJobFormData } from "@/types/artist-jobs"

interface JobPostingModalProps {
  isOpen: boolean
  onClose: () => void
  onJobCreated: (job: unknown) => void
  categories: ArtistJobCategory[]
}

export function JobPostingModal({ isOpen, onClose, onJobCreated, categories }: JobPostingModalProps) {
  const { toast } = useToast()
  const { actingHeaders } = useActingContext()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(values: CreateJobFormData) {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/artist-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...actingHeaders,
        },
        credentials: "include",
        body: JSON.stringify(buildArtistJobPayload({ values })),
      })

      const rawText = await response.text()
      let result: { success?: boolean; error?: string; data?: { title?: string } }
      try {
        result = rawText ? JSON.parse(rawText) : {}
      } catch {
        throw new Error(`HTTP ${response.status}: ${rawText || response.statusText}`)
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || rawText || `Request failed (${response.status})`)
      }

      onJobCreated(result.data)
      toast({
        title: "Job posted",
        description: result.data?.title ? `"${result.data.title}" is live on the job board.` : "Your job is live on the job board.",
      })
      onClose()
    } catch (error) {
      toast({
        title: "Could not post job",
        description: error instanceof Error ? error.message : "Network error occurred",
        variant: "destructive",
      })
      throw error
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ArtistJobPostingWizard
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Post a Job"
      description="Create a public opportunity for collaborators, musicians, crew, or other job-board applicants."
      categories={categories}
      submitLabel="Post job"
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
    />
  )
}
