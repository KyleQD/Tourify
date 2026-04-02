"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
import { formatSafeCurrency } from "@/lib/format/number-format"
import {
  Plus,
  Search,
  Briefcase,
  Users,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  Eye,
  CheckCircle,
  Star,
  UserPlus,
  MessageSquare,
  Building2
} from "lucide-react"

interface JobPosting {
  id: string
  title: string
  description: string
  department: string
  location: string
  employmentType: 'full_time' | 'part_time' | 'contract' | 'freelance'
  salaryRange: {
    min: number
    max: number
    type: 'hourly' | 'salary' | 'daily'
  }
  requirements: string[]
  status: 'draft' | 'published' | 'paused' | 'closed'
  applications: number
  postedDate: string
  urgent: boolean
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive'
  skills: string[]
}

interface JobApplication {
  id: string
  jobId: string
  applicantName: string
  applicantEmail: string
  applicantPhone: string
  coverLetter: string
  skills: string[]
  experience: string
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired'
  appliedDate: string
  rating?: number
}

export default function StaffJobBoardIntegration() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("postings")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Mock data for job postings
  const [jobPostings] = useState<JobPosting[]>([
    {
      id: "job-1",
      title: "Senior Sound Engineer",
      description: "We're looking for an experienced sound engineer to join our technical team.",
      department: "Technical",
      location: "Los Angeles, CA",
      employmentType: "full_time",
      salaryRange: { min: 65000, max: 85000, type: "salary" },
      requirements: ["5+ years experience", "Pro Tools proficiency", "Live sound experience"],
      status: "published",
      applications: 12,
      postedDate: "2024-01-15",
      urgent: false,
      experienceLevel: "senior",
      skills: ["Pro Tools", "Live Sound", "Mixing", "RF Systems"]
    },
    {
      id: "job-2",
      title: "Event Security Coordinator",
      description: "Join our security team to help ensure safe and enjoyable events for all attendees.",
      department: "Security",
      location: "Los Angeles, CA",
      employmentType: "full_time",
      salaryRange: { min: 50000, max: 65000, type: "salary" },
      requirements: ["Security license", "3+ years experience", "Leadership skills"],
      status: "published",
      applications: 8,
      postedDate: "2024-01-18",
      urgent: true,
      experienceLevel: "mid",
      skills: ["Security Operations", "Crowd Control", "Emergency Response"]
    }
  ])

  // Mock data for applications
  const [applications, setApplications] = useState<JobApplication[]>([
    {
      id: "app-1",
      jobId: "job-1",
      applicantName: "Sarah Johnson",
      applicantEmail: "sarah.johnson@email.com",
      applicantPhone: "(555) 123-4567",
      coverLetter: "I am excited to apply for the Senior Sound Engineer position...",
      skills: ["Pro Tools", "Live Sound", "Mixing", "Audio Engineering"],
      experience: "7 years",
      status: "shortlisted",
      appliedDate: "2024-01-16",
      rating: 4.5
    },
    {
      id: "app-2",
      jobId: "job-2",
      applicantName: "Alex Rodriguez",
      applicantEmail: "alex.rodriguez@email.com",
      applicantPhone: "(555) 345-6789",
      coverLetter: "With my background in law enforcement and event security...",
      skills: ["Security Operations", "Crowd Control", "Leadership"],
      experience: "4 years",
      status: "pending",
      appliedDate: "2024-01-19"
    }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500'
      case 'draft': return 'bg-gray-500'
      case 'paused': return 'bg-yellow-500'
      case 'closed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'hired': return 'bg-green-500'
      case 'shortlisted': return 'bg-blue-500'
      case 'reviewed': return 'bg-yellow-500'
      case 'pending': return 'bg-gray-500'
      case 'rejected': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const handleApplicationStatusUpdate = (applicationId: string, newStatus: string) => {
    setApplications(prev => prev.map(app => 
      app.id === applicationId ? { ...app, status: newStatus as any } : app
    ))
    
    toast({
      title: "Application Updated",
      description: `Application status updated to ${newStatus}`,
    })
  }

  const handleHireApplicant = (application: JobApplication) => {
    handleApplicationStatusUpdate(application.id, 'hired')
    
    toast({
      title: "Candidate Hired",
      description: `${application.applicantName} has been hired. Starting onboarding process...`,
    })
  }

  const filteredJobs = jobPostings.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.department.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            Job Board Integration
          </h1>
          <p className="text-slate-400 mt-1">Post jobs, manage applications, and hire talent seamlessly</p>
        </div>
        <Button className="bg-gradient-to-r from-green-500 to-blue-600">
          <Plus className="h-4 w-4 mr-2" />
          Create Job Posting
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: "Active Jobs", 
            value: jobPostings.filter(j => j.status === 'published').length, 
            icon: Briefcase, 
            color: "from-green-500 to-emerald-500" 
          },
          { 
            label: "Total Applications", 
            value: applications.length, 
            icon: Users, 
            color: "from-blue-500 to-cyan-500" 
          },
          { 
            label: "Pending Review", 
            value: applications.filter(a => a.status === 'pending').length, 
            icon: Clock, 
            color: "from-yellow-500 to-orange-500" 
          },
          { 
            label: "Hired This Month", 
            value: applications.filter(a => a.status === 'hired').length, 
            icon: CheckCircle, 
            color: "from-purple-500 to-pink-500" 
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
        <TabsList className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50">
          <TabsTrigger value="postings">Job Postings</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="pipeline">Hiring Pipeline</TabsTrigger>
        </TabsList>

        {/* Job Postings Tab */}
        <TabsContent value="postings" className="space-y-4">
          {/* Search and Filters */}
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-700/50 border-slate-600"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Job Listings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 transition-all">
                <CardContent className="p-6">
                  {/* Job Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-white font-semibold text-lg">{job.title}</h3>
                        {job.urgent && (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-slate-400 mb-2">
                        <div className="flex items-center space-x-1">
                          <Building2 className="h-4 w-4" />
                          <span>{job.department}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span className="capitalize">{job.employmentType.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                          {job.experienceLevel}
                        </Badge>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`}></div>
                        <span className="text-xs text-slate-400 capitalize">{job.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Salary */}
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 text-green-400">
                      <DollarSign className="h-4 w-4" />
                      <span className="font-semibold">
                        {formatSafeCurrency(job.salaryRange.min)} - {formatSafeCurrency(job.salaryRange.max)}
                        <span className="text-slate-400 ml-1">/ {job.salaryRange.type}</span>
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-slate-300 text-sm mb-4 line-clamp-3">
                    {job.description}
                  </p>

                  {/* Skills */}
                  <div className="mb-4">
                    <div className="text-xs text-slate-400 mb-2">Required Skills</div>
                    <div className="flex flex-wrap gap-1">
                      {job.skills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="outline" className="text-xs bg-blue-500/20 border-blue-500/30 text-blue-400">
                          {skill}
                        </Badge>
                      ))}
                      {job.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600 text-slate-400">
                          +{job.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Applications & Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{job.applications} applications</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Posted {formatSafeDate(job.postedDate)}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        View Applications
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-green-400">Recent Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {applications.map((application) => {
                  const job = jobPostings.find(j => j.id === application.jobId)
                  
                  return (
                    <div key={application.id} className="p-4 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-r from-green-500 to-blue-600 text-white">
                              {application.applicantName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="text-white font-semibold">{application.applicantName}</h4>
                            <p className="text-slate-400 text-sm">Applied for: {job?.title}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                                {application.experience} experience
                              </Badge>
                              <div className={`w-2 h-2 rounded-full ${getApplicationStatusColor(application.status)}`}></div>
                              <span className="text-xs text-slate-400 capitalize">{application.status}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {application.rating && (
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 text-yellow-400 fill-current" />
                              <span className="text-sm text-white">{application.rating}</span>
                            </div>
                          )}
                          <Select
                            value={application.status}
                            onValueChange={(value) => handleApplicationStatusUpdate(application.id, value)}
                          >
                            <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="reviewed">Reviewed</SelectItem>
                              <SelectItem value="shortlisted">Shortlisted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="hired">Hired</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Skills */}
                      <div className="mb-3">
                        <div className="text-xs text-slate-400 mb-1">Skills</div>
                        <div className="flex flex-wrap gap-1">
                          {application.skills.map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-green-500/20 border-green-500/30 text-green-400">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Cover Letter Preview */}
                      <div className="mb-3">
                        <div className="text-xs text-slate-400 mb-1">Cover Letter</div>
                        <p className="text-slate-300 text-sm line-clamp-2">{application.coverLetter}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" className="border-slate-600 text-xs">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Message
                        </Button>
                        <Button size="sm" variant="outline" className="border-slate-600 text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          Schedule Interview
                        </Button>
                        {application.status === 'shortlisted' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleHireApplicant(application)}
                            className="bg-green-600 hover:bg-green-700 text-xs"
                          >
                            <UserPlus className="h-3 w-3 mr-1" />
                            Hire & Onboard
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hiring Pipeline Tab */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {['pending', 'reviewed', 'shortlisted', 'hired', 'rejected'].map((status) => (
              <Card key={status} className="bg-slate-800/30 border-slate-700/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm capitalize flex items-center justify-between">
                    {status}
                    <Badge variant="outline" className="text-xs">
                      {applications.filter(a => a.status === status).length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {applications
                    .filter(a => a.status === status)
                    .slice(0, 3)
                    .map((application) => (
                    <div key={application.id} className="p-2 bg-slate-700/30 rounded text-xs">
                      <div className="font-medium text-white">{application.applicantName}</div>
                      <div className="text-slate-400">
                        {jobPostings.find(j => j.id === application.jobId)?.title}
                      </div>
                    </div>
                  ))}
                  {applications.filter(a => a.status === status).length > 3 && (
                    <div className="text-xs text-slate-400 text-center py-1">
                      +{applications.filter(a => a.status === status).length - 3} more
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 