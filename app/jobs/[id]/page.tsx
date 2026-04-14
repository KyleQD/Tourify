"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { 
  Briefcase, MapPin, Calendar, DollarSign, Users, Clock, Star,
  CheckCircle, AlertCircle, Loader2, ArrowRight, Building, Globe,
  Phone, Mail, FileText, Shield, Award, Zap, Share2, Send, Link2,
  Copy,
} from 'lucide-react'
import { ApplicationForm } from '@/components/forms/application-form'
import type { JobPostingTemplate } from '@/types/admin-onboarding'

export default function JobDetailPage() {
  const params = useParams()
  const jobId = params.id as string
  const [job, setJob] = useState<JobPostingTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadJobDetails()
  }, [jobId])

  async function loadJobDetails() {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/job-postings/${jobId}`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to load job details')
      setJob(data.data)
    } catch (err) {
      console.error('Error loading job details:', err)
      setError(err instanceof Error ? err.message : 'Failed to load job details')
      toast({ title: 'Error', description: 'Failed to load job details. Please try again.', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleApplicationSubmit(formData: any) {
    try {
      setIsSubmitting(true)
      const response = await fetch('/api/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_posting_id: jobId, form_responses: formData }),
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Failed to submit application')
      toast({ title: 'Application Submitted', description: 'Your application has been submitted successfully. We\'ll review it and get back to you soon.' })
      setShowApplicationForm(false)
    } catch (err) {
      console.error('Error submitting application:', err)
      toast({ title: 'Error', description: 'Failed to submit application. Please try again.', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleShareToFeed() {
    try {
      const res = await fetch('/api/posts/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shared_content_type: 'job_posting',
          shared_content_id: jobId,
          content: `Check out this opportunity: ${job?.title}`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: 'Shared to feed', description: 'This job has been posted to your feed.' })
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({ title: 'Share failed', description: error instanceof Error ? error.message : 'Could not share.', variant: 'destructive' })
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href)
    toast({ title: 'Link copied', description: 'Job link copied to clipboard.' })
  }

  function handleNativeShare() {
    if (navigator.share) {
      navigator.share({
        title: job?.title || 'Job Posting',
        text: `${job?.title} - ${job?.location}`,
        url: window.location.href,
      }).catch(() => {})
    } else {
      handleCopyLink()
    }
  }

  function getEmploymentTypeLabel(type: string) {
    const types: Record<string, string> = { full_time: 'Full Time', part_time: 'Part Time', contractor: 'Contractor', volunteer: 'Volunteer' }
    return types[type] || type
  }

  function getExperienceLevelLabel(level: string) {
    const levels: Record<string, string> = { entry: 'Entry Level', mid: 'Mid Level', senior: 'Senior Level', executive: 'Executive Level' }
    return levels[level] || level
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="p-8 bg-slate-800 border-slate-700 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-500" />
          <h2 className="text-xl font-semibold text-white mb-2">Loading Job Details</h2>
          <p className="text-slate-400">Please wait...</p>
        </Card>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="p-8 bg-slate-800 border-red-700 text-center max-w-md">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-white mb-2">Job Not Found</h2>
          <p className="text-slate-400 mb-4">{error || 'This job posting could not be found.'}</p>
          <Button onClick={() => window.history.back()} variant="outline">Go Back</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="bg-slate-700 text-white">{job.department}</Badge>
                {job.urgent && <Badge variant="destructive">Urgent</Badge>}
                {job.remote && <Badge variant="secondary" className="bg-green-600 text-white">Remote Available</Badge>}
              </div>
              <h1 className="text-3xl font-bold text-white">{job.title}</h1>
              <div className="flex items-center gap-6 text-slate-400 flex-wrap">
                <div className="flex items-center gap-2"><Building className="h-4 w-4" /><span>{job.location}</span></div>
                <div className="flex items-center gap-2"><Briefcase className="h-4 w-4" /><span>{getEmploymentTypeLabel(job.employment_type)}</span></div>
                <div className="flex items-center gap-2"><Star className="h-4 w-4" /><span>{getExperienceLevelLabel(job.experience_level)}</span></div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <p className="text-slate-400 text-sm">{job.applications_count} applications</p>
              <p className="text-slate-400 text-sm">{job.views_count} views</p>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="border-slate-600">
                      <Share2 className="h-4 w-4 mr-1" />Share
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                    <DropdownMenuItem onClick={handleShareToFeed} className="text-white hover:bg-slate-700">
                      <Send className="w-4 h-4 mr-2" />Share to Feed
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink} className="text-white hover:bg-slate-700">
                      <Link2 className="w-4 h-4 mr-2" />Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleNativeShare} className="text-white hover:bg-slate-700">
                      <Share2 className="w-4 h-4 mr-2" />Share via...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  onClick={() => setShowApplicationForm(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                  disabled={job.status !== 'published'}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />Apply Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><FileText className="h-5 w-5" />Job Description</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert max-w-none">
                  <p className="text-slate-300 leading-relaxed">{job.description}</p>
                </div>
              </CardContent>
            </Card>

            {job.requirements && job.requirements.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><CheckCircle className="h-5 w-5" />Requirements</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {job.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2 text-slate-300">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {job.responsibilities && job.responsibilities.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><Briefcase className="h-5 w-5" />Responsibilities</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {job.responsibilities.map((resp, index) => (
                      <li key={index} className="flex items-start gap-2 text-slate-300">
                        <ArrowRight className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" /><span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {job.skills && job.skills.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><Award className="h-5 w-5" />Required Skills</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="bg-slate-700 text-white">{skill}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader><CardTitle className="text-white">Job Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <div><p className="text-white font-medium">Location</p><p className="text-slate-400 text-sm">{job.location}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-slate-400" />
                  <div><p className="text-white font-medium">Employment Type</p><p className="text-slate-400 text-sm">{getEmploymentTypeLabel(job.employment_type)}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <Star className="h-4 w-4 text-slate-400" />
                  <div><p className="text-white font-medium">Experience Level</p><p className="text-slate-400 text-sm">{getExperienceLevelLabel(job.experience_level)}</p></div>
                </div>
                {job.salary_range && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <div><p className="text-white font-medium">Salary Range</p><p className="text-slate-400 text-sm">${job.salary_range.min.toLocaleString()} - ${job.salary_range.max.toLocaleString()} {job.salary_range.type}</p></div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-slate-400" />
                  <div><p className="text-white font-medium">Positions Available</p><p className="text-slate-400 text-sm">{job.number_of_positions}</p></div>
                </div>
              </CardContent>
            </Card>

            {job.benefits && job.benefits.length > 0 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader><CardTitle className="text-white flex items-center gap-2"><Zap className="h-5 w-5" />Benefits</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {job.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-slate-300">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" /><span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-6 space-y-3">
                <Button 
                  onClick={() => setShowApplicationForm(true)}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={job.status !== 'published'}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />Apply for this Position
                </Button>
                <Button variant="outline" className="w-full border-slate-600" onClick={handleShareToFeed}>
                  <Send className="h-4 w-4 mr-2" />Share to Feed
                </Button>
                <Button variant="outline" className="w-full border-slate-600" onClick={handleCopyLink}>
                  <Link2 className="h-4 w-4 mr-2" />Copy Link
                </Button>
                {job.status !== 'published' && (
                  <p className="text-slate-400 text-sm text-center">This position is not currently accepting applications</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showApplicationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">Apply for {job.title}</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowApplicationForm(false)} className="text-slate-400 hover:text-white">&times;</Button>
              </div>
              <ApplicationForm jobPosting={job} onSubmit={handleApplicationSubmit} onCancel={() => setShowApplicationForm(false)} isLoading={isSubmitting} />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
