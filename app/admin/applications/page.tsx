"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { ApplicationReviewActions } from '@/components/hiring/application-review-actions'
import { ApplicationApplicantSummary } from '@/components/hiring/application-applicant-summary'
import { ApplicationJobSummary } from '@/components/hiring/application-job-summary'
import { ApplicationRating } from '@/components/hiring/application-rating'
import { ApplicationInsightsBadges } from '@/components/hiring/application-insights-badges'
import { ApplicationResponsesList } from '@/components/hiring/application-responses-list'
import { HiringStateCard } from '@/components/hiring/hiring-state-card'
import { trackDashboardUxEvent } from '@/lib/analytics/ux-event-client'
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  CheckCircle, 
  X, 
  Clock,
  Star,
  FileText,
  Download,
  Send,
  MessageSquare,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  X as XIcon,
  UserPlus,
  UserCheck,
  UserX,
  FileDown,
  ExternalLink,
  Copy
} from 'lucide-react'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import { useCurrentVenue as useCurrentVenueRoot } from '@/hooks/use-venue'
import type { JobApplication, JobPostingTemplate } from '@/types/admin-onboarding'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface ApplicationWithJob extends JobApplication {
  job_posting: JobPostingTemplate
  onboarding_status?: {
    status: string
    stage: string
    progress: number
    updated_at: string
  } | null
  contract_status?: {
    id: string
    status: string
    updated_at: string
  } | null
}

interface ApplicationAuditEvent {
  id: string
  type: string
  title: string
  content: string | null
  metadata?: {
    action?: string
    from_status?: string
    to_status?: string
    [key: string]: unknown
  } | null
  created_at: string
}

type AuditPreset = 'all' | 'approvals' | 'rejections' | 'contracts' | 'onboarding'
const AUDIT_CURL_AUTH_MODE_STORAGE_KEY = 'admin-applications-audit-curl-auth-mode'

function createDefaultReviewData(status: JobApplication['status'] = 'approved') {
  return {
    status,
    feedback: '',
    rating: 0,
    sendContract: status === 'approved',
    contractProvider: 'internal',
    contractTerms: '',
  }
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationWithJob[]>([])
  const [filteredApplications, setFilteredApplications] = useState<ApplicationWithJob[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [jobFilter, setJobFilter] = useState("all")
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithJob | null>(null)
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewData, setReviewData] = useState(createDefaultReviewData())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [auditEvents, setAuditEvents] = useState<ApplicationAuditEvent[]>([])
  const [isAuditLoading, setIsAuditLoading] = useState(false)
  const [auditActionFilter, setAuditActionFilter] = useState('all')
  const [auditStatusFilter, setAuditStatusFilter] = useState('all')
  const [auditSortOrder, setAuditSortOrder] = useState<'desc' | 'asc'>('desc')
  const [showMeaningfulOnly, setShowMeaningfulOnly] = useState(true)
  const [auditSearchQuery, setAuditSearchQuery] = useState('')
  const [auditCurlAuthMode, setAuditCurlAuthMode] = useState<'bearer' | 'cookie'>('bearer')
  const [activeAuditPreset, setActiveAuditPreset] = useState<AuditPreset>('all')
  const { toast } = useToast()
  const { venue } = useCurrentVenueRoot()

  const venueId = venue?.id

  useEffect(() => {
    if (venueId) loadApplications()
  }, [venueId])

  useEffect(() => {
    filterApplications()
  }, [applications, searchQuery, statusFilter, jobFilter])

  useEffect(() => {
    if (!selectedApplication?.id || !showApplicationModal) return
    loadApplicationAuditEvents(selectedApplication.id)
  }, [selectedApplication?.id, showApplicationModal])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const savedMode = window.localStorage.getItem(AUDIT_CURL_AUTH_MODE_STORAGE_KEY)
      if (savedMode === 'bearer' || savedMode === 'cookie') setAuditCurlAuthMode(savedMode)
    } catch (error) {
      console.warn('Failed to read audit cURL auth mode from localStorage:', error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(AUDIT_CURL_AUTH_MODE_STORAGE_KEY, auditCurlAuthMode)
    } catch (error) {
      console.warn('Failed to save audit cURL auth mode to localStorage:', error)
    }
  }, [auditCurlAuthMode])

  async function loadApplications() {
    if (!venueId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/admin/applications?venue_id=${venueId}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!payload.success) throw new Error(payload.error || 'Failed to load applications')
      setApplications((payload.data || []) as ApplicationWithJob[])
    } catch (err) {
      console.error('Error loading applications:', err)
      setError('Failed to load applications')
      toast({
        title: 'Error',
        description: 'Failed to load applications. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function loadApplicationAuditEvents(applicationId: string) {
    try {
      setIsAuditLoading(true)
      const response = await fetch(`/api/admin/applications/${applicationId}/audit`, { cache: 'no-store' })
      const payload = await response.json()
      if (!payload.success) throw new Error(payload.error || 'Failed to load audit trail')
      setAuditEvents(payload.data || [])
    } catch (error) {
      console.error('Error loading audit trail:', error)
      setAuditEvents([])
    } finally {
      setIsAuditLoading(false)
    }
  }

  function applyAuditPreset(preset: AuditPreset) {
    setActiveAuditPreset(preset)

    if (preset === 'all') {
      setAuditActionFilter('all')
      setAuditStatusFilter('all')
      setShowMeaningfulOnly(true)
      return
    }

    if (preset === 'approvals') {
      setAuditActionFilter('approve')
      setAuditStatusFilter('all')
      setShowMeaningfulOnly(true)
      return
    }

    if (preset === 'rejections') {
      setAuditActionFilter('reject')
      setAuditStatusFilter('all')
      setShowMeaningfulOnly(true)
      return
    }

    if (preset === 'contracts') {
      const contractTransition = availableStatusTransitions.find((transition) =>
        transition.includes('contract_sent') || transition.includes('contract_signed')
      )
      setAuditActionFilter('all')
      setAuditStatusFilter(contractTransition || 'all')
      setShowMeaningfulOnly(true)
      return
    }

    if (preset === 'onboarding') {
      const onboardingTransition = availableStatusTransitions.find((transition) =>
        transition.includes('onboarding')
      )
      setAuditActionFilter('all')
      setAuditStatusFilter(onboardingTransition || 'all')
      setShowMeaningfulOnly(true)
    }
  }

  function getFilteredAuditEvents() {
    const normalizedSearch = auditSearchQuery.trim().toLowerCase()
    const filtered = auditEvents.filter((event) => {
      const action = String(event.metadata?.action || event.type)
      const fromStatus = String(event.metadata?.from_status || '')
      const toStatus = String(event.metadata?.to_status || '')
      const searchableContent = `${event.title} ${event.content || ''} ${action} ${fromStatus} ${toStatus}`.toLowerCase()

      if (showMeaningfulOnly) {
        const isMeaningfulTransition = fromStatus && toStatus && fromStatus !== toStatus && fromStatus !== 'created'
        if (!isMeaningfulTransition) return false
      }

      if (auditActionFilter !== 'all' && action !== auditActionFilter) return false

      if (auditStatusFilter !== 'all' && fromStatus && toStatus) {
        const transitionKey = `${fromStatus}->${toStatus}`
        if (transitionKey !== auditStatusFilter) return false
      }

      if (normalizedSearch && !searchableContent.includes(normalizedSearch)) return false

      return true
    })

    return filtered.sort((a, b) => {
      const left = new Date(a.created_at).getTime()
      const right = new Date(b.created_at).getTime()
      return auditSortOrder === 'desc' ? right - left : left - right
    })
  }

  const visibleAuditEvents = getFilteredAuditEvents()
  const availableAuditActions = Array.from(
    new Set(auditEvents.map((event) => String(event.metadata?.action || event.type)))
  ).sort()
  const availableStatusTransitions = Array.from(
    new Set(
      auditEvents
        .filter((event) => event.metadata?.from_status && event.metadata?.to_status)
        .map((event) => `${event.metadata?.from_status}->${event.metadata?.to_status}`)
    )
  ).sort()

  function isMeaningfulEvent(event: ApplicationAuditEvent) {
    const fromStatus = String(event.metadata?.from_status || '')
    const toStatus = String(event.metadata?.to_status || '')
    return Boolean(fromStatus && toStatus && fromStatus !== toStatus && fromStatus !== 'created')
  }

  const baseCountEvents = showMeaningfulOnly ? auditEvents.filter(isMeaningfulEvent) : auditEvents
  const auditPresetCounts = {
    all: baseCountEvents.length,
    approvals: baseCountEvents.filter((event) => String(event.metadata?.action || event.type) === 'approve').length,
    rejections: baseCountEvents.filter((event) => String(event.metadata?.action || event.type) === 'reject').length,
    contracts: baseCountEvents.filter((event) => {
      const transition = `${event.metadata?.from_status || ''}->${event.metadata?.to_status || ''}`
      return transition.includes('contract_sent') || transition.includes('contract_signed')
    }).length,
    onboarding: baseCountEvents.filter((event) => {
      const transition = `${event.metadata?.from_status || ''}->${event.metadata?.to_status || ''}`
      return transition.includes('onboarding')
    }).length,
  }

  function escapeCsvCell(value: unknown) {
    const text = String(value ?? '')
    if (text.includes('"') || text.includes(',') || text.includes('\n'))
      return `"${text.replace(/"/g, '""')}"`
    return text
  }

  function handleExportAuditCsv() {
    try {
      if (visibleAuditEvents.length === 0) {
        toast({
          title: 'Nothing to export',
          description: 'No audit events match your current filters.',
          variant: 'destructive',
        })
        return
      }

      const header = [
        'timestamp',
        'action',
        'from_status',
        'to_status',
        'title',
        'content',
        'application_id',
      ]

      const rows = visibleAuditEvents.map((event) => [
        event.created_at,
        event.metadata?.action || event.type || '',
        event.metadata?.from_status || '',
        event.metadata?.to_status || '',
        event.title || '',
        event.content || '',
        selectedApplication?.id || '',
      ])

      const csvContent = [header, ...rows]
        .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
        .join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      link.href = url
      link.download = `hiring-audit-${selectedApplication?.id || 'application'}-${timestamp}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Audit exported',
        description: `Downloaded ${visibleAuditEvents.length} filtered audit events.`,
      })
    } catch (error) {
      console.error('Failed to export audit CSV:', error)
      toast({
        title: 'Export failed',
        description: 'Could not export audit data. Please try again.',
        variant: 'destructive',
      })
    }
  }

  function handleExportAuditJson() {
    try {
      if (visibleAuditEvents.length === 0) {
        toast({
          title: 'Nothing to export',
          description: 'No audit events match your current filters.',
          variant: 'destructive',
        })
        return
      }

      const payload = buildAuditExportPayload()
      const jsonContent = JSON.stringify(payload, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      link.href = url
      link.download = `hiring-audit-${selectedApplication?.id || 'application'}-${timestamp}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Audit exported',
        description: `Downloaded ${visibleAuditEvents.length} filtered audit events as JSON.`,
      })
    } catch (error) {
      console.error('Failed to export audit JSON:', error)
      toast({
        title: 'Export failed',
        description: 'Could not export audit data. Please try again.',
        variant: 'destructive',
      })
    }
  }

  function buildAuditExportPayload() {
    return visibleAuditEvents.map((event) => ({
      id: event.id,
      timestamp: event.created_at,
      action: event.metadata?.action || event.type || '',
      from_status: event.metadata?.from_status || null,
      to_status: event.metadata?.to_status || null,
      title: event.title || '',
      content: event.content || '',
      application_id: selectedApplication?.id || null,
      metadata: event.metadata || {},
    }))
  }

  async function copyToClipboard(text: string) {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return
    }

    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }

  async function handleCopyAuditPayload() {
    try {
      if (visibleAuditEvents.length === 0) {
        toast({
          title: 'Nothing to copy',
          description: 'No audit events match your current filters.',
          variant: 'destructive',
        })
        return
      }

      const payload = buildAuditExportPayload()
      const jsonContent = JSON.stringify(payload, null, 2)
      await copyToClipboard(jsonContent)

      toast({
        title: 'Payload copied',
        description: `Copied ${visibleAuditEvents.length} filtered audit events to clipboard.`,
      })
    } catch (error) {
      console.error('Failed to copy audit payload:', error)
      toast({
        title: 'Copy failed',
        description: 'Could not copy payload. Please try again.',
        variant: 'destructive',
      })
    }
  }

  async function handleCopyAuditCurl() {
    try {
      if (!selectedApplication?.id) {
        toast({
          title: 'No application selected',
          description: 'Open an application first to copy a cURL request.',
          variant: 'destructive',
        })
        return
      }

      const apiUrl = new URL(`/api/admin/applications/${selectedApplication.id}/audit`, window.location.origin)
      if (auditActionFilter !== 'all') apiUrl.searchParams.set('action', auditActionFilter)
      if (auditStatusFilter !== 'all') apiUrl.searchParams.set('transition', auditStatusFilter)
      if (auditSortOrder !== 'desc') apiUrl.searchParams.set('sort', auditSortOrder)
      if (!showMeaningfulOnly) apiUrl.searchParams.set('meaningful_only', 'false')
      if (auditSearchQuery.trim()) apiUrl.searchParams.set('search', auditSearchQuery.trim())

      const authHeader = auditCurlAuthMode === 'cookie'
        ? `  -H "Cookie: sb-access-token=<SUPABASE_ACCESS_TOKEN>; sb-refresh-token=<SUPABASE_REFRESH_TOKEN>"`
        : `  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>"`

      const curlCommand = [
        `curl -sS "${apiUrl.toString()}"`,
        `  -H "Accept: application/json"`,
        authHeader,
      ].join(' \\\n')

      await copyToClipboard(curlCommand)

      toast({
        title: 'cURL copied',
        description: `Copied audit API request with current filters (${auditCurlAuthMode} auth).`,
      })
    } catch (error) {
      console.error('Failed to copy audit cURL:', error)
      toast({
        title: 'Copy failed',
        description: 'Could not copy cURL command. Please try again.',
        variant: 'destructive',
      })
    }
  }

  function filterApplications() {
    let filtered = applications

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(app => 
        app.applicant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.applicant_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.job_posting?.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter)
    }

    // Filter by job posting
    if (jobFilter !== 'all') {
      filtered = filtered.filter(app => app.job_posting_id === jobFilter)
    }

    setFilteredApplications(filtered)
  }

  async function handleReviewApplication() {
    if (!selectedApplication) return

    try {
      setIsSubmitting(true)
      let successDescription = `Application has been ${reviewData.status}.`

      if (reviewData.status === 'approved') {
        const response = await fetch('/api/admin/applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'approve',
            application_id: selectedApplication.id,
            send_contract: reviewData.sendContract,
            contract_provider: reviewData.contractProvider,
            contract_terms: reviewData.contractTerms || undefined,
          }),
        })

        const payload = await response.json()
        if (!payload.success) throw new Error(payload.error || 'Approval failed')
        const hasContract = Boolean(payload.data?.contract?.contractId || payload.data?.contract?.id)
        const hasOnboarding = Boolean(payload.data?.onboarding_url)
        successDescription = hasContract || hasOnboarding
          ? `Approved. ${hasOnboarding ? 'Onboarding invitation created. ' : ''}${hasContract ? 'Contract sent.' : ''}`.trim()
          : 'Approved and moved to onboarding.'
      } else {
        await AdminOnboardingStaffService.updateApplicationStatus(selectedApplication.id, {
          status: reviewData.status,
          feedback: reviewData.feedback,
          rating: reviewData.rating
        })
      }

      toast({
        title: 'Application Updated',
        description: successDescription,
      })
      void trackDashboardUxEvent({
        eventName: 'admin_application_review_submitted',
        surface: 'admin_applications',
        metadata: {
          applicationId: selectedApplication.id,
          status: reviewData.status,
          hasContract: reviewData.sendContract,
        },
      })

      setShowReviewModal(false)
      setSelectedApplication(null)
      setReviewData(createDefaultReviewData())
      loadApplications() // Refresh data
    } catch (error) {
      console.error('Error updating application:', error)
      void trackDashboardUxEvent({
        eventName: 'admin_application_review_failed',
        surface: 'admin_applications',
        metadata: {
          applicationId: selectedApplication.id,
          status: reviewData.status,
        },
      })
      toast({
        title: 'Error',
        description: 'Failed to update application. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  function openReviewModal(application: ApplicationWithJob, status: 'approved' | 'rejected', closeDetails = false) {
    setSelectedApplication(application)
    setReviewData(createDefaultReviewData(status))
    setShowReviewModal(true)
    if (closeDetails) setShowApplicationModal(false)
  }

  function getPriorityColor(application: ApplicationWithJob) {
    const daysSinceApplied = Math.floor((Date.now() - new Date(application.applied_at).getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceApplied > 7) return 'border-red-500'
    if (daysSinceApplied > 3) return 'border-yellow-500'
    return 'border-green-500'
  }

  const uniqueJobs = Array.from(new Set(applications.map(app => app.job_posting_id)))
  const statusOptions = ['all', 'pending', 'reviewed', 'approved', 'rejected', 'shortlisted', 'withdrawn']

  if (!venueId && !isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-full max-w-md">
          <HiringStateCard
            title="No Venue Linked"
            description="Link a venue to your organizer account to manage job applications."
            icon={Users}
          />
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-full max-w-md">
          <HiringStateCard
            title="Loading Applications"
            description="Please wait..."
            isLoading={true}
          />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-full max-w-md">
          <HiringStateCard
            title="Error Loading Applications"
            description={error}
            icon={AlertCircle}
            className="border-red-700"
            actionLabel="Try Again"
            onAction={loadApplications}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Job Applications</h1>
            <p className="text-slate-400">
              Review and manage job applications from candidates
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Send className="h-4 w-4 mr-2" />
              Send Bulk Message
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status} className="text-white">
                  {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={jobFilter} onValueChange={setJobFilter}>
            <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="All Jobs" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              <SelectItem value="all" className="text-white">All Jobs</SelectItem>
              {uniqueJobs.map((jobId) => {
                const job = applications.find(app => app.job_posting_id === jobId)?.job_posting
                return (
                  <SelectItem key={jobId} value={jobId} className="text-white">
                    {job?.title || 'Unknown Job'}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Applications List */}
      <div className="p-6">
        <div className="grid gap-4">
          {filteredApplications.length === 0 ? (
            <HiringStateCard
              title="No Applications Found"
              description={
                applications.length === 0
                  ? 'No applications have been submitted yet.'
                  : 'No applications match your current filters.'
              }
              icon={Users}
            />
          ) : (
            filteredApplications.map((application) => (
              <Card 
                key={application.id} 
                className={`bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors cursor-pointer ${getPriorityColor(application)}`}
                onClick={() => {
                  setSelectedApplication(application)
                  setShowApplicationModal(true)
                }}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <ApplicationApplicantSummary
                        applicantName={application.applicant_name}
                        applicantEmail={application.applicant_email}
                        status={application.status}
                        appliedAt={application.applied_at}
                        avatarUrl={(application as any).avatar_url || undefined}
                      />
                      <ApplicationJobSummary
                        displayMode="inline"
                        prefixLabel="Applied for:"
                        title={application.job_posting?.title}
                        department={application.job_posting?.department}
                      />
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <ApplicationRating rating={application.rating} showValue={false} />
                        <ApplicationInsightsBadges
                          onboardingStage={application.onboarding_status?.stage}
                          contractStatus={application.contract_status?.status}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedApplication(application)
                          setShowApplicationModal(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      {application.status === 'pending' ? (
                        <ApplicationReviewActions
                          size="sm"
                          onApprove={(event) => {
                            event.stopPropagation()
                            openReviewModal(application, 'approved')
                          }}
                          onReject={(event) => {
                            event.stopPropagation()
                            openReviewModal(application, 'rejected')
                          }}
                        />
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Application Detail Modal */}
      <Dialog open={showApplicationModal} onOpenChange={setShowApplicationModal}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Application Details</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-6">
              {/* Applicant Info */}
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Applicant Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ApplicationApplicantSummary
                    applicantName={selectedApplication.applicant_name}
                    applicantEmail={selectedApplication.applicant_email}
                    applicantPhone={selectedApplication.applicant_phone}
                    status={selectedApplication.status}
                    appliedAt={selectedApplication.applied_at}
                    avatarUrl={(selectedApplication as any).avatar_url || undefined}
                    avatarClassName="h-16 w-16"
                    infoClassName="space-y-3"
                  />
                </CardContent>
              </Card>

              {/* Job Details */}
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Job Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <ApplicationJobSummary
                    title={selectedApplication.job_posting?.title}
                    department={selectedApplication.job_posting?.department}
                    position={selectedApplication.job_posting?.position}
                    location={selectedApplication.job_posting?.location}
                  />
                </CardContent>
              </Card>

              {/* Form Responses */}
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Application Responses</CardTitle>
                </CardHeader>
                <CardContent>
                  <ApplicationResponsesList responses={selectedApplication.form_responses} />
                </CardContent>
              </Card>

              {/* Review Actions */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setShowApplicationModal(false)}
                >
                  Close
                </Button>
                <div className="flex gap-2">
                  {selectedApplication.status === 'pending' ? (
                    <ApplicationReviewActions
                      onApprove={() => openReviewModal(selectedApplication, 'approved', true)}
                      onReject={() => openReviewModal(selectedApplication, 'rejected', true)}
                    />
                  ) : null}
                  <Button variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>
              </div>

              {/* Audit Trail */}
              <Card className="bg-slate-700 border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white">Audit Trail</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <Input
                      value={auditSearchQuery}
                      onChange={(event) => {
                        setAuditSearchQuery(event.target.value)
                        setActiveAuditPreset('all')
                      }}
                      placeholder="Search audit events by action, status, or message..."
                      className="bg-slate-800 border-slate-600 text-slate-100"
                    />
                  </div>

                  <div className="flex justify-end gap-2 mb-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-200"
                      onClick={() => setAuditCurlAuthMode((mode) => mode === 'bearer' ? 'cookie' : 'bearer')}
                    >
                      Auth: {auditCurlAuthMode === 'bearer' ? 'Bearer' : 'Cookie'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-200"
                      onClick={handleExportAuditCsv}
                    >
                      <Download className="h-3.5 w-3.5 mr-2" />
                      Export CSV
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-200"
                      onClick={handleExportAuditJson}
                    >
                      <FileDown className="h-3.5 w-3.5 mr-2" />
                      Export JSON
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-200"
                      onClick={handleCopyAuditPayload}
                    >
                      <FileText className="h-3.5 w-3.5 mr-2" />
                      Copy Payload
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-200"
                      onClick={handleCopyAuditCurl}
                    >
                      <Copy className="h-3.5 w-3.5 mr-2" />
                      Copy cURL
                    </Button>
                  </div>
                  <p className="mb-3 text-xs text-slate-400">
                    {auditCurlAuthMode === 'bearer'
                      ? 'Bearer mode is best for token-based API testing (Postman/CLI with an access token).'
                      : 'Cookie mode is best for browser-session debugging when auth relies on Supabase cookies.'}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <Button
                      type="button"
                      size="sm"
                      variant={activeAuditPreset === 'all' ? 'default' : 'outline'}
                      className={activeAuditPreset === 'all' ? 'bg-purple-600 hover:bg-purple-700' : 'border-slate-600 text-slate-200'}
                      onClick={() => applyAuditPreset('all')}
                    >
                      All ({auditPresetCounts.all})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={activeAuditPreset === 'approvals' ? 'default' : 'outline'}
                      className={activeAuditPreset === 'approvals' ? 'bg-green-600 hover:bg-green-700' : 'border-slate-600 text-slate-200'}
                      onClick={() => applyAuditPreset('approvals')}
                    >
                      Approvals ({auditPresetCounts.approvals})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={activeAuditPreset === 'rejections' ? 'default' : 'outline'}
                      className={activeAuditPreset === 'rejections' ? 'bg-red-600 hover:bg-red-700' : 'border-slate-600 text-slate-200'}
                      onClick={() => applyAuditPreset('rejections')}
                    >
                      Rejections ({auditPresetCounts.rejections})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={activeAuditPreset === 'contracts' ? 'default' : 'outline'}
                      className={activeAuditPreset === 'contracts' ? 'bg-indigo-600 hover:bg-indigo-700' : 'border-slate-600 text-slate-200'}
                      onClick={() => applyAuditPreset('contracts')}
                    >
                      Contracts ({auditPresetCounts.contracts})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={activeAuditPreset === 'onboarding' ? 'default' : 'outline'}
                      className={activeAuditPreset === 'onboarding' ? 'bg-cyan-600 hover:bg-cyan-700' : 'border-slate-600 text-slate-200'}
                      onClick={() => applyAuditPreset('onboarding')}
                    >
                      Onboarding ({auditPresetCounts.onboarding})
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-4 gap-2 mb-4">
                    <Select
                      value={auditActionFilter}
                      onValueChange={(value) => {
                        setAuditActionFilter(value)
                        setActiveAuditPreset('all')
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                        <SelectValue placeholder="Action" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all" className="text-slate-100">All actions</SelectItem>
                        {availableAuditActions.map((action) => (
                          <SelectItem key={action} value={action} className="text-slate-100">
                            {action}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={auditStatusFilter}
                      onValueChange={(value) => {
                        setAuditStatusFilter(value)
                        setActiveAuditPreset('all')
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                        <SelectValue placeholder="Status transition" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="all" className="text-slate-100">All transitions</SelectItem>
                        {availableStatusTransitions.map((transition) => (
                          <SelectItem key={transition} value={transition} className="text-slate-100">
                            {transition}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={auditSortOrder}
                      onValueChange={(value) => {
                        setAuditSortOrder(value === 'asc' ? 'asc' : 'desc')
                        setActiveAuditPreset('all')
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                        <SelectValue placeholder="Sort order" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="desc" className="text-slate-100">Newest first</SelectItem>
                        <SelectItem value="asc" className="text-slate-100">Oldest first</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-600 text-slate-200"
                      onClick={() => {
                        setShowMeaningfulOnly((previous) => !previous)
                        setActiveAuditPreset('all')
                      }}
                    >
                      {showMeaningfulOnly ? 'Meaningful only' : 'Show all events'}
                    </Button>
                  </div>

                  {isAuditLoading ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading activity...
                    </div>
                  ) : visibleAuditEvents.length === 0 ? (
                    <p className="text-slate-400 text-sm">No events match your current audit filters.</p>
                  ) : (
                    <div className="space-y-3">
                      {visibleAuditEvents.map((event) => (
                        <div key={event.id} className="rounded-lg border border-slate-600 bg-slate-800/70 p-3">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <Badge variant="outline" className="border-slate-500 text-slate-200">
                              {event.metadata?.action || event.type}
                            </Badge>
                            {event.metadata?.from_status && event.metadata?.to_status ? (
                              <Badge variant="secondary" className="bg-slate-700 text-slate-200">
                                {event.metadata.from_status} {"->"} {event.metadata.to_status}
                              </Badge>
                            ) : null}
                            <span className="text-xs text-slate-400">{formatSafeDate(event.created_at)}</span>
                          </div>
                          <p className="text-sm text-slate-200">{event.title}</p>
                          {event.content ? (
                            <p className="text-xs text-slate-400 mt-1">{event.content}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              {reviewData.status === 'approved' ? 'Approve' : 'Reject'} Application
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Rating (Optional)</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                    key={star}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setReviewData(prev => ({ ...prev, rating: star }))}
                    className={reviewData.rating >= star ? 'text-yellow-500' : 'text-slate-400'}
                  >
                    <Star className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Feedback (Optional)</Label>
              <Textarea
                value={reviewData.feedback}
                onChange={(e) => setReviewData(prev => ({ ...prev, feedback: e.target.value }))}
                placeholder="Add feedback for the applicant..."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            {reviewData.status === 'approved' ? (
              <>
                <div className="space-y-2">
                  <Label className="text-white">Contract Provider</Label>
                  <Select
                    value={reviewData.contractProvider}
                    onValueChange={(value) => setReviewData((prev) => ({ ...prev, contractProvider: value }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="internal" className="text-white">Internal signing</SelectItem>
                      <SelectItem value="docusign" className="text-white">DocuSign</SelectItem>
                      <SelectItem value="dropboxsign" className="text-white">Dropbox Sign</SelectItem>
                      <SelectItem value="pandadoc" className="text-white">PandaDoc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Contract Terms (Optional)</Label>
                  <Textarea
                    value={reviewData.contractTerms}
                    onChange={(event) =>
                      setReviewData((prev) => ({ ...prev, contractTerms: event.target.value }))
                    }
                    placeholder="Optional offer and contract terms"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </>
            ) : null}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setShowReviewModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReviewApplication}
                disabled={isSubmitting}
                className={reviewData.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    {reviewData.status === 'approved' ? <Check className="h-4 w-4 mr-2" /> : <XIcon className="h-4 w-4 mr-2" />}
                    {reviewData.status === 'approved' ? 'Approve' : 'Reject'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 