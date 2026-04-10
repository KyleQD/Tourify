"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { 
  Loader2, Search, UserPlus, Mail, Phone, MapPin, DollarSign, Calendar, 
  Users, Briefcase, Star, Award, CheckCircle, Clock, Zap, BrainCircuit,
  ExternalLink, Copy, Share2, Link, Lock, Unlock, EyeOff, AlertCircle,
  Info, HelpCircle, File, Folder, Image, Music, Headphones, Camera,
  Volume1, Maximize, Minimize, Move, RefreshCw, RotateCw, ZoomIn, ZoomOut,
  Crop, Scissors, Type, Bold, Italic, Underline, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, Quote, Code, Link2, Unlink,
  Table, Grid, Columns, Rows, Trash2, Edit, Eye, Download, Upload,
  Send, Bell, RadioTower, Wifi, Mic, Video, PhoneCall, X, RotateCcw,
  Play, Pause, Volume2, VolumeX, Sparkles, Building, Globe, Crown,
  Shield, Target, Activity, TrendingUp, BarChart3, MessageSquare,
  FileText, Download as DownloadIcon, Upload as UploadIcon
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"

interface EnhancedAddStaffDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (staff: any) => void
  existingProfiles: { id: string; name: string; email: string; avatar?: string; skills?: string[] }[]
  venueId?: string
}

interface PositionDetails {
  title: string
  description: string
  department: string
  employmentType: 'full_time' | 'part_time' | 'contractor' | 'volunteer' | 'intern'
  startDate?: string
  endDate?: string
  location?: string
  compensation?: string
  hourlyRate?: number
  salary?: number
  benefits?: string[]
  requiredSkills?: string[]
  preferredSkills?: string[]
}

interface OnboardingTemplate {
  id: string
  name: string
  description: string
  department: string
  position: string
  employmentType: string
  fields: OnboardingField[]
  estimatedDays: number
  requiredDocuments: string[]
  isDefault: boolean
  useCount: number
}

interface OnboardingField {
  id: string
  type: 'text' | 'email' | 'phone' | 'date' | 'select' | 'multiselect' | 'textarea' | 'file' | 'checkbox' | 'number' | 'address' | 'emergency_contact' | 'bank_info' | 'tax_info' | 'id_document'
  label: string
  required: boolean
  placeholder?: string
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    custom?: string
  }
  helpText?: string
  order: number
  section: string
}

interface InviteMethod {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  features: string[]
}

export function EnhancedAddStaffDialog({ open, onOpenChange, onAdd, existingProfiles, venueId }: EnhancedAddStaffDialogProps) {
  const [currentStep, setCurrentStep] = React.useState(1)
  const [inviteMethod, setInviteMethod] = React.useState<string>('')
  const [search, setSearch] = React.useState("")
  const [selectedProfile, setSelectedProfile] = React.useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = React.useState("")
  const [invitePhone, setInvitePhone] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [onboardingTemplates, setOnboardingTemplates] = React.useState<OnboardingTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(null)
  const [positionDetails, setPositionDetails] = React.useState<PositionDetails>({
    title: "",
    description: "",
    department: "",
    employmentType: 'full_time',
    startDate: "",
    location: "",
    compensation: "",
    benefits: [],
    requiredSkills: [],
    preferredSkills: []
  })
  const [inviteMessage, setInviteMessage] = React.useState("")
  const [inviteLink, setInviteLink] = React.useState("")
  const [showAdvancedOptions, setShowAdvancedOptions] = React.useState(false)
  const { toast } = useToast()

  function buildNoStoreInit(input?: RequestInit): RequestInit {
    return {
      credentials: "include",
      cache: "no-store",
      ...input,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...(input?.headers || {}),
      },
    }
  }

  // Invite methods configuration
  const inviteMethods: InviteMethod[] = [
    {
      id: 'existing',
      name: 'Add Existing User',
      description: 'Invite someone already on the platform',
      icon: <Users className="h-6 w-6" />,
      features: [
        'Instant team addition',
        'No account creation needed',
        'Immediate access to team features',
        'Existing profile and skills visible'
      ]
    },
    {
      id: 'email',
      name: 'Email Invitation',
      description: 'Send professional email invitation',
      icon: <Mail className="h-6 w-6" />,
      features: [
        'Professional email template',
        'Direct signup link',
        'Role-specific onboarding',
        'Track invitation status'
      ]
    },
    {
      id: 'link',
      name: 'Invitation Link',
      description: 'Generate shareable invitation link',
      icon: <Link2 className="h-6 w-6" />,
      features: [
        'Share via any platform',
        'Bulk invitations possible',
        'Custom expiration time',
        'Analytics tracking'
      ]
    },
    {
      id: 'qr',
      name: 'QR Code Invitation',
      description: 'Generate QR code for in-person invites',
      icon: <QrCode className="h-6 w-6" />,
      features: [
        'Perfect for events',
        'Instant mobile signup',
        'No typing required',
        'Offline sharing'
      ]
    }
  ]

  // Fetch onboarding templates when dialog opens
  const fetchOnboardingTemplates = React.useCallback(async () => {
    try {
      const response = await fetch(
        "/api/admin/onboarding/templates" + (venueId ? `?venue_id=${venueId}` : ''),
        buildNoStoreInit()
      )
      if (response.ok) {
        const data = await response.json()
        setOnboardingTemplates(data.templates || [])
        // Auto-select default template
        const defaultTemplate = data.templates?.find((t: OnboardingTemplate) => t.isDefault)
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate.id)
        }
      }
    } catch (error) {
      console.error("Error fetching onboarding templates:", error)
    }
  }, [venueId])

  React.useEffect(() => {
    if (open)
      void fetchOnboardingTemplates()
  }, [open, fetchOnboardingTemplates])

  const filteredProfiles = React.useMemo(() => {
    return existingProfiles.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.skills?.some(skill => skill.toLowerCase().includes(search.toLowerCase()))
    )
  }, [existingProfiles, search])

  const selectedTemplateData = onboardingTemplates.find(t => t.id === selectedTemplate)

  async function handleAddExisting() {
    const profile = existingProfiles.find(p => p.id === selectedProfile)
    if (profile) {
      setIsLoading(true)
      try {
        // Send notification to the selected user
        await fetch("/api/notifications", buildNoStoreInit({
          method: "POST",
          body: JSON.stringify({
            type: "staff_invite",
            data: {
              userId: profile.id,
              positionDetails,
              status: "pending",
              onboardingTemplateId: selectedTemplate,
              inviteMessage
            }
          })
        }))
        
        onAdd({ 
          ...profile, 
          positionDetails, 
          status: "pending",
          onboardingTemplateId: selectedTemplate
        })
        toast({ 
          title: "Invitation sent", 
          description: `Position invitation sent to ${profile.name}. They will be notified to accept or decline, and complete onboarding when accepted.` 
        })
        onOpenChange(false)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to send invitation. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  async function handleEmailInvite() {
    if (inviteEmail) {
      setIsLoading(true)
      try {
        // Generate a unique invitation link
        const inviteToken = crypto.randomUUID()
        
        // Store the invitation in the database with onboarding template
        await fetch("/api/invitations", buildNoStoreInit({
          method: "POST",
          body: JSON.stringify({
            email: inviteEmail,
            phone: invitePhone,
            positionDetails,
            token: inviteToken,
            status: "pending",
            onboardingTemplateId: selectedTemplate,
            inviteMessage
          })
        }))

        // Send email with signup link
        await fetch("/api/notifications", buildNoStoreInit({
          method: "POST",
          body: JSON.stringify({
            type: "staff_signup_invite",
            data: {
              email: inviteEmail,
              phone: invitePhone,
              positionDetails,
              signupLink: `${window.location.origin}/login?token=${inviteToken}`,
              inviteMessage
            }
          })
        }))

        onAdd({ 
          email: inviteEmail, 
          phone: invitePhone, 
          positionDetails, 
          status: "pending",
          token: inviteToken,
          onboardingTemplateId: selectedTemplate
        })
        
        toast({ 
          title: "Invitation sent", 
          description: `Signup invitation sent to ${inviteEmail}. They will complete onboarding after account creation.` 
        })
        onOpenChange(false)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to send invitation. Please try again.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  async function generateInviteLink() {
    setIsLoading(true)
    try {
      const inviteToken = crypto.randomUUID()
              const link = `${window.location.origin}/login?token=${inviteToken}&position=${encodeURIComponent(positionDetails.title)}&department=${encodeURIComponent(positionDetails.department)}`
      
      // Store the invitation
      await fetch("/api/invitations", buildNoStoreInit({
        method: "POST",
        body: JSON.stringify({
          positionDetails,
          token: inviteToken,
          status: "pending",
          onboardingTemplateId: selectedTemplate,
          inviteMessage
        })
      }))

      setInviteLink(link)
      toast({ 
        title: "Invitation link generated", 
        description: "Share this link with potential team members." 
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate invitation link. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast({ 
      title: "Copied to clipboard", 
      description: "Invitation link copied successfully." 
    })
  }

  function resetForm() {
    setCurrentStep(1)
    setInviteMethod('')
    setSearch("")
    setSelectedProfile(null)
    setInviteEmail("")
    setInvitePhone("")
    setSelectedTemplate(null)
    setPositionDetails({
      title: "",
      description: "",
      department: "",
      employmentType: 'full_time',
      startDate: "",
      location: "",
      compensation: "",
      benefits: [],
      requiredSkills: [],
      preferredSkills: []
    })
    setInviteMessage("")
    setInviteLink("")
    setShowAdvancedOptions(false)
  }

  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Enhanced Team Onboarding
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Comprehensive staff addition with role-based onboarding and network effects
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-400">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <AnimatePresence mode="wait">
            {/* Step 1: Invite Method Selection */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Choose Invitation Method</h3>
                  <p className="text-slate-400 mb-6">
                    Select the best way to invite your new team member based on your needs and their situation.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inviteMethods.map((method) => (
                    <Card
                      key={method.id}
                      className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                        inviteMethod === method.id
                          ? 'ring-2 ring-purple-500 bg-purple-500/10 border-purple-500/50'
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      }`}
                      onClick={() => setInviteMethod(method.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className={`p-3 rounded-lg ${
                            inviteMethod === method.id ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-700 text-slate-400'
                          }`}>
                            {method.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-white mb-1">{method.name}</h4>
                            <p className="text-sm text-slate-400 mb-3">{method.description}</p>
                            <ul className="space-y-1">
                              {method.features.map((feature, index) => (
                                <li key={index} className="text-xs text-slate-500 flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Position Details */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Position Details</h3>
                  <p className="text-slate-400 mb-6">
                    Define the role, responsibilities, and requirements for this position.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Position Title *</Label>
                      <Input
                        placeholder="e.g., Sound Engineer, Event Manager"
                        value={positionDetails.title}
                        onChange={e => setPositionDetails(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Department *</Label>
                      <Select
                        value={positionDetails.department}
                        onValueChange={value => setPositionDetails(prev => ({ ...prev, department: value }))}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="production">Production</SelectItem>
                          <SelectItem value="audio">Audio</SelectItem>
                          <SelectItem value="lighting">Lighting</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="operations">Operations</SelectItem>
                          <SelectItem value="marketing">Marketing</SelectItem>
                          <SelectItem value="sales">Sales</SelectItem>
                          <SelectItem value="management">Management</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white">Employment Type *</Label>
                      <Select
                        value={positionDetails.employmentType}
                        onValueChange={value => setPositionDetails(prev => ({ ...prev, employmentType: value as any }))}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="full_time">Full Time</SelectItem>
                          <SelectItem value="part_time">Part Time</SelectItem>
                          <SelectItem value="contractor">Contractor</SelectItem>
                          <SelectItem value="volunteer">Volunteer</SelectItem>
                          <SelectItem value="intern">Intern</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-white">Location</Label>
                      <Input
                        placeholder="e.g., Venue Name, City, State"
                        value={positionDetails.location}
                        onChange={e => setPositionDetails(prev => ({ ...prev, location: e.target.value }))}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Start Date</Label>
                      <Input
                        type="date"
                        value={positionDetails.startDate}
                        onChange={e => setPositionDetails(prev => ({ ...prev, startDate: e.target.value }))}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Compensation</Label>
                      <Input
                        placeholder="e.g., $25/hour, $50,000/year, Negotiable"
                        value={positionDetails.compensation}
                        onChange={e => setPositionDetails(prev => ({ ...prev, compensation: e.target.value }))}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>

                    <div>
                      <Label className="text-white">Description</Label>
                      <Textarea
                        placeholder="Describe the role, responsibilities, and what makes this position unique..."
                        value={positionDetails.description}
                        onChange={e => setPositionDetails(prev => ({ ...prev, description: e.target.value }))}
                        className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="border-slate-700 text-slate-300"
                >
                  {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
                </Button>

                {showAdvancedOptions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 p-4 bg-slate-800/50 rounded-lg"
                  >
                    <h4 className="font-medium text-white">Advanced Position Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-slate-300">Required Skills</Label>
                        <Textarea
                          placeholder="Enter required skills, one per line"
                          value={positionDetails.requiredSkills?.join('\n')}
                          onChange={e => setPositionDetails(prev => ({ 
                            ...prev, 
                            requiredSkills: e.target.value.split('\n').filter(s => s.trim()) 
                          }))}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Preferred Skills</Label>
                        <Textarea
                          placeholder="Enter preferred skills, one per line"
                          value={positionDetails.preferredSkills?.join('\n')}
                          onChange={e => setPositionDetails(prev => ({ 
                            ...prev, 
                            preferredSkills: e.target.value.split('\n').filter(s => s.trim()) 
                          }))}
                          className="bg-slate-700 border-slate-600 text-white"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 3: Onboarding Template Selection */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Onboarding Experience</h3>
                  <p className="text-slate-400 mb-6">
                    Select an onboarding template that matches the role and experience level.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {onboardingTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                        selectedTemplate === template.id
                          ? 'ring-2 ring-purple-500 bg-purple-500/10 border-purple-500/50'
                          : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      }`}
                      onClick={() => setSelectedTemplate(template.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-white">{template.name}</h4>
                            <p className="text-sm text-slate-400">{template.department} • {template.position}</p>
                          </div>
                          {template.isDefault && (
                            <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mb-3">{template.description}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{template.estimatedDays} days estimated</span>
                          <span>{template.useCount} times used</span>
                        </div>
                        <div className="mt-3">
                          <div className="text-xs text-slate-500 mb-1">Required Documents:</div>
                          <div className="flex flex-wrap gap-1">
                            {template.requiredDocuments.slice(0, 3).map((doc, index) => (
                              <Badge key={index} variant="outline" className="text-xs bg-slate-700/50">
                                {doc}
                              </Badge>
                            ))}
                            {template.requiredDocuments.length > 3 && (
                              <Badge variant="outline" className="text-xs bg-slate-700/50">
                                +{template.requiredDocuments.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {selectedTemplateData && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Template Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedTemplateData.fields
                          .sort((a, b) => a.order - b.order)
                          .map((field) => (
                            <div key={field.id} className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${
                                field.required ? 'bg-red-500' : 'bg-slate-500'
                              }`} />
                              <span className="text-sm text-slate-300">{field.label}</span>
                              <Badge variant="outline" className="text-xs bg-slate-700/50">
                                {field.type}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {/* Step 4: Invitation Details */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Send Invitation</h3>
                  <p className="text-slate-400 mb-6">
                    Complete the invitation details and send to your new team member.
                  </p>
                </div>

                {inviteMethod === 'existing' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Search Existing Users</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Search by name, email, or skills..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                          className="pl-10 bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                    </div>

                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {filteredProfiles.map((profile) => (
                          <Card
                            key={profile.id}
                            className={`cursor-pointer transition-all duration-200 ${
                              selectedProfile === profile.id
                                ? 'ring-2 ring-purple-500 bg-purple-500/10 border-purple-500/50'
                                : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                            }`}
                            onClick={() => setSelectedProfile(profile.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={profile.avatar} />
                                  <AvatarFallback className="bg-slate-700 text-white">
                                    {profile.name.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <h4 className="font-medium text-white">{profile.name}</h4>
                                  <p className="text-sm text-slate-400">{profile.email}</p>
                                  {profile.skills && profile.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {profile.skills.slice(0, 3).map((skill, index) => (
                                        <Badge key={index} variant="outline" className="text-xs bg-slate-700/50">
                                          {skill}
                                        </Badge>
                                      ))}
                                      {profile.skills.length > 3 && (
                                        <Badge variant="outline" className="text-xs bg-slate-700/50">
                                          +{profile.skills.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {selectedProfile === profile.id && (
                                  <CheckCircle className="h-5 w-5 text-purple-500" />
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {inviteMethod === 'email' && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-white">Email Address *</Label>
                      <Input
                        type="email"
                        placeholder="Enter email address"
                        value={inviteEmail}
                        onChange={e => setInviteEmail(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-white">Phone Number (Optional)</Label>
                      <Input
                        type="tel"
                        placeholder="Enter phone number"
                        value={invitePhone}
                        onChange={e => setInvitePhone(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                )}

                {inviteMethod === 'link' && (
                  <div className="space-y-4">
                    {!inviteLink ? (
                      <div className="text-center py-8">
                        <Link2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <p className="text-slate-400 mb-4">Generate a shareable invitation link</p>
                        <Button onClick={generateInviteLink} disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Link2 className="mr-2 h-4 w-4" />
                              Generate Link
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-white">Invitation Link</Label>
                          <div className="flex space-x-2">
                            <Input
                              value={inviteLink}
                              readOnly
                              className="bg-slate-800 border-slate-700 text-white"
                            />
                            <Button
                              variant="outline"
                              onClick={() => copyToClipboard(inviteLink)}
                              className="border-slate-700 text-slate-300"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => window.open(inviteLink, '_blank')}
                              className="border-slate-700 text-slate-300"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({
                                  title: 'Join Our Team',
                                  text: `You've been invited to join as ${positionDetails.title}`,
                                  url: inviteLink
                                })
                              }
                            }}
                            className="border-slate-700 text-slate-300"
                          >
                            <Share2 className="mr-2 h-4 w-4" />
                            Share
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-white">Personal Message (Optional)</Label>
                  <Textarea
                    placeholder="Add a personal touch to your invitation..."
                    value={inviteMessage}
                    onChange={e => setInviteMessage(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    rows={3}
                  />
                </div>

                {/* Summary Card */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Invitation Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Position:</span>
                        <p className="text-white font-medium">{positionDetails.title}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Department:</span>
                        <p className="text-white font-medium">{positionDetails.department}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Employment Type:</span>
                        <p className="text-white font-medium capitalize">{positionDetails.employmentType.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Onboarding Template:</span>
                        <p className="text-white font-medium">{selectedTemplateData?.name || 'Default'}</p>
                      </div>
                    </div>
                    {positionDetails.description && (
                      <div>
                        <span className="text-slate-400 text-sm">Description:</span>
                        <p className="text-white text-sm mt-1">{positionDetails.description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep(currentStep - 1)
              } else {
                onOpenChange(false)
                resetForm()
              }
            }}
            className="border-slate-700 text-slate-300"
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          <div className="flex space-x-2">
            {currentStep < totalSteps && (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={
                  (currentStep === 1 && !inviteMethod) ||
                  (currentStep === 2 && (!positionDetails.title || !positionDetails.department)) ||
                  (currentStep === 3 && !selectedTemplate)
                }
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Next
              </Button>
            )}

            {currentStep === totalSteps && (
              <Button
                onClick={
                  inviteMethod === 'existing' ? handleAddExisting :
                  inviteMethod === 'email' ? handleEmailInvite :
                  () => {}
                }
                disabled={
                  isLoading ||
                  (inviteMethod === 'existing' && !selectedProfile) ||
                  (inviteMethod === 'email' && !inviteEmail) ||
                  (inviteMethod === 'link' && !inviteLink)
                }
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// QrCode icon component (since it's not in lucide-react)
function QrCode(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </svg>
  )
} 