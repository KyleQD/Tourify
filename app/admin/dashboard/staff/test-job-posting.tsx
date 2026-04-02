"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import JobPostingForm from '@/components/admin/job-posting-form'
import { useToast } from '@/components/ui/use-toast'
import type { CreateJobPostingData } from '@/types/admin-onboarding'

export default function TestJobPosting() {
  const [showForm, setShowForm] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(_data: CreateJobPostingData) {
    // Simulate API call
    try {
      // Mock successful creation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: 'Success',
        description: 'Job posting created successfully (test mode)',
      })
      
      setShowForm(false)
    } catch (error) {
      console.error('❌ [Test] Error creating job posting:', error)
      toast({
        title: 'Error',
        description: 'Failed to create job posting',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="p-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Job Posting Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowForm(true)}>
            Test Job Posting Form
          </Button>
          
          {showForm && (
            <div className="mt-4">
              <JobPostingForm
                onSubmit={handleSubmit}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 