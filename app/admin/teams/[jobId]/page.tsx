"use client"

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
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
  Calendar,
  MapPin,
  Phone,
  Mail,
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
  Settings,
  Edit,
  Trash2,
  Plus,
  Target,
  TrendingUp,
  Award,
  Shield,
  Clock as ClockIcon,
  Calendar as CalendarIcon,
  MapPin as MapPinIcon
} from 'lucide-react'
import { AdminOnboardingStaffService } from '@/lib/services/admin-onboarding-staff.service'
import { useCurrentVenue } from '@/hooks/use-venue'
import type { StaffMember, JobPostingTemplate, OnboardingCandidate } from '@/types/admin-onboarding'
import { formatSafeDate } from '@/lib/events/admin-event-normalization'

interface TeamMember extends StaffMember {
  onboarding_progress?: number
  onboarding_stage?: string
  hire_date?: string
  performance_rating?: number
  last_active?: string
}

export default function TeamManagementPage() {
  const params = useParams()
  const jobId = params.jobId as string
  const [jobPosting, setJobPosting] = useState<JobPostingTemplate | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [onboardingCandidates, setOnboardingCandidates] = useState<OnboardingCandidate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [showMemberModal, setShowMemberModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [activeTab, setActiveTab] = useState('team')
  const { toast } = useToast()
  const { venue } = useCurrentVenue()

  const venueId = venue?.id

  useEffect(() => {
    if (venueId) loadTeamData()
  }, [jobId, venueId])

  async function loadTeamData() {
    if (!venueId) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)

      // Load job posting details
      const jobPostings = await AdminOnboardingStaffService.getJobPostings(venueId)
      const job = jobPostings.find(j => j.id === jobId)
      setJobPosting(job || null)

      // Load team members and onboarding candidates
      const [staffMembers, candidates] = await Promise.all([
        AdminOnboardingStaffService.getStaffMembers(venueId),
        AdminOnboardingStaffService.getOnboardingCandidates(venueId)
      ])

      // Filter team members for this job
      const jobTeamMembers = staffMembers.filter(member => 
        member.department === job?.department && member.role === job?.position
      ) as TeamMember[]

      // Filter onboarding candidates for this job
      const jobCandidates = candidates.filter(candidate => 
        candidate.department === job?.department && candidate.position === job?.position
      )

      setTeamMembers(jobTeamMembers)
      setOnboardingCandidates(jobCandidates)
    } catch (err) {
      console.error('Error loading team data:', err)
      setError('Failed to load team data')
      toast({
        title: 'Error',
        description: 'Failed to load team data. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUpdateMemberStatus(memberId: string, status: string) {
    try {
      // This would typically update the staff member status
      // For now, we'll just show a toast
      toast({
        title: 'Status Updated',
        description: `Team member status updated to ${status}.`,
      })
      loadTeamData() // Refresh data
    } catch (error) {
      console.error('Error updating member status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update member status. Please try again.',
        variant: 'destructive'
      })
    }
  }

  async function handleRemoveMember(memberId: string) {
    try {
      // This would typically remove the member from the team
      // For now, we'll just show a toast
      toast({
        title: 'Member Removed',
        description: 'Team member has been removed from the team.',
      })
      loadTeamData() // Refresh data
    } catch (error) {
      console.error('Error removing member:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove member. Please try again.',
        variant: 'destructive'
      })
    }
  }

  function getStatusBadge(status: string) {
    const statusConfig = {
      active: { label: 'Active', variant: 'default' as const, color: 'bg-green-500' },
      inactive: { label: 'Inactive', variant: 'secondary' as const, color: 'bg-gray-500' },
      on_leave: { label: 'On Leave', variant: 'outline' as const, color: 'bg-yellow-500' },
      terminated: { label: 'Terminated', variant: 'destructive' as const, color: 'bg-red-500' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  function getOnboardingStageBadge(stage: string) {
    const stageConfig = {
      invitation: { label: 'Invited', variant: 'outline' as const },
      onboarding: { label: 'Onboarding', variant: 'secondary' as const },
      review: { label: 'Under Review', variant: 'default' as const },
      approved: { label: 'Approved', variant: 'default' as const },
      rejected: { label: 'Rejected', variant: 'destructive' as const }
    }

    const config = stageConfig[stage as keyof typeof stageConfig] || stageConfig.onboarding
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const filteredTeamMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || member.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const statusOptions = ['all', 'active', 'inactive', 'on_leave', 'terminated']

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="p-8 bg-slate-800 border-slate-700 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-500" />
          <h2 className="text-xl font-semibold text-white mb-2">Loading Team Management</h2>
          <p className="text-slate-400">Please wait...</p>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="p-8 bg-slate-800 border-red-700 text-center max-w-md">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Team</h2>
          <p className="text-slate-400 mb-4">{error}</p>
          <Button onClick={loadTeamData} variant="outline">
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Team Management: {jobPosting?.title || 'Unknown Position'}
            </h1>
            <p className="text-slate-400">
              Manage your team members and onboarding candidates
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowAddMemberModal(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Team
            </Button>
          </div>
        </div>
      </div>

      {/* Job Details */}
      {jobPosting && (
        <div className="p-6 border-b border-slate-700">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">{jobPosting.title}</h3>
                  <p className="text-slate-400">{jobPosting.department} • {jobPosting.position}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <MapPinIcon className="h-4 w-4" />
                      <span>{jobPosting.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{teamMembers.length} team members</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      <span>{onboardingCandidates.length} candidates</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="bg-slate-700 text-white">
                    {jobPosting.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-slate-800">
            <TabsTrigger value="team" className="data-[state=active]:bg-purple-600">
              <Users className="h-4 w-4 mr-2" />
              Team Members
            </TabsTrigger>
            <TabsTrigger value="onboarding" className="data-[state=active]:bg-purple-600">
              <UserPlus className="h-4 w-4 mr-2" />
              Onboarding
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-600">
              <TrendingUp className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Team Members Tab */}
          <TabsContent value="team" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search team members..."
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
            </div>

            {/* Team Members List */}
            <div className="grid gap-4">
              {filteredTeamMembers.length === 0 ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-slate-500" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Team Members</h3>
                    <p className="text-slate-400">
                      No team members have been assigned to this position yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredTeamMembers.map((member) => (
                  <Card key={member.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback className="bg-slate-700 text-white">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                              {getStatusBadge(member.status)}
                            </div>
                            <p className="text-slate-400 text-sm">{member.email}</p>
                            <p className="text-slate-400 text-sm">
                              {member.department} • {member.role}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                              {member.hire_date && (
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-4 w-4" />
                                  <span>Hired {formatSafeDate(member.hire_date)}</span>
                                </div>
                              )}
                              {member.performance_rating && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  <span>{member.performance_rating}/5</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMember(member)
                              setShowMemberModal(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateMemberStatus(member.id, 'active')}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Onboarding Tab */}
          <TabsContent value="onboarding" className="space-y-6">
            <div className="grid gap-4">
              {onboardingCandidates.length === 0 ? (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-8 text-center">
                    <UserPlus className="h-12 w-12 mx-auto mb-4 text-slate-500" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Onboarding Candidates</h3>
                    <p className="text-slate-400">
                      No candidates are currently in the onboarding process for this position.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                onboardingCandidates.map((candidate) => (
                  <Card key={candidate.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={candidate.avatar_url} />
                            <AvatarFallback className="bg-slate-700 text-white">
                              {candidate.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-white">{candidate.name}</h3>
                              {getOnboardingStageBadge(candidate.stage)}
                            </div>
                            <p className="text-slate-400 text-sm">{candidate.email}</p>
                            <p className="text-slate-400 text-sm">
                              {candidate.department} • {candidate.position}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-4 w-4" />
                                <span>Applied {formatSafeDate(candidate.application_date)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Target className="h-4 w-4" />
                                <span>{candidate.onboarding_progress}% complete</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div
                                className="bg-purple-500 h-2 rounded-full"
                                style={{ width: `${candidate.onboarding_progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Navigate to onboarding wizard
                              window.open(`/onboarding/${candidate.id}`, '_blank')
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Progress
                          </Button>
                          {candidate.stage === 'approved' && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                // Complete onboarding and add to team
                                toast({
                                  title: 'Onboarding Complete',
                                  description: 'Candidate has been added to the team.',
                                })
                              }}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Add to Team
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Size
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">{teamMembers.length}</p>
                  <p className="text-slate-400 text-sm">Active team members</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Onboarding
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">{onboardingCandidates.length}</p>
                  <p className="text-slate-400 text-sm">Candidates in process</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Avg Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-white">
                    {teamMembers.length > 0 
                      ? (teamMembers.reduce((sum, m) => sum + (m.performance_rating || 0), 0) / teamMembers.length).toFixed(1)
                      : '0.0'
                    }
                  </p>
                  <p className="text-slate-400 text-sm">Out of 5 stars</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Team Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-slate-400">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-slate-500" />
                  <p>Performance analytics coming soon</p>
                  <p className="text-sm">Detailed team performance metrics and insights</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Team Member Detail Modal */}
      <Dialog open={showMemberModal} onOpenChange={setShowMemberModal}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Team Member Details</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedMember.avatar_url} />
                  <AvatarFallback className="bg-slate-600 text-white">
                    {selectedMember.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">{selectedMember.name}</h3>
                  <p className="text-slate-400">{selectedMember.email}</p>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedMember.status)}
                    <span className="text-slate-400 text-sm">
                      {selectedMember.department} • {selectedMember.role}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Hire Date</Label>
                  <p className="text-slate-300">
                    {selectedMember.hire_date 
                      ? formatSafeDate(selectedMember.hire_date)
                      : 'Not specified'
                    }
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Performance Rating</Label>
                  <p className="text-slate-300">
                    {selectedMember.performance_rating ? `${selectedMember.performance_rating}/5` : 'Not rated'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Employment Type</Label>
                  <p className="text-slate-300">{selectedMember.employment_type}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Last Active</Label>
                  <p className="text-slate-300">
                    {selectedMember.last_active 
                      ? formatSafeDate(selectedMember.last_active)
                      : 'Unknown'
                    }
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setShowMemberModal(false)}
                >
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                  <Button>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Details
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 