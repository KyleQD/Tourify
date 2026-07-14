"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/components/ui/use-toast'
import { 
  Search,
  Filter,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Send,
  MessageSquare,
  FileText,
  Shield,
  Award,
  AlertTriangle,
  CheckSquare,
  Square,
  Users,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Info,
  Loader2,
  Download as DownloadIcon,
  Upload,
  Send as SendIcon,
  MessageSquare as MessageSquareIcon,
  FileText as FileTextIcon,
  Shield as ShieldIcon,
  Award as AwardIcon,
  AlertTriangle as AlertTriangleIcon,
  CheckSquare as CheckSquareIcon,
  Square as SquareIcon,
  Users as UsersIcon,
  Calendar as CalendarIcon,
  MapPin as MapPinIcon,
  Phone as PhoneIcon,
  Mail as MailIcon,
  ExternalLink as ExternalLinkIcon
} from 'lucide-react'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'
import type { JobApplication, JobPostingTemplate } from '@/types/admin-onboarding'
import { ApplicationStatusBadge } from '@/components/hiring/application-status-badge'
import { ApplicationReviewActions } from '@/components/hiring/application-review-actions'
import { ApplicationApplicantSummary } from '@/components/hiring/application-applicant-summary'
import { ApplicationJobSummary } from '@/components/hiring/application-job-summary'
import { ApplicationRating } from '@/components/hiring/application-rating'
import { ApplicationInsightsBadges } from '@/components/hiring/application-insights-badges'
import { ApplicationResponsesList } from '@/components/hiring/application-responses-list'

interface EnhancedApplicationReviewProps {
  applications: JobApplication[]
  jobPostings: JobPostingTemplate[]
  onUpdateStatus: (applicationId: string, status: string, feedback?: string) => Promise<void>
  onBulkUpdate: (applicationIds: string[], status: string, feedback?: string) => Promise<void>
  onSendMessage: (applicationId: string, message: string) => Promise<void>
  onExportApplications: (applications: JobApplication[]) => Promise<void>
  venueId: string
}

interface ApplicationFilters {
  status: string
  department: string
  jobPosting: string
  dateRange: string
  hasResume: boolean
  hasCoverLetter: boolean
  rating: string
  vettingState: string
  searchQuery: string
}

interface AutoScreeningResult {
  applicationId: string
  passed: boolean
  issues: string[]
  recommendations: string[]
}

interface VettingChecklistItem {
  key: string
  label: string
  required: boolean
  is_passed: boolean
  reason_code?: string
  evidence: Record<string, unknown>
}

interface VettingGate {
  mode: 'off' | 'shadow' | 'enforce'
  is_eligible: boolean
  blocking_reasons: string[]
  checklist: VettingChecklistItem[]
}

interface VettingSnapshot {
  gate: VettingGate
  verified_evidence: {
    documents: Array<{ id: string; document_type: string; verified_status: string }>
    agreements: Array<{ id: string }>
    endorsements: Array<{ id: string; skill: string; level: number }>
    followers_count: number
    wallet?: { tier: string; total_points: number }
  }
}

interface ReReviewRequestState {
  requested_at: string
}

export default function EnhancedApplicationReview({
  applications,
  jobPostings,
  onUpdateStatus,
  onBulkUpdate,
  onSendMessage,
  onExportApplications,
  venueId
}: EnhancedApplicationReviewProps) {
  const [filteredApplications, setFilteredApplications] = useState<JobApplication[]>(applications)
  const [selectedApplications, setSelectedApplications] = useState<string[]>([])
  const [filters, setFilters] = useState<ApplicationFilters>({
    status: 'all',
    department: 'all',
    jobPosting: 'all',
    dateRange: 'all',
    hasResume: false,
    hasCoverLetter: false,
    rating: 'all',
    vettingState: 'all',
    searchQuery: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null)
  const [showApplicationDetail, setShowApplicationDetail] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkStatus, setBulkStatus] = useState<string>('approved')
  const [bulkFeedback, setBulkFeedback] = useState<string>('')
  const [autoScreeningResults, setAutoScreeningResults] = useState<AutoScreeningResult[]>([])
  const [isAutoScreening, setIsAutoScreening] = useState(false)
  const [vettingByApplication, setVettingByApplication] = useState<Record<string, VettingSnapshot>>({})
  const [vettingLoadingId, setVettingLoadingId] = useState<string | null>(null)
  const [requestEvidenceLoadingId, setRequestEvidenceLoadingId] = useState<string | null>(null)
  const [isPrefetchingVetting, setIsPrefetchingVetting] = useState(false)
  const [reReviewRequestedByApplication, setReReviewRequestedByApplication] = useState<
    Record<string, ReReviewRequestState>
  >({})
  const lastPrefetchKeyRef = useRef<string>('')
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { toast } = useToast()

  async function loadVettingSnapshot(applicationId: string) {
    if (vettingByApplication[applicationId]) return
    setVettingLoadingId(applicationId)
    try {
      const response = await fetch(`/api/employer/vetting/${applicationId}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed vetting lookup')
      const payload = await response.json()
      if (payload?.success && payload?.data) {
        setVettingByApplication((prev) => ({
          ...prev,
          [applicationId]: {
            gate: payload.data.gate,
            verified_evidence: payload.data.verified_evidence,
          } as VettingSnapshot,
        }))
      }
    } catch (error) {
      console.warn('[application review] vetting lookup failed', error)
    } finally {
      setVettingLoadingId(null)
    }
  }

  async function ensureVettingSnapshots(applicationIds: string[]) {
    const missingIds = applicationIds.filter((applicationId) => !vettingByApplication[applicationId])
    if (missingIds.length === 0) return

    const results = await Promise.allSettled(
      missingIds.map(async (applicationId) => {
        const response = await fetch(`/api/employer/vetting/${applicationId}`, {
          credentials: 'include',
        })
        if (!response.ok) return null
        const payload = await response.json()
        if (!payload?.success || !payload?.data) return null
        return {
          applicationId,
          snapshot: {
            gate: payload.data.gate,
            verified_evidence: payload.data.verified_evidence,
          } as VettingSnapshot,
        }
      })
    )

    const updates: Record<string, VettingSnapshot> = {}
    results.forEach((result) => {
      if (result.status !== 'fulfilled' || !result.value) return
      updates[result.value.applicationId] = result.value.snapshot
    })

    if (Object.keys(updates).length > 0) {
      setVettingByApplication((prev) => ({
        ...prev,
        ...updates,
      }))
    }
  }

  function buildRemediationMessage(input: {
    applicantName: string
    blockingReasons: string[]
  }) {
    const reasonLabels: Record<string, string> = {
      missing_verified_document: 'Upload at least one verified credential document.',
      required_certifications_missing: 'Upload all required certifications for this role.',
      agreement_not_signed: 'Sign the required hiring agreement packet.',
      missing_verified_endorsements: 'Request a verified endorsement tied to your work history.',
    }

    const bulletLines = input.blockingReasons.map((reason) => {
      const description = reasonLabels[reason] || `Resolve: ${reason}`
      return `- ${description}`
    })

    return [
      `Hi ${input.applicantName},`,
      '',
      'Thanks for your application. Before we can move your status to approved, please complete the following verified requirements:',
      ...bulletLines,
      '',
      'Once completed, reply here and our team will re-review your application.',
    ].join('\n')
  }

  async function requestMissingEvidence(application: JobApplication, blockingReasons: string[]) {
    try {
      setRequestEvidenceLoadingId(application.id)
      const message = buildRemediationMessage({
        applicantName: application.applicant_name,
        blockingReasons,
      })
      await onSendMessage(application.id, message)
      setReReviewRequestedByApplication((prev) => ({
        ...prev,
        [application.id]: {
          requested_at: new Date().toISOString(),
        },
      }))
      toast({
        title: 'Evidence Request Sent',
        description: 'A remediation request was sent to the applicant.',
      })
    } catch (error) {
      console.error('Failed to request missing evidence:', error)
      toast({
        title: 'Error',
        description: 'Unable to send evidence request right now.',
        variant: 'destructive',
      })
    } finally {
      setRequestEvidenceLoadingId(null)
    }
  }

  // Auto-screening logic
  const runAutoScreening = async () => {
    setIsAutoScreening(true)
    const results: AutoScreeningResult[] = []

    for (const application of filteredApplications) {
      const issues: string[] = []
      const recommendations: string[] = []

      // Check for required documents
      if (!application.resume_url) {
        issues.push('Missing resume')
        recommendations.push('Request resume from applicant')
      }

      if (!application.cover_letter) {
        issues.push('Missing cover letter')
        recommendations.push('Request cover letter from applicant')
      }

      // Check form responses for required fields
      const responses = application.form_responses || {}
      const jobPosting = jobPostings.find(jp => jp.id === application.job_posting_id)
      
      if (jobPosting) {
        // Check for required certifications
        if (jobPosting.required_certifications && jobPosting.required_certifications.length > 0) {
          const missingCerts = jobPosting.required_certifications.filter(cert => 
            !responses[cert.toLowerCase().replace(/\s+/g, '_')]
          )
          if (missingCerts.length > 0) {
            issues.push(`Missing certifications: ${missingCerts.join(', ')}`)
            recommendations.push('Request missing certifications')
          }
        }

        // Check age requirements
        if (jobPosting.age_requirement) {
          const birthDate = responses.date_of_birth
          if (birthDate) {
            const age = calculateAge(birthDate)
            if (age < jobPosting.age_requirement) {
              issues.push(`Age requirement not met (${age} < ${jobPosting.age_requirement})`)
              recommendations.push('Reject due to age requirement')
            }
          }
        }

        // Check for experience requirements
        const experienceYears = responses.experience_years
        if (experienceYears && jobPosting.experience_level === 'senior' && experienceYears < 5) {
          issues.push('Insufficient experience for senior position')
          recommendations.push('Consider for mid-level position instead')
        }
      }

      // Check for red flags in responses
      const redFlags = checkForRedFlags(responses)
      issues.push(...redFlags)

      results.push({
        applicationId: application.id,
        passed: issues.length === 0,
        issues,
        recommendations
      })
    }

    setAutoScreeningResults(results)
    setIsAutoScreening(false)
    
    toast({
      title: "Auto-screening Complete",
      description: `Screened ${results.length} applications. ${results.filter(r => r.passed).length} passed initial screening.`,
    })
  }

  const calculateAge = (birthDate: string): number => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const checkForRedFlags = (responses: Record<string, any>): string[] => {
    const redFlags: string[] = []
    
    // Check for gaps in employment
    if (responses.previous_employers) {
      const employers = responses.previous_employers.split('\n')
      if (employers.length < 2) {
        redFlags.push('Limited work history')
      }
    }

    // Check for criminal background
    if (responses.criminal_background === 'yes') {
      redFlags.push('Criminal background disclosed')
    }

    // Check for drug test results
    if (responses.drug_test_result === 'positive') {
      redFlags.push('Failed drug test')
    }

    return redFlags
  }

  // Filter applications based on current filters
  useEffect(() => {
    let filtered = applications

    if (filters.status !== 'all') {
      filtered = filtered.filter(app => app.status === filters.status)
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(app => {
        const jobPosting = jobPostings.find(jp => jp.id === app.job_posting_id)
        return jobPosting?.department === filters.department
      })
    }

    if (filters.jobPosting !== 'all') {
      filtered = filtered.filter(app => app.job_posting_id === filters.jobPosting)
    }

    if (filters.dateRange !== 'all') {
      const now = new Date()
      const cutoffDate = new Date()
      
      switch (filters.dateRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          cutoffDate.setDate(now.getDate() - 7)
          break
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1)
          break
      }
      
      filtered = filtered.filter(app => new Date(app.applied_at) >= cutoffDate)
    }

    if (filters.hasResume) {
      filtered = filtered.filter(app => app.resume_url)
    }

    if (filters.hasCoverLetter) {
      filtered = filtered.filter(app => app.cover_letter)
    }

    if (filters.rating !== 'all') {
      const rating = parseInt(filters.rating)
      filtered = filtered.filter(app => app.rating && app.rating >= rating)
    }

    if (filters.vettingState !== 'all') {
      filtered = filtered.filter((application) => {
        const requestStatus = (application as any).evidence_request_status
        const hasReReviewRequest = Boolean(requestStatus?.requested_at)
        const vettingSnapshot = vettingByApplication[application.id]
        const isEligible = Boolean(vettingSnapshot?.gate?.is_eligible)
        const isBlocked = Boolean(vettingSnapshot && !vettingSnapshot.gate.is_eligible)

        if (filters.vettingState === 're_review_requested') return hasReReviewRequest
        if (filters.vettingState === 'ready_to_approve') return isEligible
        if (filters.vettingState === 'needs_evidence') return isBlocked
        return true
      })
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(app => 
        app.applicant_name.toLowerCase().includes(query) ||
        app.applicant_email.toLowerCase().includes(query) ||
        (app.applicant_phone && app.applicant_phone.includes(query))
      )
    }

    setFilteredApplications(filtered)
  }, [applications, filters, jobPostings, vettingByApplication])

  useEffect(() => {
    if (filters.vettingState === 'all') return
    const applicationIds = applications.map((application) => application.id)
    void ensureVettingSnapshots(applicationIds)
  }, [filters.vettingState, applications])

  useEffect(() => {
    const initialApplicationIds = applications.slice(0, 20).map((application) => application.id)
    if (initialApplicationIds.length === 0) return
    const unresolvedIds = initialApplicationIds.filter((applicationId) => !vettingByApplication[applicationId])
    if (unresolvedIds.length === 0) return

    const prefetchKey = unresolvedIds.slice().sort().join(',')
    if (lastPrefetchKeyRef.current === prefetchKey) return
    lastPrefetchKeyRef.current = prefetchKey

    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current)
    prefetchTimerRef.current = setTimeout(() => {
      setIsPrefetchingVetting(true)
      ensureVettingSnapshots(unresolvedIds).finally(() => {
        setIsPrefetchingVetting(false)
      })
    }, 150)
  }, [applications, vettingByApplication])

  useEffect(() => {
    return () => {
      if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const persistedRequests: Record<string, ReReviewRequestState> = {}
    applications.forEach((application) => {
      const requestStatus = (application as any).evidence_request_status
      if (!requestStatus?.requested_at) return
      persistedRequests[application.id] = {
        requested_at: requestStatus.requested_at,
      }
    })
    if (Object.keys(persistedRequests).length > 0) {
      setReReviewRequestedByApplication((prev) => ({
        ...persistedRequests,
        ...prev,
      }))
    }
  }, [applications])

  const handleBulkUpdate = async () => {
    try {
      await onBulkUpdate(selectedApplications, bulkStatus, bulkFeedback)
      setSelectedApplications([])
      setShowBulkActions(false)
      toast({
        title: "Bulk Update Complete",
        description: `Updated ${selectedApplications.length} applications to ${bulkStatus}.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update applications. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleExport = async () => {
    try {
      await onExportApplications(filteredApplications)
      toast({
        title: "Export Complete",
        description: "Applications have been exported successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export applications. Please try again.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status: string) => {
    return <ApplicationStatusBadge status={status} />
  }

  const departments = [...new Set(jobPostings.map(jp => jp.department))]
  const vettingCounts = {
    needsEvidence: applications.filter((application) => {
      const snapshot = vettingByApplication[application.id]
      return Boolean(snapshot && !snapshot.gate.is_eligible)
    }).length,
    reReviewRequested: applications.filter((application) =>
      Boolean((application as any).evidence_request_status?.requested_at)
    ).length,
    readyToApprove: applications.filter((application) =>
      Boolean(vettingByApplication[application.id]?.gate?.is_eligible)
    ).length,
  }
  const selectedJobPosting = selectedApplication
    ? jobPostings.find((posting) => posting.id === selectedApplication.job_posting_id)
    : null

  function applyVettingStateFilter(value: ApplicationFilters['vettingState']) {
    setFilters((prev) => ({
      ...prev,
      vettingState: value,
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Application Review</h2>
          <p className="text-slate-400">
            {filteredApplications.length} applications to review
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runAutoScreening}
            disabled={isAutoScreening}
            variant="outline"
            className="bg-slate-700 border-slate-600"
          >
            {isAutoScreening ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Screening...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Auto-Screen
              </>
            )}
          </Button>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="bg-slate-700 border-slate-600"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button
            onClick={handleExport}
            variant="outline"
            className="bg-slate-700 border-slate-600"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filters.vettingState === 'all' ? 'default' : 'outline'}
          onClick={() => applyVettingStateFilter('all')}
          className={
            filters.vettingState === 'all'
              ? 'bg-slate-600 text-white'
              : 'border-slate-600 text-slate-200 hover:bg-slate-700'
          }
        >
          All ({applications.length})
        </Button>
        <Button
          size="sm"
          variant={filters.vettingState === 'needs_evidence' ? 'default' : 'outline'}
          onClick={() => applyVettingStateFilter('needs_evidence')}
          className={
            filters.vettingState === 'needs_evidence'
              ? 'bg-rose-600 text-white'
              : 'border-rose-500/40 text-rose-300 hover:bg-rose-950/40'
          }
        >
          {isPrefetchingVetting && (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          )}
          Blocked ({vettingCounts.needsEvidence})
        </Button>
        <Button
          size="sm"
          variant={filters.vettingState === 're_review_requested' ? 'default' : 'outline'}
          onClick={() => applyVettingStateFilter('re_review_requested')}
          className={
            filters.vettingState === 're_review_requested'
              ? 'bg-amber-600 text-white'
              : 'border-amber-500/40 text-amber-300 hover:bg-amber-950/40'
          }
        >
          Re-review ({vettingCounts.reReviewRequested})
        </Button>
        <Button
          size="sm"
          variant={filters.vettingState === 'ready_to_approve' ? 'default' : 'outline'}
          onClick={() => applyVettingStateFilter('ready_to_approve')}
          className={
            filters.vettingState === 'ready_to_approve'
              ? 'bg-emerald-600 text-white'
              : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40'
          }
        >
          {isPrefetchingVetting && (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          )}
          Ready ({vettingCounts.readyToApprove})
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-white text-sm">Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="shortlisted">Shortlisted</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white text-sm">Department</Label>
                <Select value={filters.department} onValueChange={(value) => setFilters({...filters, department: value})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white text-sm">Job Posting</Label>
                <Select value={filters.jobPosting} onValueChange={(value) => setFilters({...filters, jobPosting: value})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Postings</SelectItem>
                    {jobPostings.map(jp => (
                      <SelectItem key={jp.id} value={jp.id}>{jp.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white text-sm">Date Range</Label>
                <Select value={filters.dateRange} onValueChange={(value) => setFilters({...filters, dateRange: value})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="space-y-2">
                <Label className="text-white text-sm">Rating</Label>
                <Select value={filters.rating} onValueChange={(value) => setFilters({...filters, rating: value})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="3">3+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white text-sm">Vetting State</Label>
                <Select
                  value={filters.vettingState}
                  onValueChange={(value) => setFilters({...filters, vettingState: value})}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vetting States</SelectItem>
                    <SelectItem value="needs_evidence">Needs Evidence</SelectItem>
                    <SelectItem value="re_review_requested">Re-review Requested</SelectItem>
                    <SelectItem value="ready_to_approve">Ready to Approve</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasResume"
                  checked={filters.hasResume}
                  onCheckedChange={(checked) => setFilters({...filters, hasResume: checked as boolean})}
                />
                <Label htmlFor="hasResume" className="text-white text-sm">Has Resume</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasCoverLetter"
                  checked={filters.hasCoverLetter}
                  onCheckedChange={(checked) => setFilters({...filters, hasCoverLetter: checked as boolean})}
                />
                <Label htmlFor="hasCoverLetter" className="text-white text-sm">Has Cover Letter</Label>
              </div>

              <div className="space-y-2">
                <Label className="text-white text-sm">Search</Label>
                <Input
                  placeholder="Search applicants..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-screening Results */}
      {autoScreeningResults.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Auto-screening Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {autoScreeningResults.map((result) => {
                const application = applications.find(app => app.id === result.applicationId)
                if (!application) return null

                return (
                  <div key={result.applicationId} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                    <ApplicationApplicantSummary
                      applicantName={application.applicant_name}
                      applicantEmail={application.applicant_email}
                      avatarClassName="h-10 w-10"
                      infoClassName="space-y-1"
                    />
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {result.passed ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                          )}
                          <span className={`font-semibold ${result.passed ? 'text-green-500' : 'text-red-500'}`}>
                            {result.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                        {result.issues.length > 0 && (
                          <p className="text-slate-400 text-sm">{result.issues.length} issues found</p>
                        )}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedApplication(application)
                          setShowApplicationDetail(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications List */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-white">Applications</CardTitle>
            {selectedApplications.length > 0 && (
              <Button
                onClick={() => setShowBulkActions(true)}
                variant="outline"
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Bulk Actions ({selectedApplications.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredApplications.map((application) => {
              const jobPosting = jobPostings.find(jp => jp.id === application.job_posting_id)
              const isSelected = selectedApplications.includes(application.id)
              const screeningResult = autoScreeningResults.find(r => r.applicationId === application.id)
              const vettingSnapshot = vettingByApplication[application.id]
              const reReviewRequested = reReviewRequestedByApplication[application.id]

              return (
                <div
                  key={application.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-purple-500 bg-purple-900/20' 
                      : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                  }`}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedApplications(selectedApplications.filter(id => id !== application.id))
                    } else {
                      setSelectedApplications([...selectedApplications, application.id])
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setSelectedApplications(selectedApplications.filter(id => id !== application.id))
                          } else {
                            setSelectedApplications([...selectedApplications, application.id])
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          {screeningResult ? (
                            screeningResult.passed ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )
                          ) : null}
                        </div>

                        <ApplicationApplicantSummary
                          applicantName={application.applicant_name}
                          applicantEmail={application.applicant_email}
                          applicantPhone={application.applicant_phone}
                          appliedAt={application.applied_at}
                          avatarClassName="h-12 w-12"
                          infoClassName="space-y-1"
                        />
                        
                        {jobPosting && (
                          <ApplicationJobSummary
                            displayMode="inline"
                            title={jobPosting.title}
                            department={jobPosting.department}
                            className="mt-2"
                          />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {getStatusBadge(application.status)}
                        <ApplicationInsightsBadges
                          isEligible={vettingSnapshot ? vettingSnapshot.gate.is_eligible : null}
                          reReviewRequestedAt={reReviewRequested?.requested_at}
                          stackRight={true}
                          className="mt-1"
                        />
                        <ApplicationRating rating={application.rating} size="sm" showValue={true} />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            loadVettingSnapshot(application.id)
                          }}
                          className="text-cyan-300 hover:text-cyan-200"
                          title="Fetch vetting reasons"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>

                        {vettingSnapshot && !vettingSnapshot.gate.is_eligible && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                className="text-rose-300 hover:text-rose-200"
                                title="Why blocked"
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-80 bg-slate-900 border-slate-700 text-slate-100"
                              align="end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="space-y-2">
                                <p className="text-sm font-semibold">Why blocked</p>
                                <div className="space-y-1">
                                  {vettingSnapshot.gate.blocking_reasons.map((reason) => (
                                    <p key={reason} className="text-xs text-rose-200">
                                      - {reason}
                                    </p>
                                  ))}
                                </div>
                                <div className="pt-1 text-xs text-slate-400">
                                  Gate mode: {vettingSnapshot.gate.mode}
                                </div>
                                <Button
                                  size="sm"
                                  className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                                  disabled={requestEvidenceLoadingId === application.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    requestMissingEvidence(application, vettingSnapshot.gate.blocking_reasons)
                                  }}
                                >
                                  <Send className="h-3 w-3 mr-2" />
                                  {requestEvidenceLoadingId === application.id
                                    ? 'Sending request...'
                                    : 'Request Missing Evidence'}
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedApplication(application)
                            setShowApplicationDetail(true)
                            loadVettingSnapshot(application.id)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <ApplicationReviewActions
                          iconOnly={true}
                          size="sm"
                          approveVariant="outline"
                          rejectVariant="outline"
                          approveClassName="text-green-500 hover:text-green-400"
                          rejectClassName="text-red-500 hover:text-red-400"
                          onApprove={(e) => {
                            e.stopPropagation()
                            onUpdateStatus(application.id, 'approved')
                          }}
                          onReject={(e) => {
                            e.stopPropagation()
                            onUpdateStatus(application.id, 'rejected')
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {screeningResult && screeningResult.issues.length > 0 && (
                    <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded">
                      <h5 className="font-semibold text-red-400 text-sm mb-2">Screening Issues:</h5>
                      <ul className="text-red-300 text-sm space-y-1">
                        {screeningResult.issues.map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Application Detail Dialog */}
      <Dialog open={showApplicationDetail} onOpenChange={setShowApplicationDetail}>
        <DialogContent className="max-w-4xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Application Details</DialogTitle>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-6">
              {/* Applicant Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Applicant Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Name:</span>
                      <span className="text-white">{selectedApplication.applicant_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="text-white">{selectedApplication.applicant_email}</span>
                    </div>
                    {selectedApplication.applicant_phone && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Phone:</span>
                        <span className="text-white">{selectedApplication.applicant_phone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Applied:</span>
                      <span className="text-white">
                        {formatSafeDate(selectedApplication.applied_at)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      {getStatusBadge(selectedApplication.status)}
                    </div>
                    {selectedApplication.rating && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Rating:</span>
                        <ApplicationRating rating={selectedApplication.rating} size="sm" showValue={true} />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Job Information</h3>
                  {selectedJobPosting ? (
                    <ApplicationJobSummary
                      displayMode="fields"
                      title={selectedJobPosting.title}
                      department={selectedJobPosting.department}
                      location={selectedJobPosting.location}
                    />
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-cyan-300" />
                  Employer Vetting (Verified Evidence Only)
                </h3>
                {vettingLoadingId === selectedApplication.id && (
                  <p className="text-sm text-slate-400">Loading vetting data...</p>
                )}
                {vettingByApplication[selectedApplication.id]?.gate && (
                  <div className="space-y-3 rounded border border-slate-600 bg-slate-900/40 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        className={
                          vettingByApplication[selectedApplication.id].gate.is_eligible
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/20 border-rose-500/30 text-rose-300'
                        }
                      >
                        {vettingByApplication[selectedApplication.id].gate.is_eligible ? 'Eligible' : 'Blocked'}
                      </Badge>
                      <Badge variant="outline" className="border-slate-500 text-slate-300">
                        Mode: {vettingByApplication[selectedApplication.id].gate.mode}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {vettingByApplication[selectedApplication.id].gate.checklist.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between rounded border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm"
                        >
                          <p className="text-slate-200">
                            {item.label}
                            {item.required ? ' (required)' : ''}
                          </p>
                          <Badge
                            variant="outline"
                            className={item.is_passed ? 'border-emerald-500/40 text-emerald-300' : 'border-rose-500/40 text-rose-300'}
                          >
                            {item.is_passed ? 'Pass' : item.reason_code || 'Fail'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                      <p>
                        Docs: {vettingByApplication[selectedApplication.id].verified_evidence.documents.length}
                      </p>
                      <p>
                        Agreements: {vettingByApplication[selectedApplication.id].verified_evidence.agreements.length}
                      </p>
                      <p>
                        Endorsements: {vettingByApplication[selectedApplication.id].verified_evidence.endorsements.length}
                      </p>
                      <p>
                        Followers: {vettingByApplication[selectedApplication.id].verified_evidence.followers_count}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Responses */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Application Responses</h3>
                <ApplicationResponsesList
                  responses={selectedApplication.form_responses}
                  compact={true}
                  applicationId={selectedApplication.id}
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-600">
                <ApplicationReviewActions
                  onApprove={() => onUpdateStatus(selectedApplication.id, 'approved')}
                  onReject={() => onUpdateStatus(selectedApplication.id, 'rejected')}
                  onShortlist={() => onUpdateStatus(selectedApplication.id, 'shortlisted')}
                  onMessage={() => onSendMessage(selectedApplication.id, 'Thank you for your application...')}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkActions} onOpenChange={setShowBulkActions}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Bulk Actions</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Status</Label>
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-white">Feedback (Optional)</Label>
              <Textarea
                value={bulkFeedback}
                onChange={(e) => setBulkFeedback(e.target.value)}
                placeholder="Add feedback for all selected applications..."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleBulkUpdate}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Update {selectedApplications.length} Applications
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBulkActions(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 
