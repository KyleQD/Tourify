"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import JobPostingForm from '@/components/admin/job-posting-form'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import { useCurrentVenue } from '@/hooks/use-venue'
import type { CreateJobPostingData } from '@/types/admin-onboarding'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewJobPostingPage() {
  const { venue } = useCurrentVenue()
  const venueId = venue?.id
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(data: CreateJobPostingData) {
    if (isSubmitting || !venueId) return
    setIsSubmitting(true)

    try {
      await AdminOnboardingStaffService.createJobPosting(venueId, data)
      toast({ title: 'Success', description: 'Job posting created' })
    } catch (error) {
      console.error('Error creating job posting:', error)
      toast({ title: 'Error', description: 'Failed to create job posting', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard/staff" className="text-slate-400 hover:text-white flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <h1 className="text-2xl font-bold text-white">Create Job Posting</h1>
          </div>
        </div>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Job Details</CardTitle>
          </CardHeader>
          <CardContent>
            <JobPostingForm onSubmit={handleSubmit} onCancel={() => history.back()} isLoading={isSubmitting} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
