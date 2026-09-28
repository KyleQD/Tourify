"use client"

/** Admin Dashboard Builder: Superseded by hiring onboarding panels (cmp-enhanced-onboarding wont-fix). */

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { OnboardingFormField } from "./onboarding-form-fields"
import { OnboardingTemplatesService, OnboardingTemplate, OnboardingField } from "@/lib/services/onboarding-templates.service"
import { OnboardingKanbanBoard } from "./onboarding-kanban-board"
import OnboardingDashboard from "./onboarding-dashboard"
import EnhancedCandidateManager from "./enhanced-candidate-manager"
import OnboardingWorkflowVisualizer from "./onboarding-workflow-visualizer"
import {
  Users,
  Plus,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  Calendar,
  UserPlus,
  Download,
  Upload,
  Send,
  MessageSquare,
  Briefcase,
  GraduationCap,
  Shield,
  Star,
  ChevronRight,
  UserCheck,
  Building,
  MapPin,
  DollarSign,
  Settings,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Save,
  GripVertical as Grip,
  ChevronDown,
  Target,
  BookOpen,
  Award,
  Zap,
  Sparkles,
  BrainCircuit,
  BarChart3,
  UserX,
  CheckSquare,
  XSquare,
  MessageCircle,
  ExternalLink
} from "lucide-react"

interface OnboardingCandidate {
  id: string
  venue_id: string
  name: string
  email: string
  phone?: string
  position: string
  department: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'approved'
  stage: 'invitation' | 'onboarding' | 'review' | 'approved' | 'rejected'
  application_date: string
  avatar_url?: string
  experience_years: number
  skills: string[]
  documents: any[]
  notes: string
  assigned_manager?: string
  start_date?: string
  salary?: number
  employment_type: 'full_time' | 'part_time' | 'contractor' | 'volunteer'
  onboarding_progress: number
  template_id?: string
  invitation_token?: string
  onboarding_responses?: any
  review_notes?: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
  template?: {
    name: string
    description?: string
  }
}



interface OnboardingStats {
  total: number
  pending: number
  in_progress: number
  completed: number
  approved: number
  rejected: number
  average_progress: number
}

export default function EnhancedOnboardingSystem({ venueId }: { venueId: string }) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [selectedCandidate, setSelectedCandidate] = useState<OnboardingCandidate | null>(null)
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showReviewDialog, setShowReviewDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterDepartment, setFilterDepartment] = useState("all")
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState<OnboardingCandidate[]>([])
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([])
  
  // Template management state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null)
  const [templateFormData, setTemplateFormData] = useState<any>({})
  const [showInitializeTemplatesDialog, setShowInitializeTemplatesDialog] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban')
  const [stats, setStats] = useState<OnboardingStats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    approved: 0,
    rejected: 0,
    average_progress: 0
  })

  // Form states
  const [addUserForm, setAddUserForm] = useState({
    user_id: "",
    position: "",
    department: "",
    employment_type: "full_time" as const,
    start_date: "",
    salary: "",
    notes: "",
    onboarding_template_id: ""
  })

  const [inviteForm, setInviteForm] = useState({
    email: "",
    phone: "",
    position: "",
    department: "",
    employment_type: "full_time" as const,
    start_date: "",
    salary: "",
    notes: "",
    message: "",
    onboarding_template_id: ""
  })

  const [reviewForm, setReviewForm] = useState({
    action: "approve" as "approve" | "reject",
    review_notes: ""
  })

  useEffect(() => {
    fetchOnboardingData()
  }, [venueId])

  async function fetchOnboardingData() {
    setLoading(true)
    try {
      // Fetch candidates and stats
      const candidatesResponse = await fetch(`/api/admin/onboarding/candidates?venue_id=${venueId}`)
      if (candidatesResponse.ok) {
        const data = await candidatesResponse.json()
        setCandidates(data.data.candidates || [])
        setStats(data.data.stats || {})
      }
      
      // Fetch templates
      const templatesResponse = await fetch(`/api/admin/onboarding/templates?venue_id=${venueId}`)
      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json()
        setTemplates(templatesData.data || [])
      }
    } catch (error) {
      console.error("Error fetching onboarding data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch onboarding data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleAddExistingUser() {
    if (!addUserForm.user_id || !addUserForm.position || !addUserForm.department) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/onboarding/add-existing-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue_id: venueId,
          ...addUserForm,
          salary: addUserForm.salary ? parseFloat(addUserForm.salary) : undefined
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "User added to onboarding process"
        })
        setShowAddUserDialog(false)
        setAddUserForm({
          user_id: "",
          position: "",
          department: "",
          employment_type: "full_time",
          start_date: "",
          salary: "",
          notes: "",
          onboarding_template_id: ""
        })
        fetchOnboardingData()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add user",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleInviteNewUser() {
    if ((!inviteForm.email && !inviteForm.phone) || !inviteForm.position || !inviteForm.department) {
      toast({
        title: "Error",
        description: "Please provide email or phone and fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/onboarding/invite-new-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue_id: venueId,
          ...inviteForm,
          salary: inviteForm.salary ? parseFloat(inviteForm.salary) : undefined
        })
      })

      if (response.ok) {
        const result = await response.json()
    toast({
          title: "Success",
          description: `Invitation sent to ${inviteForm.email || inviteForm.phone}`
        })
        setShowInviteDialog(false)
        setInviteForm({
          email: "",
          phone: "",
          position: "",
          department: "",
          employment_type: "full_time",
          start_date: "",
          salary: "",
          notes: "",
          message: "",
          onboarding_template_id: ""
        })
        fetchOnboardingData()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(candidateId: string, newStatus: string) {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/onboarding/update-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          status: newStatus
        })
      })

      if (response.ok) {
    toast({
      title: "Status Updated",
          description: "Candidate status has been updated successfully",
        })
        fetchOnboardingData() // Refresh data
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to update status",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error updating candidate status:", error)
      toast({
        title: "Error",
        description: "Failed to update candidate status",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleReviewCandidate() {
    if (!selectedCandidate) return

    setLoading(true)
    try {
      const response = await fetch("/api/admin/onboarding/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: selectedCandidate.id,
          action: reviewForm.action,
          review_notes: reviewForm.review_notes
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `Candidate ${reviewForm.action === 'approve' ? 'approved' : 'rejected'} successfully`
        })
        setShowReviewDialog(false)
        setReviewForm({ action: "approve", review_notes: "" })
        setSelectedCandidate(null)
        fetchOnboardingData()
      } else {
        const error = await response.json()
        throw new Error(error.error)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to review candidate",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.position.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || candidate.status === filterStatus
    const matchesDepartment = filterDepartment === "all" || candidate.department === filterDepartment
    
    return matchesSearch && matchesStatus && matchesDepartment
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400'
      case 'in_progress': return 'bg-blue-500/20 text-blue-400'
      case 'completed': return 'bg-purple-500/20 text-purple-400'
      case 'approved': return 'bg-green-500/20 text-green-400'
      case 'rejected': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'invitation': return 'bg-orange-500/20 text-orange-400'
      case 'onboarding': return 'bg-blue-500/20 text-blue-400'
      case 'review': return 'bg-purple-500/20 text-purple-400'
      case 'approved': return 'bg-green-500/20 text-green-400'
      case 'rejected': return 'bg-red-500/20 text-red-400'
      default: return 'bg-slate-500/20 text-slate-400'
    }
  }

  // Template management functions
  async function handleInitializeTemplates() {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/onboarding/initialize-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venue_id: venueId })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Default templates initialized successfully",
        })
        setShowInitializeTemplatesDialog(false)
        fetchOnboardingData() // Refresh templates
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to initialize templates",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error initializing templates:", error)
      toast({
        title: "Error",
        description: "Failed to initialize templates",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateTemplate() {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/onboarding/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          venue_id: venueId,
          ...templateFormData
        })
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Template created successfully",
        })
        setShowTemplateDialog(false)
        setTemplateFormData({})
        fetchOnboardingData() // Refresh templates
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to create template",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error creating template:", error)
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!confirm("Are you sure you want to delete this template?")) return

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/onboarding/templates?id=${templateId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Template deleted successfully",
        })
        fetchOnboardingData() // Refresh templates
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to delete template",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600">
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="candidates" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600">
            <Users className="h-4 w-4 mr-2" />
            Candidates
          </TabsTrigger>
          <TabsTrigger value="workflows" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600">
            <Target className="h-4 w-4 mr-2" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="add-user" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </TabsTrigger>
          <TabsTrigger value="invite" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-600">
            <Send className="h-4 w-4 mr-2" />
            Invite New
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <OnboardingDashboard
            venueId={venueId}
            onViewCandidates={() => setActiveTab("candidates")}
            onViewTemplates={() => setActiveTab("templates")}
            onAddCandidate={() => setShowAddUserDialog(true)}
          />
        </TabsContent>

        {/* Candidates Tab */}
        <TabsContent value="candidates" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Onboarding Candidates</h2>
              <p className="text-slate-400">Manage and track new staff through the onboarding process</p>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={() => setShowAddUserDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
              <UserPlus className="h-4 w-4 mr-2" />
                Add Existing User
              </Button>
              <Button 
                onClick={() => setShowInviteDialog(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Invite New User
              </Button>
            </div>
          </div>

          {/* View Toggle and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* View Toggle */}
              <div className="flex items-center space-x-2 bg-slate-800/50 rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('list')}
                  className={viewMode === 'list' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-slate-700'}
                >
                  <Users className="h-4 w-4 mr-1" />
                  List
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('kanban')}
                  className={viewMode === 'kanban' ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-slate-700'}
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Kanban
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900/50 border-slate-700/50 text-white"
              />
            </div>
            
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48 bg-slate-900/50 border-slate-700/50 text-white">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-48 bg-slate-900/50 border-slate-700/50 text-white">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-700">
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Technical">Technical</SelectItem>
                <SelectItem value="Security">Security</SelectItem>
                <SelectItem value="Operations">Operations</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>
                        </div>
                      </div>

          {/* Candidates Content */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-slate-400 mt-2">Loading candidates...</p>
                    </div>
          ) : filteredCandidates.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No candidates found</h3>
                <p className="text-slate-400 mb-4">Get started by adding existing users or inviting new ones</p>
                <div className="flex justify-center space-x-2">
                  <Button onClick={() => setShowAddUserDialog(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Existing User
                      </Button>
                  <Button onClick={() => setShowInviteDialog(true)} variant="outline">
                    <Send className="h-4 w-4 mr-2" />
                    Invite New User
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : viewMode === 'kanban' ? (
            <OnboardingKanbanBoard
              candidates={filteredCandidates}
              onCandidateClick={(candidate) => {
                setSelectedCandidate(candidate)
                // Handle candidate click - could open a detail modal
              }}
              onStatusChange={handleStatusChange}
              loading={loading}
            />
          ) : (
            <EnhancedCandidateManager
              venueId={venueId}
              onEditCandidate={(candidate) => {
                setSelectedCandidate(candidate)
                // Handle edit - could open edit modal
              }}
              onViewCandidate={(candidate) => {
                setSelectedCandidate(candidate)
                // Handle view - could open detail modal
              }}
              onSendMessage={(candidate) => {
                // Handle send message - could open messaging modal
                console.log('Send message to:', candidate.name)
              }}
            />
          )}
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Onboarding Workflows</h2>
              <p className="text-slate-400">Track and manage the complete onboarding pipeline from job posting to team assignment</p>
            </div>
            <div className="flex space-x-2">
                      <Button 
                onClick={() => setActiveTab("add-user")}
                        className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                      >
                <Plus className="h-4 w-4 mr-2" />
                Start New Workflow
                      </Button>
                    </div>
                  </div>

          <OnboardingWorkflowVisualizer
            venueId={venueId}
            onWorkflowUpdate={(workflowId, newStage) => {
              console.log('Workflow updated:', workflowId, 'to stage:', newStage)
              // Refresh data if needed
            }}
            onViewCandidate={(candidateId) => {
              console.log('View candidate:', candidateId)
              // Could open candidate detail modal
            }}
            onSendMessage={(candidateId) => {
              console.log('Send message to candidate:', candidateId)
              // Could open messaging modal
            }}
          />
        </TabsContent>

        {/* Add User Tab */}
        <TabsContent value="add-user" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Add Existing User to Onboarding</CardTitle>
              <CardDescription>Add a user who already has an account to the onboarding process</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                  <Label htmlFor="user_id" className="text-white">User ID</Label>
                  <Input
                    id="user_id"
                    value={addUserForm.user_id}
                    onChange={(e) => setAddUserForm({ ...addUserForm, user_id: e.target.value })}
                    placeholder="Enter user ID"
                    className="bg-slate-900/50 border-slate-700/50 text-white"
                  />
                      </div>
                
                <div>
                  <Label htmlFor="position" className="text-white">Position</Label>
                  <Input
                    id="position"
                    value={addUserForm.position}
                    onChange={(e) => setAddUserForm({ ...addUserForm, position: e.target.value })}
                    placeholder="e.g., Sound Engineer"
                    className="bg-slate-900/50 border-slate-700/50 text-white"
                  />
                    </div>

                    <div>
                  <Label htmlFor="department" className="text-white">Department</Label>
                  <Select value={addUserForm.department} onValueChange={(value) => setAddUserForm({ ...addUserForm, department: value })}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700/50 text-white">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Security">Security</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                    </div>

                    <div>
                  <Label htmlFor="employment_type" className="text-white">Employment Type</Label>
                  <Select value={addUserForm.employment_type} onValueChange={(value: any) => setAddUserForm({ ...addUserForm, employment_type: value })}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                    </SelectContent>
                  </Select>
                  </div>

                    <div>
                  <Label htmlFor="start_date" className="text-white">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={addUserForm.start_date}
                    onChange={(e) => setAddUserForm({ ...addUserForm, start_date: e.target.value })}
                    className="bg-slate-900/50 border-slate-700/50 text-white"
                  />
                      </div>

                    <div>
                  <Label htmlFor="salary" className="text-white">Annual Salary</Label>
                  <Input
                    id="salary"
                    type="number"
                    value={addUserForm.salary}
                    onChange={(e) => setAddUserForm({ ...addUserForm, salary: e.target.value })}
                    placeholder="e.g., 50000"
                    className="bg-slate-900/50 border-slate-700/50 text-white"
                  />
                    </div>
                  </div>

              <div>
                <Label htmlFor="notes" className="text-white">Notes</Label>
                <Textarea
                  id="notes"
                  value={addUserForm.notes}
                  onChange={(e) => setAddUserForm({ ...addUserForm, notes: e.target.value })}
                  placeholder="Additional notes about this user..."
                  className="bg-slate-900/50 border-slate-700/50 text-white"
                  rows={3}
                />
                    </div>

              <Button 
                onClick={handleAddExistingUser}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding User...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User to Onboarding
                  </>
                )}
                      </Button>
                </CardContent>
              </Card>
        </TabsContent>

        {/* Invite Tab */}
        <TabsContent value="invite" className="space-y-6">
          <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white">Invite New User</CardTitle>
              <CardDescription>Send an invitation to someone who doesn't have an account yet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                  <Label htmlFor="invite_email" className="text-white">Email</Label>
                  <Input
                    id="invite_email"
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="user@example.com"
                    className="bg-slate-900/50 border-slate-700/50 text-white"
                  />
                        </div>
                
                <div>
                  <Label htmlFor="invite_phone" className="text-white">Phone (Optional)</Label>
                  <Input
                    id="invite_phone"
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="bg-slate-900/50 border-slate-700/50 text-white"
                  />
                      </div>

                <div>
                  <Label htmlFor="invite_position" className="text-white">Position</Label>
                  <Input
                    id="invite_position"
                    value={inviteForm.position}
                    onChange={(e) => setInviteForm({ ...inviteForm, position: e.target.value })}
                    placeholder="e.g., Sound Engineer"
                    className="bg-slate-900/50 border-slate-700/50 text-white"
                  />
                      </div>

                <div>
                  <Label htmlFor="invite_department" className="text-white">Department</Label>
                  <Select value={inviteForm.department} onValueChange={(value) => setInviteForm({ ...inviteForm, department: value })}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700/50 text-white">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="Technical">Technical</SelectItem>
                      <SelectItem value="Security">Security</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                    </div>
                    
                <div>
                  <Label htmlFor="invite_employment_type" className="text-white">Employment Type</Label>
                  <Select value={inviteForm.employment_type} onValueChange={(value: any) => setInviteForm({ ...inviteForm, employment_type: value })}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700/50 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700">
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                    </SelectContent>
                  </Select>
                      </div>

                <div>
                  <Label htmlFor="invite_start_date" className="text-white">Start Date</Label>
                  <Input
                    id="invite_start_date"
                    type="date"
                    value={inviteForm.start_date}
                    onChange={(e) => setInviteForm({ ...inviteForm, start_date: e.target.value })}
                    className="bg-slate-900/50 border-slate-700/50 text-white"
                  />
                    </div>

                <div>
                  <Label htmlFor="invite_salary" className="text-white">Annual Salary</Label>
                  <Input
                    id="invite_salary"
                    type="number"
                    value={inviteForm.salary}
                    onChange={(e) => setInviteForm({ ...inviteForm, salary: e.target.value })}
                    placeholder="e.g., 50000"
                    className="bg-slate-900/50 border-slate-700/50 text-white"
                  />
                      </div>
                      </div>

              <div>
                <Label htmlFor="invite_message" className="text-white">Personal Message</Label>
                <Textarea
                  id="invite_message"
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                  placeholder="Add a personal message to the invitation..."
                  className="bg-slate-900/50 border-slate-700/50 text-white"
                  rows={3}
                />
                    </div>

              <div>
                <Label htmlFor="invite_notes" className="text-white">Internal Notes</Label>
                <Textarea
                  id="invite_notes"
                  value={inviteForm.notes}
                  onChange={(e) => setInviteForm({ ...inviteForm, notes: e.target.value })}
                  placeholder="Internal notes about this invitation..."
                  className="bg-slate-900/50 border-slate-700/50 text-white"
                  rows={2}
                />
                  </div>

              <Button 
                onClick={handleInviteNewUser}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Invitation...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Onboarding Templates</h2>
              <p className="text-slate-400">Manage comprehensive onboarding templates for different positions</p>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={() => setShowInitializeTemplatesDialog(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Initialize Defaults
              </Button>
              <Button 
                onClick={() => setShowTemplateDialog(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
            </div>
          </div>

          {templates.length === 0 ? (
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No templates yet</h3>
                  <p className="text-slate-400 mb-4">Get started with default templates or create your own</p>
                  <div className="flex justify-center space-x-2">
                    <Button onClick={() => setShowInitializeTemplatesDialog(true)}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Initialize Defaults
                    </Button>
                    <Button onClick={() => setShowTemplateDialog(true)} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Custom Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
          <div className="grid gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
                <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                          {template.is_default && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              Default
                            </Badge>
                          )}
                          <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                            {template.employment_type.replace('_', ' ')}
                          </Badge>
                      </div>
                      <p className="text-slate-400 mb-3">{template.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Department</p>
                            <p className="text-white font-medium">{template.department}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Position</p>
                            <p className="text-white font-medium">{template.position}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Est. Days</p>
                            <p className="text-white font-medium">{template.estimated_days}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Used</p>
                            <p className="text-white font-medium">{template.use_count} times</p>
                        </div>
                      </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {template.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                  </div>

                    <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Required Documents</p>
                          <div className="flex flex-wrap gap-1">
                            {template.required_documents.slice(0, 3).map((doc, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                            {doc}
                          </Badge>
                        ))}
                            {template.required_documents.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{template.required_documents.length - 3} more
                              </Badge>
                            )}
                      </div>
                    </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTemplate(template)
                            setShowTemplateDialog(true)
                          }}
                          className="border-slate-600"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTemplate(template)
                            setTemplateFormData(template)
                            setShowTemplateDialog(true)
                          }}
                          className="border-slate-600"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!template.is_default && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="border-red-600 text-red-400 hover:bg-red-600/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Review Onboarding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Action</Label>
              <Select value={reviewForm.action} onValueChange={(value: "approve" | "reject") => setReviewForm({ ...reviewForm, action: value })}>
                <SelectTrigger className="bg-slate-900/50 border-slate-700/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="approve">Approve</SelectItem>
                  <SelectItem value="reject">Reject</SelectItem>
                </SelectContent>
              </Select>
                </div>

            <div>
              <Label htmlFor="review_notes" className="text-white">Review Notes</Label>
              <Textarea
                id="review_notes"
                value={reviewForm.review_notes}
                onChange={(e) => setReviewForm({ ...reviewForm, review_notes: e.target.value })}
                placeholder="Add notes about your decision..."
                className="bg-slate-900/50 border-slate-700/50 text-white"
                rows={3}
              />
            </div>

            <div className="flex space-x-2">
              <Button 
                onClick={handleReviewCandidate}
                disabled={loading}
                className={`flex-1 ${
                  reviewForm.action === 'approve' 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
                    : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    {reviewForm.action === 'approve' ? <CheckSquare className="h-4 w-4 mr-2" /> : <XSquare className="h-4 w-4 mr-2" />}
                    {reviewForm.action === 'approve' ? 'Approve' : 'Reject'}
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowReviewDialog(false)}
                className="border-slate-600"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Initialize Templates Dialog */}
      <Dialog open={showInitializeTemplatesDialog} onOpenChange={setShowInitializeTemplatesDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Initialize Default Templates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-slate-400">
              This will create comprehensive onboarding templates for common roles including:
            </p>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• General Staff Onboarding</li>
              <li>• Security Staff Onboarding</li>
              <li>• Bar Staff Onboarding</li>
              <li>• Technical Staff Onboarding</li>
              <li>• Management Onboarding</li>
            </ul>
            <p className="text-slate-400 text-sm">
              Each template includes all required fields, documents, and validation rules.
            </p>
            <div className="flex space-x-2">
              <Button 
                onClick={handleInitializeTemplates}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Initializing...
                  </>
                ) : (
                  <>
                  <Sparkles className="h-4 w-4 mr-2" />
                    Initialize Templates
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowInitializeTemplatesDialog(false)}
                className="border-slate-600"
              >
                Cancel
                </Button>
              </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Template Name</Label>
                <Input
                  value={templateFormData.name || ''}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                  placeholder="e.g., Security Staff Onboarding"
                  className="bg-slate-900/50 border-slate-700/50 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Department</Label>
                <Input
                  value={templateFormData.department || ''}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, department: e.target.value })}
                  placeholder="e.g., Security"
                  className="bg-slate-900/50 border-slate-700/50 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-white">Description</Label>
              <Textarea
                value={templateFormData.description || ''}
                onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                placeholder="Describe the template and its purpose..."
                className="bg-slate-900/50 border-slate-700/50 text-white"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Position</Label>
                <Input
                  value={templateFormData.position || ''}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, position: e.target.value })}
                  placeholder="e.g., Security Officer"
                  className="bg-slate-900/50 border-slate-700/50 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Employment Type</Label>
                <Select 
                  value={templateFormData.employment_type || 'full_time'} 
                  onValueChange={(value) => setTemplateFormData({ ...templateFormData, employment_type: value })}
                >
                  <SelectTrigger className="bg-slate-900/50 border-slate-700/50 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Estimated Days</Label>
                <Input
                  type="number"
                  value={templateFormData.estimated_days || ''}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, estimated_days: Number(e.target.value) })}
                  placeholder="3"
                  className="bg-slate-900/50 border-slate-700/50 text-white"
                />
              </div>
              <div>
                <Label className="text-white">Tags</Label>
                <Input
                  value={templateFormData.tags?.join(', ') || ''}
                  onChange={(e) => setTemplateFormData({ 
                    ...templateFormData, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  })}
                  placeholder="security, licensed, background-check"
                  className="bg-slate-900/50 border-slate-700/50 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-white">Required Documents</Label>
              <Textarea
                value={templateFormData.required_documents?.join('\n') || ''}
                onChange={(e) => setTemplateFormData({ 
                  ...templateFormData, 
                  required_documents: e.target.value.split('\n').map(doc => doc.trim()).filter(Boolean)
                })}
                placeholder="Government-issued ID&#10;Social Security Card&#10;Direct Deposit Form"
                className="bg-slate-900/50 border-slate-700/50 text-white"
                rows={4}
              />
            </div>

            {selectedTemplate && (
              <div>
                <Label className="text-white">Template Fields</Label>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <p className="text-slate-400 text-sm mb-2">
                    This template includes {selectedTemplate.fields?.length || 0} fields across multiple sections:
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {(() => {
                      const sectionCounts = selectedTemplate.fields?.reduce((acc: Record<string, number>, field: any) => {
                        if (!acc[field.section]) acc[field.section] = 0
                        acc[field.section]++
                        return acc
                      }, {}) || {}
                      
                      return Object.entries(sectionCounts).map(([section, count]) => (
                        <div key={section} className="flex justify-between">
                          <span className="text-slate-300">{section}</span>
                          <span className="text-slate-400">{count} fields</span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <Button 
                onClick={handleCreateTemplate}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {selectedTemplate ? 'Update Template' : 'Create Template'}
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowTemplateDialog(false)
                  setSelectedTemplate(null)
                  setTemplateFormData({})
                }}
                className="border-slate-600"
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