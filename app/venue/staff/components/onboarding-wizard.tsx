"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { StaffOnboardingService, StaffOnboardingData } from "@/lib/services/staff-onboarding.service"
import {
  Plus,
  Save,
  Copy,
  Edit,
  Trash2,
  Clock,
  User,
  FileText,
  GraduationCap,
  Settings,
  CheckCircle,
  AlertCircle,
  Calendar,
  Building,
  Shield,
  Mail,
  Phone,
  Briefcase,
  GripVertical as Grip,
  ChevronRight,
  ChevronDown,
  Play,
  Pause,
  RotateCcw,
  UserPlus,
  Key
} from "lucide-react"

interface OnboardingStep {
  id: string
  title: string
  description: string
  type: 'document' | 'training' | 'meeting' | 'setup' | 'review' | 'task' | 'approval'
  category: 'admin' | 'training' | 'equipment' | 'social' | 'performance'
  required: boolean
  estimatedHours: number
  assignedTo?: string
  dependsOn?: string[]
  dueDate?: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'blocked'
  notes?: string
  documents?: string[]
  instructions?: string
  completionCriteria?: string[]
}

interface OnboardingTemplate {
  id: string
  name: string
  department: string
  position: string
  description: string
  estimatedDays: number
  steps: OnboardingStep[]
  requiredDocuments: string[]
  assignees: string[]
  tags: string[]
  isDefault: boolean
  lastUsed?: string
  useCount: number
}

interface OnboardingCandidate {
  id: string
  name: string
  email: string
  phone?: string
  position: string
  department: string
  avatar?: string
  startDate: string
  salary?: number
  skills?: string[]
  notes?: string
  venueId?: string
}

export default function OnboardingWizard({ 
  candidate, 
  isOpen, 
  onClose 
}: { 
  candidate: OnboardingCandidate | null
  isOpen: boolean
  onClose: () => void 
}) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedTemplate, setSelectedTemplate] = useState<OnboardingTemplate | null>(null)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [editingStep, setEditingStep] = useState<OnboardingStep | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [customTemplate, setCustomTemplate] = useState<Partial<OnboardingTemplate>>({
    name: "",
    department: "",
    position: "",
    description: "",
    estimatedDays: 14,
    steps: [],
    requiredDocuments: [],
    assignees: [],
    tags: [],
    isDefault: false,
    useCount: 0
  })
  const [templateSteps, setTemplateSteps] = useState<OnboardingStep[]>([])
  const [showStepEditor, setShowStepEditor] = useState(false)
  const [currentEditingStep, setCurrentEditingStep] = useState<OnboardingStep | null>(null)
  const [showWelcomeEmailDialog, setShowWelcomeEmailDialog] = useState(false)
  const [showSchedulingDialog, setShowSchedulingDialog] = useState(false)
  const [showAccessSetupDialog, setShowAccessSetupDialog] = useState(false)
  const [showAccountCreationDialog, setShowAccountCreationDialog] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [accountCreationResult, setAccountCreationResult] = useState<any>(null)
  const [emailTemplate, setEmailTemplate] = useState({
    subject: "",
    body: "",
    attachments: [] as string[]
  })
  const [meetings, setMeetings] = useState<Array<{
    id: string
    title: string
    date: string
    time: string
    attendees: string[]
    location: string
    notes: string
  }>>([
    {
      id: "meeting-1",
      title: "Welcome & Orientation",
      date: "",
      time: "",
      attendees: [],
      location: "Conference Room A",
      notes: ""
    }
  ])
  const [accessSetup, setAccessSetup] = useState({
    email: false,
    systemAccess: false,
    securityBadge: false,
    softwareLicenses: false,
    parkingPass: false,
    uniforms: false
  })
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string
    action: string
    timestamp: Date
    type: 'success' | 'info' | 'warning'
  }>>([])

  // Add activity helper
  const addActivity = (action: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const newActivity = {
      id: Date.now().toString(),
      action,
      timestamp: new Date(),
      type
    }
    setRecentActivity(prev => [newActivity, ...prev.slice(0, 4)]) // Keep only 5 most recent
  }

  // Mock templates data
  const [templates] = useState<OnboardingTemplate[]>([
    {
      id: "template-1",
      name: "Sound Engineer Complete",
      department: "Technical",
      position: "Sound Engineer",
      description: "Comprehensive onboarding for technical sound engineering roles",
      estimatedDays: 14,
      requiredDocuments: ["Resume", "Portfolio", "Certifications", "Background Check"],
      assignees: ["Alex Chen", "Senior Engineer", "HR Manager"],
      tags: ["technical", "audio", "equipment"],
      isDefault: true,
      lastUsed: "2024-02-01",
      useCount: 12,
      steps: [
        {
          id: "step-1",
          title: "Welcome & Orientation",
          description: "Introduction to venue, team, and company culture",
          type: "meeting",
          category: "social",
          required: true,
          estimatedHours: 3,
          assignedTo: "Alex Chen",
          status: "pending",
          instructions: "Conduct venue tour, introduce team members, explain company values and expectations",
          completionCriteria: ["Venue tour completed", "Team introductions made", "Employee handbook reviewed"]
        },
        {
          id: "step-2",
          title: "Equipment Familiarization",
          description: "Learn venue's audio equipment and systems",
          type: "training",
          category: "equipment",
          required: true,
          estimatedHours: 16,
          assignedTo: "Senior Engineer",
          dependsOn: ["step-1"],
          status: "pending",
          documents: ["Equipment Manual", "Safety Guidelines"],
          instructions: "Hands-on training with all audio equipment, mixing boards, and software systems",
          completionCriteria: ["Can operate mixing board", "Understands signal flow", "Knows emergency procedures"]
        },
        {
          id: "step-3",
          title: "Safety Training",
          description: "Complete venue safety protocols and certifications",
          type: "training",
          category: "admin",
          required: true,
          estimatedHours: 4,
          assignedTo: "Safety Manager",
          status: "pending",
          documents: ["Safety Manual", "Emergency Procedures"],
          completionCriteria: ["Safety quiz passed", "Emergency procedures understood", "PPE training completed"]
        },
        {
          id: "step-4",
          title: "System Access Setup",
          description: "Configure user accounts and system permissions",
          type: "setup",
          category: "admin",
          required: true,
          estimatedHours: 2,
          assignedTo: "IT Department",
          status: "pending",
          instructions: "Set up email, software licenses, access cards, and system permissions",
          completionCriteria: ["Email account active", "Software access granted", "Security badge issued"]
        },
        {
          id: "step-5",
          title: "First Event Shadow",
          description: "Shadow experienced engineer during live event",
          type: "training",
          category: "performance",
          required: true,
          estimatedHours: 8,
          assignedTo: "Senior Engineer",
          dependsOn: ["step-2", "step-3"],
          status: "pending",
          instructions: "Observe and assist during actual event, take notes, ask questions",
          completionCriteria: ["Event shadowing completed", "Performance notes submitted", "Feedback received"]
        },
        {
          id: "step-6",
          title: "30-Day Review",
          description: "Performance review and feedback session",
          type: "review",
          category: "performance",
          required: true,
          estimatedHours: 2,
          assignedTo: "Alex Chen",
          dependsOn: ["step-5"],
          dueDate: "Day 30",
          status: "pending",
          instructions: "Conduct comprehensive review of performance, address any concerns, set goals",
          completionCriteria: ["Review meeting completed", "Performance goals set", "Development plan created"]
        }
      ]
    },
    {
      id: "template-2",
      name: "Security Staff Basic",
      department: "Security",
      position: "Security Guard",
      description: "Essential onboarding for security personnel",
      estimatedDays: 7,
      requiredDocuments: ["Security License", "Background Check", "First Aid Cert"],
      assignees: ["Security Chief", "Training Coordinator"],
      tags: ["security", "safety", "crowd-control"],
      isDefault: false,
      lastUsed: "2024-01-28",
      useCount: 8,
      steps: [
        {
          id: "sec-1",
          title: "Security Protocols Training",
          description: "Learn venue security procedures and protocols",
          type: "training",
          category: "training",
          required: true,
          estimatedHours: 8,
          assignedTo: "Security Chief",
          status: "pending"
        },
        {
          id: "sec-2",
          title: "Communication Systems",
          description: "Radio and communication equipment training",
          type: "training",
          category: "equipment",
          required: true,
          estimatedHours: 2,
          assignedTo: "Security Chief",
          status: "pending"
        }
      ]
    }
  ])

  // Mock step templates for building custom workflows
  const stepTemplates = [
    {
      id: "welcome",
      title: "Welcome & Orientation",
      type: "meeting",
      category: "social",
      estimatedHours: 3,
      description: "Introduction to venue and team"
    },
    {
      id: "equipment",
      title: "Equipment Training",
      type: "training", 
      category: "equipment",
      estimatedHours: 8,
      description: "Hands-on equipment familiarization"
    },
    {
      id: "safety",
      title: "Safety Training",
      type: "training",
      category: "admin", 
      estimatedHours: 4,
      description: "Safety protocols and procedures"
    },
    {
      id: "systems",
      title: "System Access Setup",
      type: "setup",
      category: "admin",
      estimatedHours: 2,
      description: "User accounts and system access"
    },
    {
      id: "shadow",
      title: "Job Shadow Experience",
      type: "training",
      category: "performance",
      estimatedHours: 8,
      description: "Shadow experienced team member"
    },
    {
      id: "review",
      title: "Performance Review",
      type: "review",
      category: "performance", 
      estimatedHours: 2,
      description: "Formal performance evaluation"
    },
    {
      id: "documentation",
      title: "Document Submission",
      type: "document",
      category: "admin",
      estimatedHours: 1,
      description: "Submit required paperwork"
    }
  ]

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'document': return FileText
      case 'training': return GraduationCap
      case 'meeting': return User
      case 'setup': return Settings
      case 'review': return CheckCircle
      case 'task': return Briefcase
      case 'approval': return Shield
      default: return Clock
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'in_progress': return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      case 'pending': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
      case 'blocked': return 'text-red-400 bg-red-500/10 border-red-500/20'
      case 'skipped': return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'admin': return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      case 'training': return 'text-green-400 bg-green-500/10 border-green-500/20'
      case 'equipment': return 'text-purple-400 bg-purple-500/10 border-purple-500/20'
      case 'social': return 'text-orange-400 bg-orange-500/10 border-orange-500/20'
      case 'performance': return 'text-pink-400 bg-pink-500/10 border-pink-500/20'
      default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20'
    }
  }

  const handleTemplateSelect = (template: OnboardingTemplate) => {
    setSelectedTemplate(template)
    setActiveTab("workflow")
    addActivity(`Template "${template.name}" selected`, 'success')
    toast({
      title: "Template Selected",
      description: `Using ${template.name} for ${candidate?.name}`,
    })
  }

  const saveProgress = () => {
    if (!selectedTemplate) {
      toast({
        title: "Nothing to Save",
        description: "Please select a template and make progress first",
        variant: "destructive"
      })
      return
    }

    // Simulate saving progress
    addActivity('Onboarding progress saved', 'success')
    toast({
      title: "Progress Saved",
      description: "Onboarding progress has been saved successfully",
    })
  }

  const handleStepStatusUpdate = (stepId: string, newStatus: string) => {
    if (selectedTemplate) {
      const step = selectedTemplate.steps.find(s => s.id === stepId)
      const updatedTemplate = {
        ...selectedTemplate,
        steps: selectedTemplate.steps.map(step =>
          step.id === stepId ? { ...step, status: newStatus as any } : step
        )
      }
      setSelectedTemplate(updatedTemplate)
      
      if (step) {
        addActivity(`"${step.title}" marked as ${newStatus.replace('_', ' ')}`, 'success')
      }
      
      toast({
        title: "Step Updated",
        description: `Step status updated to ${newStatus}`,
      })
    }
  }

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId)
    } else {
      newExpanded.add(stepId)
    }
    setExpandedSteps(newExpanded)
  }

  const calculateProgress = () => {
    if (!selectedTemplate) return 0
    const totalSteps = selectedTemplate.steps.length
    const completedSteps = selectedTemplate.steps.filter(s => s.status === 'completed').length
    return Math.round((completedSteps / totalSteps) * 100)
  }

  const getEstimatedCompletion = () => {
    if (!selectedTemplate) return "N/A"
    const remainingSteps = selectedTemplate.steps.filter(s => s.status !== 'completed')
    const remainingHours = remainingSteps.reduce((total, step) => total + step.estimatedHours, 0)
    const remainingDays = Math.ceil(remainingHours / 8)
    return `${remainingDays} days`
  }

  // Template builder functions
  const addStepFromTemplate = (stepTemplate: any) => {
    const newStep: OnboardingStep = {
      id: `step-${Date.now()}`,
      title: stepTemplate.title,
      description: stepTemplate.description,
      type: stepTemplate.type,
      category: stepTemplate.category,
      required: true,
      estimatedHours: stepTemplate.estimatedHours,
      status: 'pending',
      instructions: "",
      completionCriteria: []
    }
    setTemplateSteps(prev => [...prev, newStep])
    setCustomTemplate(prev => ({
      ...prev,
      steps: [...(prev.steps || []), newStep]
    }))
    
    toast({
      title: "Step Added",
      description: `${stepTemplate.title} added to template`,
    })
  }

  const editTemplateStep = (step: OnboardingStep) => {
    setCurrentEditingStep(step)
    setShowStepEditor(true)
  }

  const updateTemplateStep = (updatedStep: OnboardingStep) => {
    setTemplateSteps(prev => prev.map(step => 
      step.id === updatedStep.id ? updatedStep : step
    ))
    setCustomTemplate(prev => ({
      ...prev,
      steps: prev.steps?.map(step => 
        step.id === updatedStep.id ? updatedStep : step
      )
    }))
    setShowStepEditor(false)
    setCurrentEditingStep(null)
    
    toast({
      title: "Step Updated",
      description: "Template step has been updated",
    })
  }

  const removeTemplateStep = (stepId: string) => {
    setTemplateSteps(prev => prev.filter(step => step.id !== stepId))
    setCustomTemplate(prev => ({
      ...prev,
      steps: prev.steps?.filter(step => step.id !== stepId)
    }))
    
    toast({
      title: "Step Removed",
      description: "Step removed from template",
    })
  }

  const saveCustomTemplate = () => {
    if (!customTemplate.name || !customTemplate.department || !customTemplate.position) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    const newTemplate: OnboardingTemplate = {
      id: `template-${Date.now()}`,
      name: customTemplate.name,
      department: customTemplate.department,
      position: customTemplate.position,
      description: customTemplate.description || "",
      estimatedDays: customTemplate.estimatedDays || 14,
      steps: templateSteps,
      requiredDocuments: customTemplate.requiredDocuments || [],
      assignees: customTemplate.assignees || [],
      tags: customTemplate.tags || [],
      isDefault: customTemplate.isDefault || false,
      useCount: 0
    }

    toast({
      title: "Template Saved",
      description: `${newTemplate.name} has been saved successfully`,
    })

    // Reset form
    setCustomTemplate({
      name: "",
      department: "",
      position: "",
      description: "",
      estimatedDays: 14,
      steps: [],
      requiredDocuments: [],
      assignees: [],
      tags: [],
      isDefault: false,
      useCount: 0
    })
    setTemplateSteps([])
    setActiveTab("templates")
  }

  // Quick Actions functions
  const handleSelectTemplate = () => {
    setActiveTab("templates")
  }

  const handleSendWelcomeEmail = () => {
    if (!candidate) return
    
    // Pre-populate email template based on position
    const defaultTemplate = {
      subject: `Welcome to the Team, ${candidate.name}!`,
      body: `Dear ${candidate.name},

Welcome to our team! We're excited to have you join us as a ${candidate.position} in our ${candidate.department} department.

Your start date is ${candidate.startDate}, and we've prepared a comprehensive onboarding process to help you get up to speed quickly.

What to expect on your first day:
• Meet your team and manager
• Complete initial paperwork and setup
• Begin orientation and training
• Get familiar with our venue and systems

Please reply to this email if you have any questions before your start date.

Looking forward to working with you!

Best regards,
The Management Team`,
      attachments: ['Employee Handbook', 'Welcome Package', 'Parking Information']
    }
    
    setEmailTemplate(defaultTemplate)
    setShowWelcomeEmailDialog(true)
  }

  const handleScheduleMeetings = () => {
    if (!candidate) return
    
    // Pre-populate meeting based on selected template
    const defaultMeetings = selectedTemplate ? 
      selectedTemplate.steps
        .filter(step => step.type === 'meeting')
        .map(step => ({
          id: `meeting-${step.id}`,
          title: step.title,
          date: candidate.startDate,
          time: "09:00",
          attendees: step.assignedTo ? [step.assignedTo] : [],
          location: "Main Office",
          notes: step.instructions || ""
        })) :
      [{
        id: "meeting-1",
        title: "Welcome & Orientation",
        date: candidate.startDate,
        time: "09:00",
        attendees: ["HR Manager"],
        location: "Conference Room A",
        notes: "Initial welcome meeting and venue tour"
      }]
    
    setMeetings(defaultMeetings)
    setShowSchedulingDialog(true)
  }

  const handleSetupAccess = () => {
    setShowAccessSetupDialog(true)
  }

  const sendWelcomeEmail = () => {
    if (!candidate) return
    
    // Simulate sending email
    addActivity(`Welcome email sent to ${candidate.name}`, 'success')
    toast({
      title: "Welcome Email Sent",
      description: `Welcome email sent to ${candidate.email}`,
    })
    
    setShowWelcomeEmailDialog(false)
  }

  const scheduleMeetings = () => {
    const validMeetings = meetings.filter(m => m.date && m.time)
    
    if (validMeetings.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please schedule at least one meeting with date and time",
        variant: "destructive"
      })
      return
    }

    addActivity(`${validMeetings.length} meetings scheduled`, 'success')
    toast({
      title: "Meetings Scheduled",
      description: `${validMeetings.length} meeting(s) scheduled for ${candidate?.name}`,
    })
    
    setShowSchedulingDialog(false)
  }

  const setupAccess = () => {
    const setupItems = Object.entries(accessSetup).filter(([_, enabled]) => enabled)
    
    if (setupItems.length === 0) {
      toast({
        title: "Validation Error", 
        description: "Please select at least one access item to setup",
        variant: "destructive"
      })
      return
    }

    addActivity(`Access setup completed (${setupItems.length} items)`, 'success')
    toast({
      title: "Access Setup Complete",
      description: `${setupItems.length} access item(s) configured for ${candidate?.name}`,
    })
    
    setShowAccessSetupDialog(false)
  }

  const createStaffAccount = async () => {
    if (!candidate) return

    setIsCreatingAccount(true)
    try {
      const staffData: StaffOnboardingData = {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone || '',
        position: candidate.position,
        department: candidate.department,
        employment_type: 'full_time',
        start_date: candidate.startDate,
        hourly_rate: candidate.salary ? candidate.salary / 2080 : undefined, // Convert annual to hourly
        skills: candidate.skills || [],
        notes: candidate.notes || '',
        venue_id: candidate.venueId || '', // You'll need to add this to the candidate interface
        onboarding_template_id: selectedTemplate?.id,
        permissions: {
          manage_bookings: false,
          manage_events: false,
          view_analytics: false,
          manage_team: false,
          manage_documents: false
        }
      }

      const result = await StaffOnboardingService.createStaffMember(staffData)
      setAccountCreationResult(result)
      
      addActivity(`Staff account created for ${candidate.name}`, 'success')
      toast({
        title: "Account Created",
        description: `Staff account created successfully for ${candidate.name}`,
      })

      setShowAccountCreationDialog(true)
    } catch (error) {
      console.error('Error creating staff account:', error)
      addActivity(`Failed to create staff account for ${candidate.name}`, 'warning')
      toast({
        title: "Account Creation Failed",
        description: error instanceof Error ? error.message : 'Failed to create staff account',
        variant: "destructive"
      })
    } finally {
      setIsCreatingAccount(false)
    }
  }

  const startOnboardingProcess = () => {
    if (!selectedTemplate) {
      toast({
        title: "Template Required",
        description: "Please select an onboarding template first",
        variant: "destructive"
      })
      setActiveTab("templates")
      return
    }

    // Update template status to in-progress
    const updatedTemplate = {
      ...selectedTemplate,
      steps: selectedTemplate.steps.map(step => 
        step.id === selectedTemplate.steps[0].id 
          ? { ...step, status: 'in_progress' as const }
          : step
      )
    }
    setSelectedTemplate(updatedTemplate)

    addActivity(`Onboarding process started using "${selectedTemplate.name}"`, 'success')
    toast({
      title: "Onboarding Started", 
      description: `Onboarding process started for ${candidate?.name}`,
    })
    
    setActiveTab("workflow")
  }

  if (!candidate) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] bg-slate-900 border-slate-700 overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-blue-400 text-xl">
                Onboarding: {candidate.name}
              </DialogTitle>
              <p className="text-slate-400 text-sm mt-1">
                {candidate.position} • {candidate.department} • Starts {candidate.startDate}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={saveProgress} variant="outline" className="border-slate-600">
                <Save className="h-4 w-4 mr-2" />
                Save Progress
              </Button>
              <Button 
                onClick={createStaffAccount} 
                disabled={isCreatingAccount}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {isCreatingAccount ? 'Creating Account...' : 'Create Staff Account'}
              </Button>
              <Button onClick={startOnboardingProcess} className="bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-2" />
                Start Onboarding
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-800/50 grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
            <TabsTrigger value="builder">Template Builder</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Candidate Info */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-green-400">Candidate Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg">
                        {candidate.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-white font-semibold text-lg">{candidate.name}</h3>
                      <p className="text-slate-400">{candidate.position}</p>
                      <p className="text-slate-500 text-sm">{candidate.email}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Department:</span>
                      <span className="text-white">{candidate.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Start Date:</span>
                      <span className="text-white">{candidate.startDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <Badge variant="outline" className="text-blue-400 bg-blue-500/10 border-blue-500/20">
                        Ready to Start
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Progress Overview */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-blue-400">Onboarding Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-slate-400">Overall Progress</span>
                        <span className="text-white font-medium">{calculateProgress()}%</span>
                      </div>
                      <Progress value={calculateProgress()} className="h-3" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                        <div className="text-white font-semibold">
                          {selectedTemplate?.steps.filter(s => s.status === 'completed').length || 0}
                        </div>
                        <div className="text-slate-400 text-sm">Completed</div>
                      </div>
                      <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                        <div className="text-white font-semibold">
                          {selectedTemplate?.steps.filter(s => s.status === 'pending').length || 0}
                        </div>
                        <div className="text-slate-400 text-sm">Remaining</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Estimated Completion:</span>
                        <span className="text-white">{getEstimatedCompletion()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Template Used:</span>
                        <span className="text-white">{selectedTemplate?.name || "None selected"}</span>
                      </div>
                      {selectedTemplate && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Hours:</span>
                          <span className="text-white">{selectedTemplate.steps.reduce((total, step) => total + step.estimatedHours, 0)}h</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-400">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSelectTemplate}>
                      <FileText className="h-4 w-4 mr-2" />
                      Select Template
                    </Button>
                    <Button variant="outline" className="w-full border-slate-600" onClick={handleSendWelcomeEmail}>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Welcome Email
                    </Button>
                    <Button variant="outline" className="w-full border-slate-600" onClick={handleScheduleMeetings}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Meetings
                    </Button>
                    <Button variant="outline" className="w-full border-slate-600" onClick={handleSetupAccess}>
                      <Settings className="h-4 w-4 mr-2" />
                      Setup Access
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-orange-400">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-3 p-2 bg-slate-700/20 rounded-lg">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'success' ? 'bg-green-400' :
                          activity.type === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                        }`}></div>
                        <div className="flex-1">
                          <div className="text-slate-300 text-sm">{activity.action}</div>
                          <div className="text-slate-500 text-xs">
                            {new Intl.DateTimeFormat("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            }).format(activity.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                                 </CardContent>
               </Card>
             )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Onboarding Templates</h3>
              <Button onClick={() => setActiveTab("builder")} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {templates.map((template) => (
                <Card key={template.id} className={`bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50 transition-all cursor-pointer ${
                  selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500/50' : ''
                }`} onClick={() => handleTemplateSelect(template)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-white font-semibold text-lg">{template.name}</h4>
                        <p className="text-slate-400 text-sm">{template.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                            {template.department}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                            {template.position}
                          </Badge>
                          {template.isDefault && (
                            <Badge variant="outline" className="text-xs text-green-400 bg-green-500/10 border-green-500/20">
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-blue-400 font-semibold">{template.estimatedDays} days</div>
                        <div className="text-slate-400 text-xs">Estimated</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="text-slate-400 text-xs mb-1">Steps ({template.steps.length})</div>
                        <div className="flex flex-wrap gap-1">
                          {template.steps.slice(0, 3).map((step) => {
                            const Icon = getStepIcon(step.type)
                            return (
                              <div key={step.id} className="flex items-center space-x-1 bg-slate-700/30 rounded px-2 py-1">
                                <Icon className="h-3 w-3 text-blue-400" />
                                <span className="text-xs text-slate-300">{step.title}</span>
                              </div>
                            )
                          })}
                          {template.steps.length > 3 && (
                            <div className="bg-slate-700/30 rounded px-2 py-1">
                              <span className="text-xs text-slate-400">+{template.steps.length - 3} more</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 text-xs mb-1">Tags</div>
                        <div className="flex flex-wrap gap-1">
                          {template.tags.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs bg-purple-500/20 border-purple-500/30 text-purple-400">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
                        <div className="text-xs text-slate-400">
                          Used {template.useCount} times • Last: {template.lastUsed}
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="border-slate-600">
                            <Copy className="h-4 w-4 mr-1" />
                            Clone
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            <CheckCircle className="h-4 w-4 mr-1" />
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

          {/* Workflow Tab */}
          <TabsContent value="workflow" className="space-y-6">
            {selectedTemplate ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">Onboarding Workflow</h3>
                    <p className="text-slate-400">Template: {selectedTemplate.name}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" className="border-slate-600">
                      <Edit className="h-4 w-4 mr-2" />
                      Customize
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Play className="h-4 w-4 mr-2" />
                      Start Process
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Progress Summary */}
                  <Card className="bg-slate-800/30 border-slate-700/50">
                    <CardHeader>
                      <CardTitle className="text-sm text-slate-400">Progress Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="text-2xl font-bold text-white">{calculateProgress()}%</div>
                          <div className="text-slate-400 text-sm">Complete</div>
                          <Progress value={calculateProgress()} className="h-2 mt-2" />
                        </div>
                        
                        {['pending', 'in_progress', 'completed', 'blocked'].map((status) => (
                          <div key={status} className="flex justify-between">
                            <span className="text-slate-400 text-sm capitalize">{status.replace('_', ' ')}</span>
                            <span className="text-white font-medium">
                              {selectedTemplate.steps.filter(s => s.status === status).length}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Steps Timeline */}
                  <div className="lg:col-span-3">
                    <Card className="bg-slate-800/30 border-slate-700/50">
                      <CardHeader>
                        <CardTitle className="text-blue-400">Onboarding Steps</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {selectedTemplate.steps.map((step, index) => {
                            const Icon = getStepIcon(step.type)
                            const isExpanded = expandedSteps.has(step.id)
                            
                            return (
                              <div key={step.id} className="border border-slate-700/50 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                      step.status === 'completed' ? 'bg-green-500' :
                                      step.status === 'in_progress' ? 'bg-blue-500' :
                                      step.status === 'blocked' ? 'bg-red-500' : 'bg-slate-600'
                                    }`}>
                                      <Icon className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                      <h4 className="text-white font-medium">{step.title}</h4>
                                      <p className="text-slate-400 text-sm">{step.description}</p>
                                      <div className="flex items-center space-x-2 mt-1">
                                        <Badge variant="outline" className={getStatusColor(step.status)}>
                                          {step.status.replace('_', ' ')}
                                        </Badge>
                                        <Badge variant="outline" className={getCategoryColor(step.category)}>
                                          {step.category}
                                        </Badge>
                                        <span className="text-slate-500 text-xs">{step.estimatedHours}h</span>
                                        {step.assignedTo && (
                                          <span className="text-slate-500 text-xs">• {step.assignedTo}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-2">
                                    <Select value={step.status} onValueChange={(value) => handleStepStatusUpdate(step.id, value)}>
                                      <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="bg-slate-800 border-slate-700">
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="blocked">Blocked</SelectItem>
                                        <SelectItem value="skipped">Skipped</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      onClick={() => toggleStepExpansion(step.id)}
                                      className="p-0 h-8 w-8"
                                    >
                                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    </Button>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="mt-4 pl-14 space-y-3">
                                    {step.instructions && (
                                      <div>
                                        <div className="text-slate-400 text-sm font-medium mb-1">Instructions</div>
                                        <p className="text-slate-300 text-sm">{step.instructions}</p>
                                      </div>
                                    )}
                                    
                                    {step.completionCriteria && step.completionCriteria.length > 0 && (
                                      <div>
                                        <div className="text-slate-400 text-sm font-medium mb-1">Completion Criteria</div>
                                        <ul className="space-y-1">
                                          {step.completionCriteria.map((criteria, i) => (
                                            <li key={i} className="flex items-center space-x-2 text-sm">
                                              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                              <span className="text-slate-300">{criteria}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {step.documents && step.documents.length > 0 && (
                                      <div>
                                        <div className="text-slate-400 text-sm font-medium mb-1">Required Documents</div>
                                        <div className="flex flex-wrap gap-1">
                                          {step.documents.map((doc, i) => (
                                            <Badge key={i} variant="outline" className="text-xs bg-slate-700/50 border-slate-600">
                                              {doc}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {step.dependsOn && step.dependsOn.length > 0 && (
                                      <div>
                                        <div className="text-slate-400 text-sm font-medium mb-1">Dependencies</div>
                                        <div className="text-slate-300 text-sm">
                                          Depends on: {step.dependsOn.join(', ')}
                                        </div>
                                      </div>
                                    )}
                                    
                                    <div className="flex space-x-2">
                                      <Button size="sm" variant="outline" className="border-slate-600">
                                        <Edit className="h-4 w-4 mr-1" />
                                        Edit Step
                                      </Button>
                                      <Button size="sm" variant="outline" className="border-slate-600">
                                        <Calendar className="h-4 w-4 mr-1" />
                                        Schedule
                                      </Button>
                                      <Button size="sm" variant="outline" className="border-slate-600">
                                        <Mail className="h-4 w-4 mr-1" />
                                        Notify Assignee
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            ) : (
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardContent className="p-12 text-center">
                  <FileText className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Template Selected</h3>
                  <p className="text-slate-400 mb-6">Choose a template to begin the onboarding process</p>
                  <Button onClick={() => setActiveTab("templates")} className="bg-blue-600 hover:bg-blue-700">
                    Select Template
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Template Builder Tab */}
          <TabsContent value="builder" className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Template Builder</h3>
              <div className="flex space-x-2">
                <Button variant="outline" className="border-slate-600">
                  <Copy className="h-4 w-4 mr-2" />
                  Clone Existing
                </Button>
                <Button onClick={saveCustomTemplate} className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 mr-2" />
                  Save Template
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Template Settings */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-green-400">Template Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Template Name</Label>
                    <Input 
                      className="bg-slate-700 border-slate-600" 
                      placeholder="Enter template name"
                      value={customTemplate.name}
                      onChange={(e) => setCustomTemplate(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Department</Label>
                    <Select value={customTemplate.department} onValueChange={(value) => setCustomTemplate(prev => ({ ...prev, department: value }))}>
                      <SelectTrigger className="bg-slate-700 border-slate-600">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="Technical">Technical</SelectItem>
                        <SelectItem value="Security">Security</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Service">Service</SelectItem>
                        <SelectItem value="Management">Management</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Position</Label>
                    <Input 
                      className="bg-slate-700 border-slate-600" 
                      placeholder="Enter position"
                      value={customTemplate.position}
                      onChange={(e) => setCustomTemplate(prev => ({ ...prev, position: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea 
                      className="bg-slate-700 border-slate-600" 
                      placeholder="Template description"
                      value={customTemplate.description}
                      onChange={(e) => setCustomTemplate(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Estimated Days</Label>
                    <Input 
                      type="number" 
                      className="bg-slate-700 border-slate-600" 
                      placeholder="14"
                      value={customTemplate.estimatedDays}
                      onChange={(e) => setCustomTemplate(prev => ({ ...prev, estimatedDays: parseInt(e.target.value) || 14 }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="default" 
                      checked={customTemplate.isDefault}
                      onCheckedChange={(checked) => setCustomTemplate(prev => ({ ...prev, isDefault: checked as boolean }))}
                    />
                    <Label htmlFor="default">Set as default template</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Step Templates */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-blue-400">Available Step Templates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stepTemplates.map((template) => {
                      const Icon = getStepIcon(template.type)
                      return (
                        <div 
                          key={template.id} 
                          className="p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5 text-blue-400" />
                            <div className="flex-1">
                              <h4 className="text-white font-medium text-sm">{template.title}</h4>
                              <p className="text-slate-400 text-xs">{template.description}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className={`text-xs ${getCategoryColor(template.category)}`}>
                                  {template.category}
                                </Badge>
                                <span className="text-slate-500 text-xs">{template.estimatedHours}h</span>
                              </div>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="p-0 h-8 w-8"
                              onClick={() => addStepFromTemplate(template)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Custom Template Preview */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-purple-400">Template Preview</CardTitle>
                  <div className="text-sm text-slate-400">
                    {templateSteps.length} steps • {templateSteps.reduce((total, step) => total + step.estimatedHours, 0)} hours
                  </div>
                </CardHeader>
                <CardContent>
                  {templateSteps.length === 0 ? (
                    <div className="text-center py-8">
                      <Building className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 text-sm">Add steps to see template preview</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {templateSteps.map((step, index) => {
                        const Icon = getStepIcon(step.type)
                        return (
                          <div key={step.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center justify-center w-6 h-6 bg-blue-500 rounded-full text-xs text-white">
                                {index + 1}
                              </div>
                              <Icon className="h-4 w-4 text-blue-400" />
                              <div>
                                <div className="text-white font-medium text-sm">{step.title}</div>
                                <div className="text-slate-400 text-xs">{step.estimatedHours}h • {step.category}</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => editTemplateStep(step)}
                                className="p-0 h-8 w-8"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => removeTemplateStep(step.id)}
                                className="p-0 h-8 w-8 text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                      
                      <div className="mt-4 p-3 bg-slate-700/20 rounded-lg">
                        <div className="text-sm text-slate-300 mb-2">Template Summary</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-slate-400">Total Steps: <span className="text-white">{templateSteps.length}</span></div>
                          <div className="text-slate-400">Total Hours: <span className="text-white">{templateSteps.reduce((total, step) => total + step.estimatedHours, 0)}</span></div>
                          <div className="text-slate-400">Est. Days: <span className="text-white">{Math.ceil(templateSteps.reduce((total, step) => total + step.estimatedHours, 0) / 8)}</span></div>
                          <div className="text-slate-400">Required: <span className="text-white">{templateSteps.filter(s => s.required).length}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>

      {/* Step Editor Dialog */}
      <Dialog open={showStepEditor} onOpenChange={setShowStepEditor}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-blue-400">
              {currentEditingStep ? 'Edit Step' : 'Create Step'}
            </DialogTitle>
          </DialogHeader>
          {currentEditingStep && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Step Title</Label>
                                     <Input 
                     className="bg-slate-700 border-slate-600" 
                     value={currentEditingStep?.title || ""}
                     onChange={(e) => setCurrentEditingStep(prev => prev ? { ...prev, title: e.target.value } : null)}
                   />
                </div>
                <div>
                  <Label>Type</Label>
                                     <Select 
                     value={currentEditingStep?.type || ""} 
                     onValueChange={(value) => setCurrentEditingStep(prev => prev ? { ...prev, type: value as any } : null)}
                   >
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="setup">Setup</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="task">Task</SelectItem>
                      <SelectItem value="approval">Approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                                 <Textarea 
                   className="bg-slate-700 border-slate-600" 
                   value={currentEditingStep?.description || ""}
                   onChange={(e) => setCurrentEditingStep(prev => prev ? { ...prev, description: e.target.value } : null)}
                 />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select 
                    value={currentEditingStep.category} 
                    onValueChange={(value) => setCurrentEditingStep(prev => prev ? { ...prev, category: value as any } : null)}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="training">Training</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estimated Hours</Label>
                  <Input 
                    type="number" 
                    className="bg-slate-700 border-slate-600" 
                    value={currentEditingStep.estimatedHours}
                    onChange={(e) => setCurrentEditingStep(prev => prev ? { ...prev, estimatedHours: parseInt(e.target.value) || 1 } : null)}
                  />
                </div>
              </div>

              <div>
                <Label>Instructions</Label>
                <Textarea 
                  className="bg-slate-700 border-slate-600" 
                  placeholder="Detailed instructions for completing this step..."
                  value={currentEditingStep.instructions || ''}
                  onChange={(e) => setCurrentEditingStep(prev => prev ? { ...prev, instructions: e.target.value } : null)}
                />
              </div>

              <div>
                <Label>Assigned To</Label>
                <Input 
                  className="bg-slate-700 border-slate-600" 
                  placeholder="Who should complete this step?"
                  value={currentEditingStep.assignedTo || ''}
                  onChange={(e) => setCurrentEditingStep(prev => prev ? { ...prev, assignedTo: e.target.value } : null)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="required"
                  checked={currentEditingStep.required}
                  onCheckedChange={(checked) => setCurrentEditingStep(prev => prev ? { ...prev, required: checked as boolean } : null)}
                />
                <Label htmlFor="required">This step is required</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowStepEditor(false)} className="border-slate-600">
                  Cancel
                </Button>
                <Button onClick={() => currentEditingStep && updateTemplateStep(currentEditingStep)} className="bg-blue-600 hover:bg-blue-700">
                  Save Step
                </Button>
              </div>
            </div>
                     )}
         </DialogContent>
       </Dialog>

       {/* Welcome Email Dialog */}
       <Dialog open={showWelcomeEmailDialog} onOpenChange={setShowWelcomeEmailDialog}>
         <DialogContent className="max-w-3xl bg-slate-900 border-slate-700">
           <DialogHeader>
             <DialogTitle className="text-green-400">Send Welcome Email</DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             <div>
               <Label>To</Label>
               <Input 
                 className="bg-slate-700 border-slate-600" 
                 value={candidate?.email || ""}
                 disabled
               />
             </div>
             <div>
               <Label>Subject</Label>
               <Input 
                 className="bg-slate-700 border-slate-600" 
                 value={emailTemplate.subject}
                 onChange={(e) => setEmailTemplate(prev => ({ ...prev, subject: e.target.value }))}
               />
             </div>
             <div>
               <Label>Message</Label>
               <Textarea 
                 className="bg-slate-700 border-slate-600 h-64" 
                 value={emailTemplate.body}
                 onChange={(e) => setEmailTemplate(prev => ({ ...prev, body: e.target.value }))}
               />
             </div>
             <div>
               <Label>Attachments</Label>
               <div className="flex flex-wrap gap-2 mt-2">
                 {emailTemplate.attachments.map((attachment, i) => (
                   <Badge key={i} variant="outline" className="bg-blue-500/20 border-blue-500/30 text-blue-400">
                     {attachment}
                   </Badge>
                 ))}
               </div>
             </div>
             <div className="flex justify-end space-x-2">
               <Button variant="outline" onClick={() => setShowWelcomeEmailDialog(false)} className="border-slate-600">
                 Cancel
               </Button>
               <Button onClick={sendWelcomeEmail} className="bg-green-600 hover:bg-green-700">
                 <Mail className="h-4 w-4 mr-2" />
                 Send Email
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>

       {/* Meeting Scheduling Dialog */}
       <Dialog open={showSchedulingDialog} onOpenChange={setShowSchedulingDialog}>
         <DialogContent className="max-w-4xl bg-slate-900 border-slate-700">
           <DialogHeader>
             <DialogTitle className="text-blue-400">Schedule Onboarding Meetings</DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             {meetings.map((meeting, index) => (
               <Card key={meeting.id} className="bg-slate-800/30 border-slate-700/50">
                 <CardContent className="p-4">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                       <Label>Meeting Title</Label>
                       <Input 
                         className="bg-slate-700 border-slate-600" 
                         value={meeting.title}
                         onChange={(e) => {
                           const newMeetings = [...meetings]
                           newMeetings[index].title = e.target.value
                           setMeetings(newMeetings)
                         }}
                       />
                     </div>
                     <div>
                       <Label>Location</Label>
                       <Input 
                         className="bg-slate-700 border-slate-600" 
                         value={meeting.location}
                         onChange={(e) => {
                           const newMeetings = [...meetings]
                           newMeetings[index].location = e.target.value
                           setMeetings(newMeetings)
                         }}
                       />
                     </div>
                     <div>
                       <Label>Date</Label>
                       <Input 
                         type="date"
                         className="bg-slate-700 border-slate-600" 
                         value={meeting.date}
                         onChange={(e) => {
                           const newMeetings = [...meetings]
                           newMeetings[index].date = e.target.value
                           setMeetings(newMeetings)
                         }}
                       />
                     </div>
                     <div>
                       <Label>Time</Label>
                       <Input 
                         type="time"
                         className="bg-slate-700 border-slate-600" 
                         value={meeting.time}
                         onChange={(e) => {
                           const newMeetings = [...meetings]
                           newMeetings[index].time = e.target.value
                           setMeetings(newMeetings)
                         }}
                       />
                     </div>
                     <div className="md:col-span-2">
                       <Label>Notes</Label>
                       <Textarea 
                         className="bg-slate-700 border-slate-600" 
                         value={meeting.notes}
                         onChange={(e) => {
                           const newMeetings = [...meetings]
                           newMeetings[index].notes = e.target.value
                           setMeetings(newMeetings)
                         }}
                       />
                     </div>
                   </div>
                 </CardContent>
               </Card>
             ))}
             <Button 
               variant="outline" 
               className="w-full border-slate-600"
               onClick={() => setMeetings(prev => [...prev, {
                 id: `meeting-${Date.now()}`,
                 title: "New Meeting",
                 date: "",
                 time: "",
                 attendees: [],
                 location: "TBD",
                 notes: ""
               }])}
             >
               <Plus className="h-4 w-4 mr-2" />
               Add Meeting
             </Button>
             <div className="flex justify-end space-x-2">
               <Button variant="outline" onClick={() => setShowSchedulingDialog(false)} className="border-slate-600">
                 Cancel
               </Button>
               <Button onClick={scheduleMeetings} className="bg-blue-600 hover:bg-blue-700">
                 <Calendar className="h-4 w-4 mr-2" />
                 Schedule Meetings
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>

       {/* Access Setup Dialog */}
       <Dialog open={showAccessSetupDialog} onOpenChange={setShowAccessSetupDialog}>
         <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
           <DialogHeader>
             <DialogTitle className="text-purple-400">Setup Access & Accounts</DialogTitle>
           </DialogHeader>
           <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <Card className="bg-slate-800/30 border-slate-700/50">
                 <CardHeader>
                   <CardTitle className="text-sm text-blue-400">Digital Access</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-3">
                   <div className="flex items-center space-x-2">
                     <Checkbox 
                       id="email"
                       checked={accessSetup.email}
                       onCheckedChange={(checked) => setAccessSetup(prev => ({ ...prev, email: checked as boolean }))}
                     />
                     <Label htmlFor="email">Email Account</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <Checkbox 
                       id="system"
                       checked={accessSetup.systemAccess}
                       onCheckedChange={(checked) => setAccessSetup(prev => ({ ...prev, systemAccess: checked as boolean }))}
                     />
                     <Label htmlFor="system">System Access</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <Checkbox 
                       id="software"
                       checked={accessSetup.softwareLicenses}
                       onCheckedChange={(checked) => setAccessSetup(prev => ({ ...prev, softwareLicenses: checked as boolean }))}
                     />
                     <Label htmlFor="software">Software Licenses</Label>
                   </div>
                 </CardContent>
               </Card>

               <Card className="bg-slate-800/30 border-slate-700/50">
                 <CardHeader>
                   <CardTitle className="text-sm text-green-400">Physical Access</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-3">
                   <div className="flex items-center space-x-2">
                     <Checkbox 
                       id="badge"
                       checked={accessSetup.securityBadge}
                       onCheckedChange={(checked) => setAccessSetup(prev => ({ ...prev, securityBadge: checked as boolean }))}
                     />
                     <Label htmlFor="badge">Security Badge</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <Checkbox 
                       id="parking"
                       checked={accessSetup.parkingPass}
                       onCheckedChange={(checked) => setAccessSetup(prev => ({ ...prev, parkingPass: checked as boolean }))}
                     />
                     <Label htmlFor="parking">Parking Pass</Label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <Checkbox 
                       id="uniforms"
                       checked={accessSetup.uniforms}
                       onCheckedChange={(checked) => setAccessSetup(prev => ({ ...prev, uniforms: checked as boolean }))}
                     />
                     <Label htmlFor="uniforms">Uniforms & Equipment</Label>
                   </div>
                 </CardContent>
               </Card>
             </div>

             <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
               <h4 className="text-white font-medium mb-2">Access Summary</h4>
               <div className="text-sm text-slate-400">
                 {Object.entries(accessSetup).filter(([_, enabled]) => enabled).length > 0 ? (
                   <div>
                     Selected items: {Object.entries(accessSetup)
                       .filter(([_, enabled]) => enabled)
                       .map(([key, _]) => key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()))
                       .join(', ')}
                   </div>
                 ) : (
                   <div>No access items selected</div>
                 )}
               </div>
             </div>

             <div className="flex justify-end space-x-2">
               <Button variant="outline" onClick={() => setShowAccessSetupDialog(false)} className="border-slate-600">
                 Cancel
               </Button>
               <Button onClick={setupAccess} className="bg-purple-600 hover:bg-purple-700">
                 <Settings className="h-4 w-4 mr-2" />
                 Setup Access
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>

       {/* Account Creation Result Dialog */}
       <Dialog open={showAccountCreationDialog} onOpenChange={setShowAccountCreationDialog}>
         <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
           <DialogHeader>
             <DialogTitle className="text-green-400 flex items-center">
               <CheckCircle className="h-5 w-5 mr-2" />
               Staff Account Created Successfully
             </DialogTitle>
           </DialogHeader>
           <div className="space-y-6">
             {accountCreationResult && (
               <div className="space-y-4">
                 <div className="bg-slate-800/50 rounded-lg p-4">
                   <h4 className="text-white font-medium mb-3">Account Details</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                     <div>
                       <span className="text-slate-400">Name:</span>
                       <span className="text-white ml-2">{accountCreationResult.staff_profile.name}</span>
                     </div>
                     <div>
                       <span className="text-slate-400">Email:</span>
                       <span className="text-white ml-2">{accountCreationResult.user_account.email}</span>
                     </div>
                     <div>
                       <span className="text-slate-400">Position:</span>
                       <span className="text-white ml-2">{accountCreationResult.staff_profile.role}</span>
                     </div>
                     <div>
                       <span className="text-slate-400">Department:</span>
                       <span className="text-white ml-2">{accountCreationResult.staff_profile.department}</span>
                     </div>
                     <div>
                       <span className="text-slate-400">Account Type:</span>
                       <span className="text-white ml-2">
                         {accountCreationResult.user_account.existing_user ? 'Existing User' : 'New User'}
                       </span>
                     </div>
                     {!accountCreationResult.user_account.existing_user && accountCreationResult.user_account.temp_password && (
                       <div className="col-span-2">
                         <span className="text-slate-400">Temporary Password:</span>
                         <div className="flex items-center space-x-2 mt-1">
                           <code className="bg-slate-700 px-2 py-1 rounded text-green-400 font-mono">
                             {accountCreationResult.user_account.temp_password}
                           </code>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => navigator.clipboard.writeText(accountCreationResult.user_account.temp_password)}
                             className="border-slate-600"
                           >
                             <Copy className="h-3 w-3" />
                           </Button>
                         </div>
                       </div>
                     )}
                   </div>
                 </div>

                 <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                   <h4 className="text-blue-400 font-medium mb-2 flex items-center">
                     <Mail className="h-4 w-4 mr-2" />
                     Next Steps
                   </h4>
                   <ul className="text-slate-300 text-sm space-y-1">
                     <li>• Welcome email sent to {accountCreationResult.user_account.email}</li>
                     <li>• Staff member can now log in to the platform</li>
                     <li>• Complete the onboarding process to grant full access</li>
                     <li>• Review and adjust permissions as needed</li>
                   </ul>
                 </div>
               </div>
             )}
             
             <div className="flex justify-end space-x-3">
               <Button variant="outline" onClick={() => setShowAccountCreationDialog(false)}>
                 Close
               </Button>
               <Button 
                 onClick={() => {
                   setShowAccountCreationDialog(false)
                   startOnboardingProcess()
                 }}
                 className="bg-green-600 hover:bg-green-700"
               >
                 <Play className="h-4 w-4 mr-2" />
                 Start Onboarding Process
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>
    </Dialog>
  )
} 