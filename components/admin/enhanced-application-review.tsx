"use client"

import { useState, useEffect } from 'react'
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
import { useToast } from '@/components/ui/use-toast'
import { 
  Search,
  Filter,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Star,
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
  searchQuery: string
}

interface AutoScreeningResult {
  applicationId: string
  passed: boolean
  issues: string[]
  recommendations: string[]
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
  const { toast } = useToast()

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

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(app => 
        app.applicant_name.toLowerCase().includes(query) ||
        app.applicant_email.toLowerCase().includes(query) ||
        (app.applicant_phone && app.applicant_phone.includes(query))
      )
    }

    setFilteredApplications(filtered)
  }, [applications, filters, jobPostings])

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
    const config = {
      pending: { label: 'Pending', variant: 'secondary' as const, color: 'bg-yellow-500' },
      reviewed: { label: 'Reviewed', variant: 'outline' as const, color: 'bg-blue-500' },
      approved: { label: 'Approved', variant: 'default' as const, color: 'bg-green-500' },
      rejected: { label: 'Rejected', variant: 'destructive' as const, color: 'bg-red-500' },
      shortlisted: { label: 'Shortlisted', variant: 'default' as const, color: 'bg-purple-500' },
      withdrawn: { label: 'Withdrawn', variant: 'outline' as const, color: 'bg-gray-500' }
    }

    const statusConfig = config[status as keyof typeof config] || config.pending
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
  }

  const getRatingStars = (rating?: number) => {
    if (!rating) return null
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
          />
        ))}
        <span className="text-xs text-slate-400 ml-1">({rating})</span>
      </div>
    )
  }

  const departments = [...new Set(jobPostings.map(jp => jp.department))]

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
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-purple-600 text-white">
                          {application.applicant_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-white">{application.applicant_name}</h4>
                        <p className="text-slate-400 text-sm">{application.applicant_email}</p>
                      </div>
                    </div>
                    
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
                      
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-purple-600 text-white">
                          {application.applicant_name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-white">{application.applicant_name}</h4>
                          {screeningResult && (
                            screeningResult.passed ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {application.applicant_email}
                          </div>
                          {application.applicant_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {application.applicant_phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatSafeDate(application.applied_at)}
                          </div>
                        </div>
                        
                        {jobPosting && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {jobPosting.department}
                            </Badge>
                            <span className="text-slate-400 text-sm">{jobPosting.title}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {getStatusBadge(application.status)}
                        {getRatingStars(application.rating)}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedApplication(application)
                            setShowApplicationDetail(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle quick approve
                            onUpdateStatus(application.id, 'approved')
                          }}
                          className="text-green-500 hover:text-green-400"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle quick reject
                            onUpdateStatus(application.id, 'rejected')
                          }}
                          className="text-red-500 hover:text-red-400"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
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
                        {getRatingStars(selectedApplication.rating)}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Job Information</h3>
                  {jobPostings.find(jp => jp.id === selectedApplication.job_posting_id) && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Position:</span>
                        <span className="text-white">
                          {jobPostings.find(jp => jp.id === selectedApplication.job_posting_id)?.title}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Department:</span>
                        <span className="text-white">
                          {jobPostings.find(jp => jp.id === selectedApplication.job_posting_id)?.department}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Responses */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Application Responses</h3>
                <div className="space-y-3">
                  {Object.entries(selectedApplication.form_responses || {}).map(([key, value]) => (
                    <div key={key} className="p-3 bg-slate-700 rounded">
                      <h4 className="font-medium text-white capitalize mb-1">
                        {key.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-slate-300 text-sm">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-slate-600">
                <Button
                  onClick={() => onUpdateStatus(selectedApplication.id, 'approved')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={() => onUpdateStatus(selectedApplication.id, 'rejected')}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => onUpdateStatus(selectedApplication.id, 'shortlisted')}
                  variant="outline"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Shortlist
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Handle send message
                    onSendMessage(selectedApplication.id, 'Thank you for your application...')
                  }}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
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