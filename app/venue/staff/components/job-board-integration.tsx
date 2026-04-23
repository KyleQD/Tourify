"use client"

import { useState } from "react"
import { useCurrentVenue } from "@/hooks/use-venue"
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
import { useToast } from "@/hooks/use-toast"
import OnboardingWizard from "./onboarding-wizard"
import {
  Briefcase,
  Plus,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Users,
  Clock,
  MapPin,
  DollarSign,
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  MessageSquare,
  Phone,
  Mail,
  FileText,
  Download,
  Upload,
  Target,
  TrendingUp,
  UserPlus,
  Building2
} from "lucide-react"

interface JobPosting {
  id: string
  title: string
  department: string
  type: 'full-time' | 'part-time' | 'contract' | 'temporary'
  location: string
  salaryRange: {
    min: number
    max: number
  }
  description: string
  requirements: string[]
  responsibilities: string[]
  benefits: string[]
  status: 'active' | 'paused' | 'closed' | 'draft'
  postedDate: string
  deadline: string
  applicationsCount: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

interface JobApplication {
  id: string
  jobId: string
  applicantName: string
  email: string
  phone: string
  appliedDate: string
  status: 'new' | 'reviewed' | 'interviewed' | 'offered' | 'hired' | 'rejected'
  rating: number
  notes: string
  resumeUrl?: string
  coverLetter?: string
  experience: number
  skills: string[]
  availability: string
}

export default function JobBoardIntegration() {
  const { venue } = useCurrentVenue()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("postings")
  const [showCreateJob, setShowCreateJob] = useState(false)
  const [showApplicationDetail, setShowApplicationDetail] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedApplications, setSelectedApplications] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [showOnboardingIntegration, setShowOnboardingIntegration] = useState(false)
  const [candidateForOnboarding, setCandidateForOnboarding] = useState<JobApplication | null>(null)
  const [sortBy, setSortBy] = useState("appliedDate")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [aiMatchingEnabled, setAiMatchingEnabled] = useState(true)

  // Mock job postings
  const [jobPostings] = useState<JobPosting[]>([
    {
      id: "job-1",
      title: "Senior Sound Engineer",
      department: "Technical",
      type: "full-time",
      location: "Main Venue",
      salaryRange: { min: 65000, max: 85000 },
      description: "Lead sound engineering for major events and concerts",
      requirements: [
        "5+ years live sound experience",
        "Pro Tools certification",
        "Experience with large-scale events",
        "Strong problem-solving skills"
      ],
      responsibilities: [
        "Manage sound systems for events",
        "Train junior engineers",
        "Equipment maintenance and setup",
        "Work with artists and technical riders"
      ],
      benefits: [
        "Health insurance",
        "Retirement plan",
        "Professional development budget",
        "Event tickets"
      ],
      status: "active",
      postedDate: "2024-01-15",
      deadline: "2024-02-15",
      applicationsCount: 12,
      priority: "high"
    },
    {
      id: "job-2",
      title: "Event Security Specialist",
      department: "Security",
      type: "part-time",
      location: "Multiple Venues",
      salaryRange: { min: 25, max: 35 },
      description: "Provide security coverage for various events",
      requirements: [
        "Security license",
        "2+ years event security experience",
        "Excellent communication skills",
        "Physical fitness requirements"
      ],
      responsibilities: [
        "Crowd control and monitoring",
        "Access control and ID checking",
        "Emergency response",
        "Incident reporting"
      ],
      benefits: [
        "Flexible scheduling",
        "Training provided",
        "Event access",
        "Performance bonuses"
      ],
      status: "active",
      postedDate: "2024-01-20",
      deadline: "2024-02-20",
      applicationsCount: 8,
      priority: "medium"
    },
    {
      id: "job-3",
      title: "Venue Operations Assistant",
      department: "Operations",
      type: "full-time",
      location: "Main Office",
      salaryRange: { min: 35000, max: 45000 },
      description: "Support daily venue operations and event coordination",
      requirements: [
        "Bachelor's degree preferred",
        "Event management experience",
        "Strong organizational skills",
        "Proficiency in scheduling software"
      ],
      responsibilities: [
        "Assist with event planning",
        "Coordinate staff schedules",
        "Vendor management",
        "Administrative support"
      ],
      benefits: [
        "Career advancement opportunities",
        "Training and development",
        "Health benefits",
        "Paid time off"
      ],
      status: "draft",
      postedDate: "2024-01-25",
      deadline: "2024-03-01",
      applicationsCount: 0,
      priority: "low"
    }
  ])

  // Mock applications
  const [applications] = useState<JobApplication[]>([
    {
      id: "app-1",
      jobId: "job-1",
      applicantName: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      phone: "(555) 123-4567",
      appliedDate: "2024-01-16",
      status: "interviewed",
      rating: 4.5,
      notes: "Excellent technical skills, great cultural fit",
      experience: 7,
      skills: ["Pro Tools", "Live Sound", "System Design", "Team Leadership"],
      availability: "Immediate"
    },
    {
      id: "app-2",
      jobId: "job-1",
      applicantName: "Mike Chen",
      email: "mike.chen@email.com",
      phone: "(555) 234-5678",
      appliedDate: "2024-01-18",
      status: "reviewed",
      rating: 4.0,
      notes: "Strong background, needs interview",
      experience: 5,
      skills: ["Live Sound", "Mixing", "Equipment Setup"],
      availability: "2 weeks notice"
    },
    {
      id: "app-3",
      jobId: "job-2",
      applicantName: "Emma Wilson",
      email: "emma.wilson@email.com",
      phone: "(555) 345-6789",
      appliedDate: "2024-01-21",
      status: "new",
      rating: 0,
      notes: "",
      experience: 3,
      skills: ["Crowd Control", "Emergency Response", "Communication"],
      availability: "Flexible"
    }
  ])

  const [newJob, setNewJob] = useState<Partial<JobPosting>>({
    title: "",
    department: "",
    type: "full-time",
    location: "",
    salaryRange: { min: 0, max: 0 },
    description: "",
    requirements: [""],
    responsibilities: [""],
    benefits: [""],
    priority: "medium"
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'closed': return 'bg-red-500'
      case 'draft': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      case 'reviewed': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'interviewed': return 'text-purple-400 bg-purple-500/10 border-purple-500/20'
      case 'offered': return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'hired': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'rejected': return 'text-red-400 bg-red-500/10 border-red-500/20'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'low': return 'text-green-400 bg-green-500/10 border-green-500/20'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  const handleCreateJob = () => {
    toast({
      title: "Job Posted",
      description: `"${newJob.title}" has been posted successfully`,
    })
    setShowCreateJob(false)
    setNewJob({
      title: "",
      department: "",
      type: "full-time",
      location: "",
      salaryRange: { min: 0, max: 0 },
      description: "",
      requirements: [""],
      responsibilities: [""],
      benefits: [""],
      priority: "medium"
    })
  }

  const handleApplicationAction = (applicationId: string, action: string) => {
    const application = applications.find(app => app.id === applicationId)
    
    if (action === 'hired' && application) {
      // Start onboarding process
      setCandidateForOnboarding(application)
      setShowOnboardingIntegration(true)
    }
    
    toast({
      title: "Application Updated",
      description: `${application?.applicantName}'s application has been ${action}`,
    })
  }

  const handleBulkAction = (action: string) => {
    if (selectedApplications.length === 0) {
      toast({
        title: "No Applications Selected",
        description: "Please select applications to perform bulk actions",
        variant: "destructive"
      })
      return
    }

    let actionDescription = ""
    switch (action) {
      case "interview":
        actionDescription = "scheduled for interviews"
        break
      case "reject":
        actionDescription = "rejected"
        break
      case "review":
        actionDescription = "marked for review"
        break
      case "hire":
        actionDescription = "hired"
        break
      default:
        actionDescription = "updated"
    }

    toast({
      title: "Bulk Action Complete",
      description: `${selectedApplications.length} applications ${actionDescription}`,
    })

    setSelectedApplications([])
    setShowBulkActions(false)
  }

  const toggleApplicationSelection = (applicationId: string) => {
    setSelectedApplications(prev => 
      prev.includes(applicationId) 
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedApplications.length === applications.length) {
      setSelectedApplications([])
    } else {
      setSelectedApplications(applications.map(app => app.id))
    }
  }

  const calculateAIMatchScore = (application: JobApplication, job: JobPosting): number => {
    if (!job) return 0
    
    // Simple AI matching algorithm based on skills and experience
    const skillMatches = application.skills.filter(skill => 
      job.requirements.some(req => req.toLowerCase().includes(skill.toLowerCase()))
    ).length
    
    const skillScore = (skillMatches / job.requirements.length) * 40
    const experienceScore = Math.min((application.experience / 5) * 30, 30) // Cap at 30 points
    const availabilityScore = application.availability === "Immediate" ? 20 : 10
    const ratingScore = application.rating * 2 // 0-10 scale
    
    return Math.round(skillScore + experienceScore + availabilityScore + ratingScore)
  }

  const getSortedAndFilteredApplications = () => {
    let filtered = applications.filter(app => {
      const matchesStatus = filterStatus === "all" || app.status === filterStatus
      const matchesSearch = searchQuery === "" || 
        app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.email.toLowerCase().includes(searchQuery.toLowerCase())
      
      return matchesStatus && matchesSearch
    })

    // Sort applications
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case "appliedDate":
          comparison = new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime()
          break
        case "name":
          comparison = a.applicantName.localeCompare(b.applicantName)
          break
        case "rating":
          comparison = a.rating - b.rating
          break
        case "experience":
          comparison = a.experience - b.experience
          break
        case "aiMatch":
          const jobA = jobPostings.find(j => j.id === a.jobId)
          const jobB = jobPostings.find(j => j.id === b.jobId)
          const scoreA = jobA ? calculateAIMatchScore(a, jobA) : 0
          const scoreB = jobB ? calculateAIMatchScore(b, jobB) : 0
          comparison = scoreA - scoreB
          break
        default:
          comparison = 0
      }
      
      return sortOrder === "desc" ? -comparison : comparison
    })

    return filtered
  }

  const addArrayItem = (field: 'requirements' | 'responsibilities' | 'benefits') => {
    setNewJob({
      ...newJob,
      [field]: [...(newJob[field] || []), ""]
    })
  }

  const updateArrayItem = (field: 'requirements' | 'responsibilities' | 'benefits', index: number, value: string) => {
    const items = [...(newJob[field] || [])]
    items[index] = value
    setNewJob({
      ...newJob,
      [field]: items
    })
  }

  const removeArrayItem = (field: 'requirements' | 'responsibilities' | 'benefits', index: number) => {
    const items = [...(newJob[field] || [])]
    items.splice(index, 1)
    setNewJob({
      ...newJob,
      [field]: items
    })
  }

  const stats = {
    totalJobs: jobPostings.length,
    activeJobs: jobPostings.filter(j => j.status === 'active').length,
    totalApplications: applications.length,
    pendingReviews: applications.filter(a => a.status === 'new').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            Job Board Integration
          </h1>
          <p className="text-slate-400 mt-1">Manage job postings, applications, and hiring pipeline</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="bg-slate-800/50 border-slate-600">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button onClick={() => setShowCreateJob(true)} className="bg-gradient-to-r from-green-500 to-blue-600">
            <Plus className="h-4 w-4 mr-2" />
            Post New Job
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: "Total Jobs", 
            value: stats.totalJobs, 
            icon: Briefcase, 
            color: "from-blue-500 to-cyan-500" 
          },
          { 
            label: "Active Postings", 
            value: stats.activeJobs, 
            icon: CheckCircle, 
            color: "from-green-500 to-emerald-500" 
          },
          { 
            label: "Applications", 
            value: stats.totalApplications, 
            icon: Users, 
            color: "from-purple-500 to-pink-500" 
          },
          { 
            label: "Pending Reviews", 
            value: stats.pendingReviews, 
            icon: AlertCircle, 
            color: "from-orange-500 to-red-500" 
          }
        ].map((stat, i) => (
          <Card key={i} className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 grid w-full grid-cols-4">
          <TabsTrigger value="postings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-blue-600">
            <Briefcase className="h-4 w-4 mr-2" />
            Job Postings
          </TabsTrigger>
          <TabsTrigger value="applications" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-blue-600">
            <Users className="h-4 w-4 mr-2" />
            Applications
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-blue-600">
            <Target className="h-4 w-4 mr-2" />
            Hiring Pipeline
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-blue-600">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Job Postings Tab */}
        <TabsContent value="postings" className="space-y-6">
          {/* Search and Filters */}
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-700/50 border-slate-600"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
                <Select>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="border-slate-600 bg-slate-700/50 hover:bg-slate-700">
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Job Postings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {jobPostings.map((job) => (
              <Card key={job.id} className="bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 transition-all">
                <CardContent className="p-6">
                  {/* Job Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-white font-semibold text-lg">{job.title}</h3>
                      <p className="text-slate-400 text-sm">{job.department} • {job.type}</p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline" className={getPriorityColor(job.priority)}>
                          {job.priority} priority
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`}></div>
                          <span className="text-xs text-slate-400 capitalize">{job.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">
                        ${job.salaryRange.min.toLocaleString()}-${job.salaryRange.max.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400">
                        {job.type === 'full-time' || job.type === 'part-time' ? 'Annual' : 'Hourly'}
                      </div>
                    </div>
                  </div>

                  {/* Job Details */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <MapPin className="h-4 w-4 text-blue-400" />
                      <span className="text-slate-300">{job.location}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Calendar className="h-4 w-4 text-purple-400" />
                      <span className="text-slate-300">Deadline: {job.deadline}</span>
                    </div>
                    <p className="text-slate-300 text-sm line-clamp-2">{job.description}</p>
                  </div>

                  {/* Applications Count */}
                  <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-cyan-400" />
                        <span className="text-white font-medium">{job.applicationsCount} Applications</span>
                      </div>
                      <Button size="sm" variant="outline" className="border-slate-600 text-xs">
                        View Applications
                      </Button>
                    </div>
                  </div>

                  {/* Key Requirements Preview */}
                  <div className="mb-4">
                    <div className="text-xs text-slate-400 mb-2">Key Requirements</div>
                    <div className="space-y-1">
                      {job.requirements.slice(0, 2).map((req, i) => (
                        <div key={i} className="text-xs text-slate-300 flex items-start space-x-2">
                          <div className="w-1 h-1 bg-green-400 rounded-full mt-1.5 flex-shrink-0"></div>
                          <span className="line-clamp-1">{req}</span>
                        </div>
                      ))}
                      {job.requirements.length > 2 && (
                        <div className="text-xs text-slate-400">+{job.requirements.length - 2} more requirements</div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50 text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex space-x-2">
                      {job.status === 'draft' && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Publish
                        </Button>
                      )}
                      {job.status === 'active' && (
                        <Button size="sm" variant="outline" className="border-slate-600">
                          <AlertCircle className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-6">
          {/* Enhanced Search and Controls */}
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search applications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-700/50 border-slate-600"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="interviewed">Interviewed</SelectItem>
                    <SelectItem value="offered">Offered</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="appliedDate">Applied Date</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                    <SelectItem value="experience">Experience</SelectItem>
                    <SelectItem value="aiMatch">AI Match Score</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as "asc" | "desc")}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  className="border-slate-600"
                  onClick={() => setShowBulkActions(!showBulkActions)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Actions
                </Button>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="aiMatching"
                      checked={aiMatchingEnabled}
                      onChange={(e) => setAiMatchingEnabled(e.target.checked)}
                      className="rounded border-slate-600"
                    />
                    <Label htmlFor="aiMatching" className="text-sm text-slate-300">AI Matching</Label>
                  </div>
                </div>
              </div>

              {/* Bulk Actions Bar */}
              {showBulkActions && (
                <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                  <div className="flex items-center space-x-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={toggleSelectAll}
                      className="border-slate-600"
                    >
                      {selectedApplications.length === applications.length ? "Deselect All" : "Select All"}
                    </Button>
                    <span className="text-slate-300 text-sm">
                      {selectedApplications.length} application(s) selected
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => handleBulkAction("review")} className="bg-yellow-600 hover:bg-yellow-700">
                      Mark for Review
                    </Button>
                    <Button size="sm" onClick={() => handleBulkAction("interview")} className="bg-purple-600 hover:bg-purple-700">
                      Schedule Interviews
                    </Button>
                    <Button size="sm" onClick={() => handleBulkAction("reject")} variant="outline" className="border-red-600 text-red-400">
                      Reject
                    </Button>
                    <Button size="sm" onClick={() => handleBulkAction("hire")} className="bg-green-600 hover:bg-green-700">
                      Hire Selected
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Applications List */}
          <div className="grid grid-cols-1 gap-4">
            {getSortedAndFilteredApplications().map((application) => {
              const job = jobPostings.find(j => j.id === application.jobId)
              const aiMatchScore = job && aiMatchingEnabled ? calculateAIMatchScore(application, job) : 0
              const isSelected = selectedApplications.includes(application.id)
              
              return (
                <Card key={application.id} className={`bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 transition-all ${
                  isSelected ? 'ring-2 ring-blue-500/50 bg-blue-500/5' : ''
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {showBulkActions && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleApplicationSelection(application.id)}
                            className="rounded border-slate-600"
                          />
                        )}
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-gradient-to-r from-green-500 to-blue-600 text-white">
                            {application.applicantName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-white font-semibold">{application.applicantName}</h3>
                          <p className="text-slate-400 text-sm">Applied for: {job?.title}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className={getApplicationStatusColor(application.status)}>
                              {application.status}
                            </Badge>
                            <span className="text-xs text-slate-400">Applied {application.appliedDate}</span>
                            {aiMatchingEnabled && job && (
                              <Badge variant="outline" className={`text-xs ${
                                aiMatchScore >= 80 ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                                aiMatchScore >= 60 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                                'text-red-400 bg-red-500/10 border-red-500/20'
                              }`}>
                                AI Match: {aiMatchScore}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(application.rating) 
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : 'text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">{application.experience} years exp</div>
                          <div className="text-xs text-slate-500">{application.availability}</div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-slate-600"
                            onClick={() => {
                              setSelectedApplication(application)
                              setShowApplicationDetail(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleApplicationAction(application.id, 'hired')}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Hire
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Skills Preview */}
                    <div className="mt-4 pt-4 border-t border-slate-700/50">
                      <div className="flex flex-wrap gap-2">
                        {application.skills.slice(0, 4).map((skill, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-blue-500/20 border-blue-500/30 text-blue-400">
                            {skill}
                          </Badge>
                        ))}
                        {application.skills.length > 4 && (
                          <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600 text-slate-400">
                            +{application.skills.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Hiring Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-6">
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-orange-400">Hiring Pipeline Overview</CardTitle>
              <CardDescription>Track applications through the hiring process</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
                {[
                  { stage: 'New', count: applications.filter(a => a.status === 'new').length, color: 'bg-blue-500', icon: AlertCircle },
                  { stage: 'Reviewed', count: applications.filter(a => a.status === 'reviewed').length, color: 'bg-yellow-500', icon: Eye },
                  { stage: 'Interviewed', count: applications.filter(a => a.status === 'interviewed').length, color: 'bg-purple-500', icon: MessageSquare },
                  { stage: 'Offered', count: applications.filter(a => a.status === 'offered').length, color: 'bg-green-500', icon: CheckCircle },
                  { stage: 'Hired', count: applications.filter(a => a.status === 'hired').length, color: 'bg-emerald-500', icon: UserPlus },
                  { stage: 'Rejected', count: applications.filter(a => a.status === 'rejected').length, color: 'bg-red-500', icon: XCircle }
                ].map((stage, i) => (
                  <div key={i} className="text-center p-4 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer">
                    <div className={`w-16 h-16 ${stage.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                      <span className="text-white font-bold text-xl">{stage.count}</span>
                    </div>
                    <div className="text-white font-medium">{stage.stage}</div>
                    <div className="text-slate-400 text-xs">Applications</div>
                    <div className="mt-2">
                      <stage.icon className="h-4 w-4 text-slate-400 mx-auto" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Pipeline Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <div className="text-lg font-bold text-green-400">
                    {Math.round((applications.filter(a => a.status === 'hired').length / applications.length) * 100)}%
                  </div>
                  <div className="text-slate-400 text-sm">Conversion Rate</div>
                  <div className="text-xs text-slate-500 mt-1">Applications to Hires</div>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <div className="text-lg font-bold text-blue-400">
                    {Math.round(applications.reduce((acc, app) => acc + (new Date().getTime() - new Date(app.appliedDate).getTime()), 0) / applications.length / (1000 * 60 * 60 * 24))} days
                  </div>
                  <div className="text-slate-400 text-sm">Avg. Time to Process</div>
                  <div className="text-xs text-slate-500 mt-1">From application to decision</div>
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg">
                  <div className="text-lg font-bold text-purple-400">
                    {applications.filter(a => a.rating >= 4).length}
                  </div>
                  <div className="text-slate-400 text-sm">High-Quality Candidates</div>
                  <div className="text-xs text-slate-500 mt-1">Rating 4+ stars</div>
                </div>
              </div>

              {/* Recent Pipeline Activity */}
              <div>
                <h4 className="text-white font-medium mb-4">Recent Pipeline Activity</h4>
                <div className="space-y-3">
                  {[
                    { candidate: "Sarah Johnson", action: "Moved to Interviewed", time: "2 hours ago", type: "progress" },
                    { candidate: "Mike Chen", action: "Application Reviewed", time: "4 hours ago", type: "review" },
                    { candidate: "Emma Wilson", action: "New Application Received", time: "6 hours ago", type: "new" },
                    { candidate: "James Liu", action: "Offer Extended", time: "1 day ago", type: "offer" }
                  ].map((activity, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-700/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'progress' ? 'bg-blue-400' :
                          activity.type === 'review' ? 'bg-yellow-400' :
                          activity.type === 'new' ? 'bg-green-400' :
                          'bg-purple-400'
                        }`}></div>
                        <div>
                          <div className="text-white text-sm font-medium">{activity.candidate}</div>
                          <div className="text-slate-400 text-xs">{activity.action}</div>
                        </div>
                      </div>
                      <div className="text-slate-500 text-xs">{activity.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pipeline by Job Position */}
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-cyan-400">Pipeline by Position</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobPostings.filter(job => job.status === 'active').map((job) => {
                  const jobApplications = applications.filter(app => app.jobId === job.id)
                  const totalApps = jobApplications.length
                  
                  return (
                    <div key={job.id} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-white font-medium">{job.title}</h4>
                          <p className="text-slate-400 text-sm">{job.department} • {totalApps} applications</p>
                        </div>
                        <Badge variant="outline" className={getPriorityColor(job.priority)}>
                          {job.priority} priority
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-6 gap-2">
                        {['new', 'reviewed', 'interviewed', 'offered', 'hired', 'rejected'].map((status) => {
                          const count = jobApplications.filter(app => app.status === status).length
                          const percentage = totalApps > 0 ? (count / totalApps) * 100 : 0
                          
                          return (
                            <div key={status} className="text-center">
                              <div className={`h-20 rounded ${
                                status === 'new' ? 'bg-blue-500' :
                                status === 'reviewed' ? 'bg-yellow-500' :
                                status === 'interviewed' ? 'bg-purple-500' :
                                status === 'offered' ? 'bg-green-500' :
                                status === 'hired' ? 'bg-emerald-500' :
                                'bg-red-500'
                              } flex items-center justify-center`}>
                                <span className="text-white font-bold">{count}</span>
                              </div>
                              <div className="text-xs text-slate-400 mt-1 capitalize">{status}</div>
                              <div className="text-xs text-slate-500">{percentage.toFixed(0)}%</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Time to Hire</p>
                    <p className="text-2xl font-bold text-green-400">12.5 days</p>
                    <p className="text-green-400 text-xs">↓ 2.3 days vs last month</p>
                  </div>
                  <Clock className="h-8 w-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Cost per Hire</p>
                    <p className="text-2xl font-bold text-blue-400">$1,240</p>
                    <p className="text-blue-400 text-xs">↓ $180 vs last month</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Quality Score</p>
                    <p className="text-2xl font-bold text-purple-400">4.2/5</p>
                    <p className="text-purple-400 text-xs">↑ 0.3 vs last month</p>
                  </div>
                  <Star className="h-8 w-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Application Rate</p>
                    <p className="text-2xl font-bold text-orange-400">3.8/day</p>
                    <p className="text-orange-400 text-xs">↑ 1.2 vs last month</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Performance */}
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-cyan-400">Hiring Performance by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Technical', 'Security', 'Operations', 'Service'].map((dept) => {
                  const deptJobs = jobPostings.filter(job => job.department === dept)
                  const deptApps = applications.filter(app => {
                    const job = jobPostings.find(j => j.id === app.jobId)
                    return job?.department === dept
                  })
                  const hiredCount = deptApps.filter(app => app.status === 'hired').length
                  const conversionRate = deptApps.length > 0 ? (hiredCount / deptApps.length) * 100 : 0
                  
                  return (
                    <div key={dept} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <h4 className="text-white font-medium">{dept}</h4>
                          <p className="text-slate-400 text-sm">{deptJobs.length} active positions</p>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-400">{deptApps.length}</div>
                          <div className="text-slate-400 text-xs">Applications</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-400">{hiredCount}</div>
                          <div className="text-slate-400 text-xs">Hired</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-400">{conversionRate.toFixed(1)}%</div>
                          <div className="text-slate-400 text-xs">Conversion</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* AI Matching Performance */}
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-purple-400">AI Matching Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <div className="text-lg font-bold text-purple-400">
                    {applications.filter(app => {
                      const job = jobPostings.find(j => j.id === app.jobId)
                      return job && calculateAIMatchScore(app, job) >= 80
                    }).length}
                  </div>
                  <div className="text-slate-400 text-sm">High Match Candidates</div>
                  <div className="text-xs text-slate-500 mt-1">80%+ AI match score</div>
                </div>
                
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="text-lg font-bold text-blue-400">
                    {applications.filter(app => app.status === 'hired').length > 0 
                      ? Math.round(applications.filter(app => {
                          const job = jobPostings.find(j => j.id === app.jobId)
                          return job && calculateAIMatchScore(app, job) >= 70 && app.status === 'hired'
                        }).length / applications.filter(app => app.status === 'hired').length * 100)
                      : 0}%
                  </div>
                  <div className="text-slate-400 text-sm">AI Accuracy Rate</div>
                  <div className="text-xs text-slate-500 mt-1">Hired candidates with 70%+ match</div>
                </div>
                
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div className="text-lg font-bold text-green-400">
                    {applications.length > 0 ? Math.round(applications.reduce((acc, app) => {
                      const job = jobPostings.find(j => j.id === app.jobId)
                      return acc + (job ? calculateAIMatchScore(app, job) : 0)
                    }, 0) / applications.length) : 0}%
                  </div>
                  <div className="text-slate-400 text-sm">Avg Match Score</div>
                  <div className="text-xs text-slate-500 mt-1">Across all applications</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Skills in Demand */}
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-yellow-400">Skills in Demand</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { skill: "Live Sound", count: 8, trend: "up" },
                  { skill: "Pro Tools", count: 6, trend: "up" },
                  { skill: "Security License", count: 5, trend: "stable" },
                  { skill: "Event Management", count: 4, trend: "down" },
                  { skill: "Crowd Control", count: 4, trend: "up" },
                  { skill: "Mixing", count: 3, trend: "stable" },
                  { skill: "Team Leadership", count: 3, trend: "up" },
                  { skill: "Emergency Response", count: 2, trend: "stable" }
                ].map((item, i) => (
                  <div key={i} className="p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium text-sm">{item.skill}</span>
                      <div className={`w-2 h-2 rounded-full ${
                        item.trend === 'up' ? 'bg-green-400' :
                        item.trend === 'down' ? 'bg-red-400' : 'bg-yellow-400'
                      }`}></div>
                    </div>
                    <div className="text-slate-400 text-xs">{item.count} requirements</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Job Dialog */}
      <Dialog open={showCreateJob} onOpenChange={setShowCreateJob}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-green-400">Create New Job Posting</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="job-title">Job Title</Label>
                <Input
                  id="job-title"
                  value={newJob.title}
                  onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select value={newJob.department} onValueChange={(value) => setNewJob({ ...newJob, department: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="Technical">Technical</SelectItem>
                    <SelectItem value="Security">Security</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="job-type">Job Type</Label>
                <Select value={newJob.type} onValueChange={(value) => setNewJob({ ...newJob, type: value as any })}>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="temporary">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={newJob.location}
                  onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newJob.priority} onValueChange={(value) => setNewJob({ ...newJob, priority: value as any })}>
                  <SelectTrigger className="bg-slate-800 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-salary">Min Salary</Label>
                <Input
                  id="min-salary"
                  type="number"
                  value={newJob.salaryRange?.min || ''}
                  onChange={(e) => setNewJob({ 
                    ...newJob, 
                    salaryRange: { ...newJob.salaryRange!, min: parseInt(e.target.value) || 0 }
                  })}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="max-salary">Max Salary</Label>
                <Input
                  id="max-salary"
                  type="number"
                  value={newJob.salaryRange?.max || ''}
                  onChange={(e) => setNewJob({ 
                    ...newJob, 
                    salaryRange: { ...newJob.salaryRange!, max: parseInt(e.target.value) || 0 }
                  })}
                  className="bg-slate-800 border-slate-600"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Job Description</Label>
              <Textarea
                id="description"
                value={newJob.description}
                onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                className="bg-slate-800 border-slate-600"
                rows={4}
              />
            </div>

            {/* Dynamic Arrays */}
            {['requirements', 'responsibilities', 'benefits'].map((field) => (
              <div key={field}>
                <div className="flex items-center justify-between mb-3">
                  <Label className="capitalize">{field}</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => addArrayItem(field as any)}
                    className="border-slate-600"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add {field.slice(0, -1)}
                  </Button>
                </div>
                <div className="space-y-2">
                  {(newJob[field as keyof typeof newJob] as string[] || [""]).map((item, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={item}
                        onChange={(e) => updateArrayItem(field as any, index, e.target.value)}
                        placeholder={`${field.slice(0, -1)} ${index + 1}`}
                        className="bg-slate-800 border-slate-600"
                      />
                      {(newJob[field as keyof typeof newJob] as string[])?.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArrayItem(field as any, index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={() => setShowCreateJob(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateJob} className="bg-green-600 hover:bg-green-700">
                Create Job Posting
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Application Detail Dialog */}
      <Dialog open={showApplicationDetail} onOpenChange={setShowApplicationDetail}>
        <DialogContent className="max-w-3xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-blue-400">Application Review</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-6">
              {/* Applicant Info */}
              <div className="flex items-start space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-gradient-to-r from-green-500 to-blue-600 text-white">
                    {selectedApplication.applicantName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white">{selectedApplication.applicantName}</h3>
                  <div className="text-slate-400 space-y-1">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4" />
                      <span>{selectedApplication.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4" />
                      <span>{selectedApplication.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>Applied {selectedApplication.appliedDate}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-1 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(selectedApplication.rating) 
                            ? 'fill-yellow-400 text-yellow-400' 
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <Badge variant="outline" className={getApplicationStatusColor(selectedApplication.status)}>
                    {selectedApplication.status}
                  </Badge>
                </div>
              </div>

              {/* Skills and Experience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-white font-medium mb-3">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplication.skills.map((skill, i) => (
                      <Badge key={i} variant="outline" className="bg-blue-500/20 border-blue-500/30 text-blue-400">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-3">Experience</h4>
                  <p className="text-slate-300">{selectedApplication.experience} years</p>
                  <p className="text-slate-400 text-sm mt-1">Availability: {selectedApplication.availability}</p>
                </div>
              </div>

              {/* Notes */}
              {selectedApplication.notes && (
                <div>
                  <h4 className="text-white font-medium mb-3">Notes</h4>
                  <p className="text-slate-300 bg-slate-800/50 p-3 rounded-lg">{selectedApplication.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" className="border-slate-600">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Message
                  </Button>
                  <Button size="sm" variant="outline" className="border-slate-600">
                    <Calendar className="h-4 w-4 mr-1" />
                    Schedule Interview
                  </Button>
                  <Button size="sm" variant="outline" className="border-slate-600">
                    <FileText className="h-4 w-4 mr-1" />
                    View Resume
                  </Button>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-red-600 text-red-400"
                    onClick={() => handleApplicationAction(selectedApplication.id, 'rejected')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleApplicationAction(selectedApplication.id, 'hired')}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Hire
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Onboarding Integration */}
      {candidateForOnboarding && (
        <OnboardingWizard
          candidate={{
            id: candidateForOnboarding.id,
            name: candidateForOnboarding.applicantName,
            email: candidateForOnboarding.email,
            position: jobPostings.find(j => j.id === candidateForOnboarding.jobId)?.title || "New Position",
            department: jobPostings.find(j => j.id === candidateForOnboarding.jobId)?.department || "Unknown",
            startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 week from now
          }}
          venueId={venue?.id}
          isOpen={showOnboardingIntegration}
          onClose={() => {
            setShowOnboardingIntegration(false)
            setCandidateForOnboarding(null)
          }}
        />
      )}
    </div>
  )
} 