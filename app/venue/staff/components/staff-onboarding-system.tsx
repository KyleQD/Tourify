"use client"

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
import { formatSafeDate } from "@/lib/events/admin-event-normalization"
// import OnboardingWizard from "./onboarding-wizard"
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
  Building2,
  MapPin,
  DollarSign,
  Settings,
  Eye,
  Edit,
  Trash2
} from "lucide-react"

interface OnboardingCandidate {
  id: string
  name: string
  email: string
  phone: string
  position: string
  department: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  stage: 'application' | 'interview' | 'background_check' | 'documentation' | 'training' | 'completed'
  applicationDate: string
  avatar?: string
  resume?: string
  experience: string
  skills: string[]
  references: any[]
  documents: any[]
  notes: string
  assignedManager?: string
  startDate?: string
  salary?: number
  employmentType: 'full_time' | 'part_time' | 'contractor' | 'volunteer'
}

interface OnboardingTemplate {
  id: string
  name: string
  department: string
  position: string
  steps: OnboardingStep[]
  estimatedDays: number
  requiredDocuments: string[]
}

interface OnboardingStep {
  id: string
  title: string
  description: string
  type: 'document' | 'training' | 'meeting' | 'setup' | 'review'
  required: boolean
  estimatedHours: number
  assignedTo?: string
  dueDate?: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  notes?: string
}

interface StaffOnboardingSystemProps {
  venueId: string
}

export default function StaffOnboardingSystem({ venueId }: StaffOnboardingSystemProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("candidates")
  const [selectedCandidate, setSelectedCandidate] = useState<OnboardingCandidate | null>(null)
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false)

  // Mock data for candidates
  const [candidates, setCandidates] = useState<OnboardingCandidate[]>([
    {
      id: "cand-1",
      name: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      phone: "(555) 123-4567",
      position: "Sound Engineer",
      department: "Technical",
      status: "in_progress",
      stage: "training",
      applicationDate: "2024-01-15",
      avatar: "/placeholder.svg",
      experience: "5 years",
      skills: ["Pro Tools", "Live Sound", "Mixing", "Audio Engineering"],
      references: [],
      documents: [
        { name: "Resume", status: "completed" },
        { name: "Background Check", status: "completed" },
        { name: "Contract", status: "pending" }
      ],
      notes: "Excellent technical skills, previous experience at major venues",
      assignedManager: "Alex Chen",
      startDate: "2024-02-01",
      salary: 75000,
      employmentType: "full_time"
    },
    {
      id: "cand-2",
      name: "Mike Rodriguez",
      email: "mike.rodriguez@email.com",
      phone: "(555) 234-5678",
      position: "Security Guard",
      department: "Security",
      status: "pending",
      stage: "application",
      applicationDate: "2024-01-18",
      experience: "3 years",
      skills: ["Crowd Control", "First Aid", "De-escalation"],
      references: [],
      documents: [],
      notes: "Former law enforcement, strong references",
      employmentType: "part_time"
    },
    {
      id: "cand-3",
      name: "Emily Chen",
      email: "emily.chen@email.com",
      phone: "(555) 345-6789",
      position: "Event Coordinator",
      department: "Operations",
      status: "completed",
      stage: "completed",
      applicationDate: "2024-01-10",
      experience: "4 years",
      skills: ["Event Planning", "Project Management", "Communication"],
      references: [],
      documents: [
        { name: "Resume", status: "completed" },
        { name: "Background Check", status: "completed" },
        { name: "Contract", status: "completed" },
        { name: "W-4", status: "completed" }
      ],
      notes: "Successfully completed onboarding, excellent addition to team",
      assignedManager: "Alex Chen",
      startDate: "2024-01-25",
      salary: 60000,
      employmentType: "full_time"
    }
  ])

  // Onboarding templates for different positions
  const onboardingTemplates: OnboardingTemplate[] = [
    {
      id: "template-sound",
      name: "Sound Engineer Onboarding",
      department: "Technical",
      position: "Sound Engineer",
      estimatedDays: 14,
      requiredDocuments: ["Resume", "Background Check", "Equipment Training Certificate"],
      steps: [
        {
          id: "step-1",
          title: "Welcome & Introduction",
          description: "Meet the team and get oriented with the venue",
          type: "meeting",
          required: true,
          estimatedHours: 2,
          assignedTo: "Alex Chen",
          dueDate: "Day 1",
          status: "pending"
        },
        {
          id: "step-2",
          title: "Equipment Training",
          description: "Learn the venue's sound systems and equipment",
          type: "training",
          required: true,
          estimatedHours: 16,
          assignedTo: "Senior Sound Engineer",
          dueDate: "Day 3",
          status: "pending"
        },
        {
          id: "step-3",
          title: "Safety Protocols",
          description: "Complete safety training and certifications",
          type: "training",
          required: true,
          estimatedHours: 4,
          assignedTo: "Safety Manager",
          dueDate: "Day 5",
          status: "pending"
        },
        {
          id: "step-4",
          title: "System Access Setup",
          description: "Set up accounts and system access",
          type: "setup",
          required: true,
          estimatedHours: 1,
          assignedTo: "IT Department",
          dueDate: "Day 1",
          status: "pending"
        },
        {
          id: "step-5",
          title: "First Performance Review",
          description: "Initial performance assessment",
          type: "review",
          required: true,
          estimatedHours: 1,
          assignedTo: "Alex Chen",
          dueDate: "Day 14",
          status: "pending"
        }
      ]
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'in_progress': return 'bg-blue-500'
      case 'pending': return 'bg-yellow-500'
      case 'rejected': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'application': return FileText
      case 'interview': return MessageSquare
      case 'background_check': return Shield
      case 'documentation': return Upload
      case 'training': return GraduationCap
      case 'completed': return CheckCircle
      default: return Clock
    }
  }

  const handleUpdateCandidateStatus = (candidateId: string, newStatus: string, newStage?: string) => {
    setCandidates(prev => prev.map(candidate => 
      candidate.id === candidateId 
        ? { ...candidate, status: newStatus as any, stage: newStage as any || candidate.stage }
        : candidate
    ))
    
    toast({
      title: "Status Updated",
      description: `Candidate status updated to ${newStatus}`,
    })
  }

  const handleStartOnboarding = (candidate: OnboardingCandidate) => {
    setSelectedCandidate(candidate)
    setShowOnboardingWizard(true)
  }

  // Convert our candidate format to the wizard's expected format
  const convertCandidateForWizard = (candidate: OnboardingCandidate) => {
    return {
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      position: candidate.position,
      department: candidate.department,
      avatar: candidate.avatar,
      startDate: candidate.startDate || new Date().toISOString().split('T')[0],
      salary: candidate.salary,
      skills: candidate.skills,
      notes: candidate.notes,
      venueId: venueId
    }
  }

  const generateContract = (candidate: OnboardingCandidate) => {
    toast({
      title: "Contract Generated",
      description: `Employment contract generated for ${candidate.name}`,
    })
  }

  const sendWelcomePackage = (candidate: OnboardingCandidate) => {
    toast({
      title: "Welcome Package Sent",
      description: `Welcome package sent to ${candidate.email}`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Staff Onboarding System
          </h1>
          <p className="text-slate-400 mt-1">Comprehensive staff recruitment and onboarding management</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="bg-slate-800/50 border-slate-600">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-gradient-to-r from-blue-500 to-purple-600">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Candidate
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { 
            label: "Total Candidates", 
            value: candidates.length, 
            icon: Users, 
            color: "from-blue-500 to-cyan-500" 
          },
          { 
            label: "In Progress", 
            value: candidates.filter(c => c.status === 'in_progress').length, 
            icon: Clock, 
            color: "from-yellow-500 to-orange-500" 
          },
          { 
            label: "Completed", 
            value: candidates.filter(c => c.status === 'completed').length, 
            icon: CheckCircle, 
            color: "from-green-500 to-emerald-500" 
          },
          { 
            label: "Pending Review", 
            value: candidates.filter(c => c.status === 'pending').length, 
            icon: AlertCircle, 
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

      {/* Cross-Account Team Building */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="text-purple-400 flex items-center">
            <UserPlus className="h-5 w-5 mr-2" />
            Cross-Account Team Building & External Onboarding
          </CardTitle>
          <CardDescription className="text-slate-300">
            Invite and onboard team members from other accounts, venues, and artist profiles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-slate-700/30 rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Send className="h-6 w-6 text-white" />
              </div>
              <div className="text-white font-semibold">23</div>
              <div className="text-slate-400 text-sm">External Invites Sent</div>
            </div>
            <div className="text-center p-4 bg-slate-700/30 rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="text-white font-semibold">15</div>
              <div className="text-slate-400 text-sm">Successfully Onboarded</div>
            </div>
            <div className="text-center p-4 bg-slate-700/30 rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="text-white font-semibold">7</div>
              <div className="text-slate-400 text-sm">Connected Venues</div>
            </div>
            <div className="text-center p-4 bg-slate-700/30 rounded-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div className="text-white font-semibold">12</div>
              <div className="text-slate-400 text-sm">Artist Collaborators</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="bg-purple-600 hover:bg-purple-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite External Team Member
            </Button>
            <Button variant="outline" className="border-slate-600">
              <Building2 className="h-4 w-4 mr-2" />
              Connect With Other Venues
            </Button>
            <Button variant="outline" className="border-slate-600">
              <Star className="h-4 w-4 mr-2" />
              Discover Artists to Collaborate
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50">
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="onboarding">Active Onboarding</TabsTrigger>
          <TabsTrigger value="external">External Invitations</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Candidates Tab */}
        <TabsContent value="candidates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {candidates.map((candidate) => {
              const StageIcon = getStageIcon(candidate.stage)
              
              return (
                <Card key={candidate.id} className="bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 transition-all">
                  <CardContent className="p-6">
                    {/* Candidate Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={candidate.avatar} alt={candidate.name} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                            {candidate.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-white font-semibold">{candidate.name}</h3>
                          <p className="text-slate-400 text-sm">{candidate.position}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                              {candidate.department}
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                              {candidate.employmentType.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(candidate.status)}`}></div>
                    </div>

                    {/* Status & Stage */}
                    <div className="mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <StageIcon className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-white capitalize">{candidate.stage.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Applied: {formatSafeDate(candidate.applicationDate)}</span>
                        <span className="capitalize">{candidate.status}</span>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="mb-4">
                      <div className="text-xs text-slate-400 mb-2">Skills</div>
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 3).map((skill, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-blue-500/20 border-blue-500/30 text-blue-400">
                            {skill}
                          </Badge>
                        ))}
                        {candidate.skills.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600 text-slate-400">
                            +{candidate.skills.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Documents Progress */}
                    {candidate.documents.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs text-slate-400 mb-2">Documentation</div>
                        <div className="space-y-1">
                          {candidate.documents.slice(0, 2).map((doc, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-slate-300">{doc.name}</span>
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(doc.status)}`}></div>
                            </div>
                          ))}
                          {candidate.documents.length > 2 && (
                            <div className="text-xs text-slate-400">+{candidate.documents.length - 2} more</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50">
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50">
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-700/50">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {candidate.status === 'pending' ? (
                        <div className="flex space-x-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleUpdateCandidateStatus(candidate.id, 'rejected')}
                            className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                          >
                            Reject
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleStartOnboarding(candidate)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Start
                          </Button>
                        </div>
                      ) : candidate.status === 'in_progress' ? (
                        <Button 
                          size="sm" 
                          onClick={() => handleStartOnboarding(candidate)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Continue
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="border-slate-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Active Onboarding Tab */}
        <TabsContent value="onboarding" className="space-y-4">
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-blue-400">Active Onboarding Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {candidates.filter(c => c.status === 'in_progress').map((candidate) => (
                  <div key={candidate.id} className="p-4 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={candidate.avatar} alt={candidate.name} />
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                            {candidate.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="text-white font-semibold">{candidate.name}</h4>
                          <p className="text-slate-400 text-sm">{candidate.position} - {candidate.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-blue-500/20 border-blue-500/30 text-blue-400">
                          {candidate.stage.replace('_', ' ')}
                        </Badge>
                        <Button size="sm" onClick={() => handleStartOnboarding(candidate)}>
                          <Settings className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Onboarding Progress</span>
                        <span>75%</span>
                      </div>
                      <Progress value={75} className="h-2 bg-slate-700" />
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => generateContract(candidate)}
                        className="border-slate-600 text-xs"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Generate Contract
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => sendWelcomePackage(candidate)}
                        className="border-slate-600 text-xs"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Welcome Package
                      </Button>
                      <Button size="sm" variant="outline" className="border-slate-600 text-xs">
                        <Calendar className="h-3 w-3 mr-1" />
                        Schedule Meeting
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {onboardingTemplates.map((template) => (
              <Card key={template.id} className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-white">{template.name}</CardTitle>
                  <CardDescription>
                    {template.department} • {template.position} • {template.estimatedDays} days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">Onboarding Steps</h4>
                      <div className="space-y-2">
                        {template.steps.slice(0, 3).map((step) => (
                          <div key={step.id} className="flex items-center space-x-2 text-sm">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <span className="text-slate-300">{step.title}</span>
                            <span className="text-slate-500">({step.estimatedHours}h)</span>
                          </div>
                        ))}
                        {template.steps.length > 3 && (
                          <div className="text-xs text-slate-400">+{template.steps.length - 3} more steps</div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">Required Documents</h4>
                      <div className="flex flex-wrap gap-1">
                        {template.requiredDocuments.map((doc, i) => (
                          <Badge key={i} variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                            {doc}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3">
                      <span className="text-sm text-slate-400">
                        Est. {template.estimatedDays} days
                      </span>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" className="border-slate-600">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <Plus className="h-4 w-4 mr-1" />
                          Use Template
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* External Invitations Tab */}
        <TabsContent value="external" className="space-y-4">
          <Card className="bg-slate-800/30 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-purple-400">Cross-Account Team Invitations</CardTitle>
              <CardDescription>
                Manage invitations to external users from other venue and artist accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    id: "ext-1",
                    name: "Marcus Thompson",
                    email: "marcus@artisthub.com",
                    accountType: "Artist",
                    currentAccount: "Marcus Thompson Music",
                    role: "Sound Consultant",
                    status: "pending",
                    sentDate: "2024-02-08",
                    message: "We'd love your expertise for our upcoming concert series"
                  },
                  {
                    id: "ext-2",
                    name: "Lisa Chen",
                    email: "lisa@cityhall.com",
                    accountType: "Venue",
                    currentAccount: "City Concert Hall",
                    role: "Security Advisor",
                    status: "accepted",
                    sentDate: "2024-02-05"
                  }
                ].map((invitation) => (
                  <Card key={invitation.id} className="bg-slate-700/30 border-slate-600/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-gradient-to-r from-purple-500 to-blue-600 text-white">
                              {invitation.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="text-white font-medium">{invitation.name}</h4>
                            <p className="text-slate-400 text-sm">{invitation.email}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {invitation.accountType}
                              </Badge>
                              <span className="text-slate-500 text-xs">@ {invitation.currentAccount}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <Badge variant="outline" className={`${
                            invitation.status === 'pending' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                            invitation.status === 'accepted' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                            'text-red-400 bg-red-500/10 border-red-500/20'
                          }`}>
                            {invitation.status}
                          </Badge>
                          <p className="text-slate-400 text-sm mt-1">Sent {invitation.sentDate}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Invited as: </span>
                          <span className="text-slate-300">{invitation.role}</span>
                        </div>
                        {invitation.message && (
                          <div>
                            <span className="text-slate-400">Message: </span>
                            <span className="text-slate-300">{invitation.message}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { title: "Avg. Onboarding Time", value: "12.5 days", change: "-2.3 days", positive: true },
              { title: "Success Rate", value: "94%", change: "+3%", positive: true },
              { title: "Cost per Hire", value: "$1,240", change: "-$180", positive: true },
              { title: "Time to Productivity", value: "18 days", change: "-1.5 days", positive: true }
            ].map((metric, i) => (
              <Card key={i} className="bg-slate-800/30 border-slate-700/50">
                <CardContent className="p-4">
                  <div className="text-slate-400 text-sm">{metric.title}</div>
                  <div className="text-2xl font-bold text-white">{metric.value}</div>
                  <div className={`text-sm ${metric.positive ? 'text-green-400' : 'text-red-400'}`}>
                    {metric.change} vs last month
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

              {/* Onboarding Wizard - Temporarily disabled for debugging */}
        {/* <OnboardingWizard
          candidate={selectedCandidate ? convertCandidateForWizard(selectedCandidate) : null}
          isOpen={showOnboardingWizard}
          onClose={() => setShowOnboardingWizard(false)}
        /> */}
    </div>
  )
} 