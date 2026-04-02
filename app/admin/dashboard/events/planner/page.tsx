"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Calendar, 
  Plus, 
  MapPin, 
  Users, 
  DollarSign, 
  Clock, 
  Ticket,
  Settings,
  Eye,
  CheckCircle,
  Circle,
  ChevronRight,
  ChevronLeft,
  Save,
  Rocket,
  Palette,
  Building,
  MegaphoneIcon,
  CreditCard,
  UserCog,
  BarChart3,
  ArrowLeft,
  AlertTriangle,
  Star,
  Phone,
  Mail,
  Edit3,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Search,
  UserPlus,
  MessageSquare,
  Send,
  Mic,
  Building2,
  User,
  Music,
  Award,
  Sparkles
} from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { toast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { formatSafeCurrency, formatSafeNumber } from "@/lib/format/number-format"

// Event Planning Steps
const PLANNING_STEPS = [
  {
    id: 1,
    title: "Event Initiation",
    subtitle: "The Blank Canvas",
    icon: Palette,
    description: "Define your event foundation with templates and basic details"
  },
  {
    id: 2,
    title: "Venue & Schedule",
    subtitle: "Laying the Foundation", 
    icon: Building,
    description: "Choose venues, build schedules, and optimize logistics"
  },
  {
    id: 3,
    title: "Ticketing & Registration",
    subtitle: "Your Audience, Secured",
    icon: Ticket,
    description: "Create ticket types, registration forms, and pricing"
  },
  {
    id: 4,
    title: "Team & Permissions",
    subtitle: "Orchestrating Your Crew",
    icon: UserCog,
    description: "Assign roles, manage permissions, and coordinate teams"
  },
  {
    id: 5,
    title: "Marketing & Promotion",
    subtitle: "Spreading the Word",
    icon: MegaphoneIcon,
    description: "Build campaigns, create content, and reach your audience"
  },
  {
    id: 6,
    title: "Financials & Reporting",
    subtitle: "Keeping the Books Balanced",
    icon: BarChart3,
    description: "Track budgets, manage payments, and monitor revenue"
  },
  {
    id: 7,
    title: "Review & Publish",
    subtitle: "Launch Sequence Engaged!",
    icon: Rocket,
    description: "Final checks, preview, and launch your event"
  }
]

// Event Templates
const EVENT_TEMPLATES = [
  {
    id: "concert-tour",
    name: "Concert Tour",
    description: "Multi-city music tour with venues, logistics, and fan engagement",
    icon: Music,
    category: "Music",
    color: "from-purple-500 via-fuchsia-500 to-pink-600",
    presets: {
      eventType: "concert",
      duration: 180,
      ticketTypes: ["General Admission", "VIP", "Meet & Greet"],
      requiredStaff: ["Tour Manager", "Sound Engineer", "Security"]
    }
  },
  {
    id: "conference",
    name: "Conference",
    description: "Professional conference with speakers, workshops, and networking",
    icon: Users,
    category: "Business",
    color: "from-blue-500 via-cyan-500 to-teal-600",
    presets: {
      eventType: "conference",
      duration: 480,
      ticketTypes: ["Early Bird", "Regular", "Student"],
      requiredStaff: ["Event Coordinator", "AV Technician", "Registration"]
    }
  },
  {
    id: "festival",
    name: "Festival",
    description: "Multi-day festival with multiple stages and activities",
    icon: Calendar,
    category: "Entertainment",
    color: "from-green-500 via-emerald-500 to-teal-600",
    presets: {
      eventType: "festival",
      duration: 720,
      ticketTypes: ["Single Day", "Weekend Pass", "VIP Experience"],
      requiredStaff: ["Festival Director", "Stage Managers", "Security Team"]
    }
  },
  {
    id: "corporate-gala",
    name: "Corporate Gala",
    description: "Elegant corporate event with dinner, entertainment, and awards",
    icon: Award,
    category: "Corporate",
    color: "from-yellow-500 via-amber-500 to-orange-600",
    presets: {
      eventType: "gala",
      duration: 240,
      ticketTypes: ["Individual", "Corporate Table", "Sponsor Package"],
      requiredStaff: ["Event Planner", "Catering Manager", "MC"]
    }
  },
  {
    id: "product-launch",
    name: "Product Launch",
    description: "High-impact product unveiling with media and stakeholders",
    icon: Rocket,
    category: "Marketing",
    color: "from-pink-500 via-rose-500 to-red-600",
    presets: {
      eventType: "launch",
      duration: 120,
      ticketTypes: ["Media", "Industry", "Investor"],
      requiredStaff: ["Marketing Director", "PR Manager", "Demo Specialist"]
    }
  },
  {
    id: "custom",
    name: "Custom Event",
    description: "Start from scratch with complete flexibility",
    icon: Sparkles,
    category: "Custom",
    color: "from-indigo-500 via-purple-500 to-violet-600",
    presets: {
      eventType: "custom",
      duration: 240,
      ticketTypes: ["General"],
      requiredStaff: ["Event Manager"]
    }
  }
]

interface EventPlannerData {
  // Step 1: Event Initiation
  name: string
  description: string
  template: string
  eventType: string
  primaryContact: string
  estimatedBudget: number
  privacy: "public" | "private" | "invite-only"
  
  // Step 2: Venue & Schedule
  venues: Array<{
    id: string
    name: string
    address: string
    capacity: number
    selectedDate: string
    selectedTime: string
  }>
  schedule: Array<{
    id: string
    title: string
    startTime: string
    endTime: string
    venue: string
    type: string
  }>
  
  // Step 3: Ticketing & Registration
  ticketTypes: Array<{
    id: string
    name: string
    price: number
    quantity: number
    description: string
    maxPerCustomer: number
  }>
  registrationForms: Array<{
    field: string
    type: string
    required: boolean
    options?: string[]
  }>
  promoCodes: Array<{
    code: string
    discount: number
    type: "percentage" | "fixed"
    maxUses: number
  }>
  
  // Step 4: Team & Permissions
  teamMembers: Array<{
    id: string
    name: string
    email: string
    role: string
    permissions: string[]
    status: "pending" | "accepted" | "declined"
  }>
  
  // Step 5: Marketing & Promotion
  campaigns: Array<{
    id: string
    name: string
    type: string
    status: string
    budget: number
    platform: string
    startDate: string
    endDate: string
    targetAudience: string
    goals: string
    content: Array<{
      id: string
      title: string
      type: string
      description: string
      scheduledDate: string
      status: string
      createdAt: string
    }>
    metrics: {
      reach: number
      engagement: number
      clicks: number
      conversions: number
    }
  }>
  
  // Step 6: Financials
  budget: {
    categories: Array<{
      name: string
      allocated: number
      spent: number
    }>
    totalBudget: number
    expectedRevenue: number
  }
  
  // Step 7: Review & Publish
  checklist: Array<{
    item: string
    completed: boolean
    required: boolean
  }>
  publishStatus: "draft" | "review" | "published"
}

export default function EventPlannerPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [eventData, setEventData] = useState<EventPlannerData>({
    // Default values
    name: "",
    description: "",
    template: "",
    eventType: "",
    primaryContact: "",
    estimatedBudget: 0,
    privacy: "public",
    venues: [],
    schedule: [],
    ticketTypes: [],
    registrationForms: [],
    promoCodes: [],
    teamMembers: [],
    campaigns: [],
    budget: {
      categories: [],
      totalBudget: 0,
      expectedRevenue: 0
    },
    checklist: [],
    publishStatus: "draft"
  })

  // Calculate completion percentage
  const calculateProgress = () => {
    let totalItems = 0
    let completedItems = 0
    
    // Step 1 - Event Initiation
    totalItems += 6
    if (eventData.name) completedItems++
    if (eventData.description) completedItems++
    if (eventData.template) completedItems++
    if (eventData.eventType) completedItems++
    if (eventData.primaryContact) completedItems++
    if (eventData.estimatedBudget > 0) completedItems++
    
    // Add other steps calculations...
    // Step 2 - Venue & Schedule
    totalItems += 2
    if (eventData.venues.length > 0) completedItems++
    if (eventData.schedule.length > 0) completedItems++
    
    // Step 3 - Ticketing & Registration
    totalItems += 2
    if (eventData.ticketTypes.length > 0) completedItems++
    if (eventData.registrationForms.length > 0) completedItems++
    
    // Continue for other steps...
    
    return Math.round((completedItems / totalItems) * 100)
  }

  const progress = calculateProgress()

  const updateEventData = (updates: Partial<EventPlannerData>) => {
    setEventData(prev => ({ ...prev, ...updates }))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Save event data to API
      const response = await fetch('/api/events/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })
      
      if (!response.ok) throw new Error('Failed to save event')
      
      toast({
        title: "Event Saved",
        description: "Your event has been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleNextStep = () => {
    if (currentStep < PLANNING_STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handlePublish = async () => {
    setIsLoading(true)
    try {
      // Publish event
      const response = await fetch('/api/events/planner/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...eventData, publishStatus: "published" })
      })
      
      if (!response.ok) throw new Error('Failed to publish event')
      
      updateEventData({ publishStatus: "published" })
      
      toast({
        title: "🚀 Event Published!",
        description: "Your event is now live and accessible to your audience.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish event. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950/20">
      {/* Header */}
      <div className="border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Events
              </Button>
              <div className="h-6 w-px bg-slate-700" />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {eventData.name || "New Event"}
                </h1>
                <p className="text-sm text-slate-400">
                  Step {currentStep} of {PLANNING_STEPS.length}: {PLANNING_STEPS[currentStep - 1]?.title}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-sm font-medium text-white">{progress}% Complete</div>
                <Progress value={progress} className="w-32 h-1.5 bg-slate-800" />
              </div>
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isLoading}
                className="border-slate-700 hover:border-slate-600"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              {currentStep === PLANNING_STEPS.length && (
                <Button
                  onClick={handlePublish}
                  disabled={isLoading || progress < 80}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Rocket className="h-4 w-4 mr-2" />
                  Publish Event
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Step Navigation Sidebar */}
          <div className="col-span-3">
            <Card className="bg-slate-900/50 border-slate-700/50 sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg text-white">Planning Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {PLANNING_STEPS.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      currentStep === step.id
                        ? "bg-purple-600/20 border border-purple-500/50 text-white"
                        : "hover:bg-slate-800/50 text-slate-300 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-md ${
                        currentStep === step.id ? "bg-purple-500/20" : "bg-slate-800"
                      }`}>
                        {(() => {
                          const IconComponent = step.icon
                          return <IconComponent className="h-4 w-4" />
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{step.title}</span>
                          {index < currentStep - 1 ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-500" />
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{step.subtitle}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="col-span-9">
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-white flex items-center">
                      {(() => {
                        const IconComponent = PLANNING_STEPS[currentStep - 1]?.icon
                        return IconComponent ? <IconComponent className="h-5 w-5 mr-3" /> : null
                      })()}
                      <span className="ml-3">{PLANNING_STEPS[currentStep - 1]?.title}</span>
                    </CardTitle>
                    <p className="text-slate-400 mt-1">
                      {PLANNING_STEPS[currentStep - 1]?.description}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-purple-400 border-purple-500/50">
                    Step {currentStep} of {PLANNING_STEPS.length}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Step Content Components */}
                    {currentStep === 1 && (
                      <EventInitiationStep 
                        eventData={eventData}
                        updateEventData={updateEventData}
                      />
                    )}
                    {currentStep === 2 && (
                      <VenueScheduleStep 
                        eventData={eventData}
                        updateEventData={updateEventData}
                      />
                    )}
                    {currentStep === 3 && (
                      <TicketingStep 
                        eventData={eventData}
                        onUpdate={updateEventData}
                      />
                    )}
                    {currentStep === 4 && (
                      <TeamPermissionsStep 
                        eventData={eventData}
                        onUpdate={updateEventData}
                      />
                    )}
                    {currentStep === 5 && (
                      <MarketingPromotionStep 
                        eventData={eventData}
                        updateEventData={updateEventData}
                      />
                    )}
                    {currentStep === 6 && (
                      <FinancialsReportingStep 
                        eventData={eventData}
                        updateEventData={updateEventData}
                      />
                    )}
                    {currentStep === 7 && (
                      <ReviewPublishStep 
                        eventData={eventData}
                        updateEventData={updateEventData}
                        onPublish={handlePublish}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </CardContent>
              
              {/* Navigation Footer */}
              <div className="border-t border-slate-700/50 p-6">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevStep}
                    disabled={currentStep === 1}
                    className="border-slate-700 hover:border-slate-600"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    {PLANNING_STEPS.map((_, index) => (
                      <div
                        key={index}
                        className={`h-2 w-8 rounded-full transition-all duration-300 ${
                          index < currentStep - 1
                            ? "bg-green-500"
                            : index === currentStep - 1
                            ? "bg-purple-500"
                            : "bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  
                  <Button
                    onClick={handleNextStep}
                    disabled={currentStep === PLANNING_STEPS.length}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 1: Event Initiation Component
function EventInitiationStep({ 
  eventData, 
  updateEventData 
}: { 
  eventData: EventPlannerData
  updateEventData: (updates: Partial<EventPlannerData>) => void 
}) {
  const [selectedTemplate, setSelectedTemplate] = useState(eventData.template)

  const handleTemplateSelect = (template: typeof EVENT_TEMPLATES[0]) => {
    setSelectedTemplate(template.id)
    updateEventData({
      template: template.id,
      eventType: template.presets.eventType,
      // Apply template presets
      ticketTypes: template.presets.ticketTypes.map((name, index) => ({
        id: `ticket-${index}`,
        name,
        price: 0,
        quantity: 100,
        description: "",
        maxPerCustomer: 10
      }))
    })
  }

  return (
    <div className="space-y-8">
      {/* Event Template Selection */}
      <div>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Palette className="h-5 w-5 mr-2 text-purple-400" />
          Choose Event Template
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EVENT_TEMPLATES.map((template) => {
            const IconComponent = template.icon
            return (
              <motion.div
                key={template.id}
                whileHover={{ 
                  y: -4, 
                  scale: 1.02,
                  transition: { type: "spring", stiffness: 400, damping: 17 }
                }}
              >
                <Card
                  className={`cursor-pointer transition-all duration-300 group ${
                    selectedTemplate === template.id
                      ? "ring-2 ring-purple-500/50 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30"
                      : "bg-gradient-to-br from-slate-800/60 via-slate-700/40 to-slate-800/60 border-slate-700/30 hover:border-slate-600/50"
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader>
                    <div className="flex items-center space-x-4">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                        selectedTemplate === template.id
                          ? "bg-gradient-to-br from-purple-500 to-blue-500"
                          : `bg-gradient-to-br ${template.color}`
                      }`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-white group-hover:text-slate-100 transition-colors">
                          {template.name}
                        </CardTitle>
                        <p className="text-sm text-slate-400">{template.category}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-300 mb-4">{template.description}</p>
                    <div className="space-y-3">
                      <div className="flex items-center text-xs text-slate-400">
                        <Clock className="h-3 w-3 mr-2 text-purple-400" />
                        {template.presets.duration} minutes
                      </div>
                      <div className="flex items-center text-xs text-slate-400">
                        <Ticket className="h-3 w-3 mr-2 text-blue-400" />
                        {template.presets.ticketTypes.length} ticket types
                      </div>
                      <div className="flex items-center text-xs text-slate-400">
                        <Users className="h-3 w-3 mr-2 text-green-400" />
                        {template.presets.requiredStaff.length} staff roles
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Basic Event Details */}
      <div>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <Edit3 className="h-5 w-5 mr-2 text-blue-400" />
          Event Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <Label htmlFor="event-name" className="text-white font-medium">Event Name *</Label>
              <Input
                id="event-name"
                value={eventData.name}
                onChange={(e) => updateEventData({ name: e.target.value })}
                placeholder="Enter your event name"
                className="bg-slate-800/50 border-slate-700/50 text-white focus:border-purple-500/50 focus:ring-purple-500/20 mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="primary-contact" className="text-white font-medium">Primary Contact *</Label>
              <Input
                id="primary-contact"
                value={eventData.primaryContact}
                onChange={(e) => updateEventData({ primaryContact: e.target.value })}
                placeholder="Event organizer email"
                type="email"
                className="bg-slate-800/50 border-slate-700/50 text-white focus:border-purple-500/50 focus:ring-purple-500/20 mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="estimated-budget" className="text-white font-medium">Estimated Budget</Label>
              <Input
                id="estimated-budget"
                value={eventData.estimatedBudget || ""}
                onChange={(e) => updateEventData({ estimatedBudget: Number(e.target.value) })}
                placeholder="0"
                type="number"
                className="bg-slate-800/50 border-slate-700/50 text-white focus:border-purple-500/50 focus:ring-purple-500/20 mt-2"
              />
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="event-description" className="text-white font-medium">Event Description</Label>
              <Textarea
                id="event-description"
                value={eventData.description}
                onChange={(e) => updateEventData({ description: e.target.value })}
                placeholder="Describe your event..."
                rows={4}
                className="bg-slate-800/50 border-slate-700/50 text-white focus:border-purple-500/50 focus:ring-purple-500/20 mt-2"
              />
            </div>
            
            <div>
              <Label className="text-white font-medium">Privacy Settings</Label>
              <RadioGroup
                value={eventData.privacy}
                onValueChange={(value) => updateEventData({ privacy: value as "public" | "private" | "invite-only" })}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="public" className="border-slate-600" />
                  <Label htmlFor="public" className="text-slate-300">Public - Anyone can view and register</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" className="border-slate-600" />
                  <Label htmlFor="private" className="text-slate-300">Private - Requires approval to view</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="invite-only" id="invite-only" className="border-slate-600" />
                  <Label htmlFor="invite-only" className="text-slate-300">Invite Only - Accessible by invitation</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Step 2: Venue & Schedule Component
function VenueScheduleStep({ eventData, updateEventData }: { 
  eventData: EventPlannerData
  updateEventData: (updates: Partial<EventPlannerData>) => void 
}) {
  const [activeTab, setActiveTab] = useState<"venues" | "schedule">("venues")
  const [selectedVenue, setSelectedVenue] = useState<any>(null)
  const [isAddingVenue, setIsAddingVenue] = useState(false)
  const [isAddingScheduleItem, setIsAddingScheduleItem] = useState(false)
  const [scheduleConflicts, setScheduleConflicts] = useState<string[]>([])
  const [venues, setVenues] = useState<any[]>([])
  const [isLoadingVenues, setIsLoadingVenues] = useState(false)
  const [venueSearchQuery, setVenueSearchQuery] = useState("")

  // Fetch real venues from database
  const fetchVenues = async (searchQuery?: string) => {
    setIsLoadingVenues(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('query', searchQuery)
      params.append('limit', '50')
      
      const response = await fetch(`/api/venues?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setVenues(data.venues || [])
      } else {
        console.error('Failed to fetch venues:', response.statusText)
        setVenues([])
      }
    } catch (error) {
      console.error('Error fetching venues:', error)
      setVenues([])
    } finally {
      setIsLoadingVenues(false)
    }
  }

  // Load venues on component mount
  useEffect(() => {
    fetchVenues()
  }, [])

  // Search venues when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchVenues(venueSearchQuery)
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [venueSearchQuery])

  const addVenue = (venue: any) => {
    const newVenue = {
      id: venue.id,
      name: venue.venue_name,
      address: `${venue.address || ''} ${venue.city || ''} ${venue.state || ''}`.trim(),
      capacity: venue.capacity || 0,
      selectedDate: "",
      selectedTime: "",
      bookingStatus: "inquiry",
      contact: {
        name: venue.contact_info?.manager_name || "Contact Venue",
        email: venue.contact_info?.email || venue.contact_info?.booking_email || "",
        phone: venue.contact_info?.phone || ""
      },
      venueData: venue // Store full venue data
    }
    
    updateEventData({
      venues: [...eventData.venues, newVenue]
    })
    setIsAddingVenue(false)
  }

  const removeVenue = (venueId: string) => {
    updateEventData({
      venues: eventData.venues.filter(v => v.id !== venueId)
    })
  }

  const updateVenue = (venueId: string, updates: any) => {
    updateEventData({
      venues: eventData.venues.map(v => 
        v.id === venueId ? { ...v, ...updates } : v
      )
    })
  }

  const addScheduleItem = (item: any) => {
    const newItem = {
      id: `schedule-${Date.now()}`,
      title: item.title,
      startTime: item.startTime,
      endTime: item.endTime,
      venue: item.venue,
      type: item.type,
      description: item.description || ""
    }

    // Check for conflicts
    const conflicts = checkScheduleConflicts(newItem, eventData.schedule)
    if (conflicts.length > 0) {
      setScheduleConflicts(conflicts)
      return false
    }

    updateEventData({
      schedule: [...eventData.schedule, newItem]
    })
    setIsAddingScheduleItem(false)
    return true
  }

  const removeScheduleItem = (itemId: string) => {
    updateEventData({
      schedule: eventData.schedule.filter(item => item.id !== itemId)
    })
  }

  const checkScheduleConflicts = (newItem: any, existingSchedule: any[]) => {
    const conflicts: string[] = []
    const newStart = parseTimeToMinutes(newItem.startTime)
    const newEnd = parseTimeToMinutes(newItem.endTime)
    if (newStart === null || newEnd === null) return conflicts

    existingSchedule.forEach(item => {
      if (item.venue === newItem.venue) {
        const existingStart = parseTimeToMinutes(item.startTime)
        const existingEnd = parseTimeToMinutes(item.endTime)
        if (existingStart === null || existingEnd === null) return

        if (newStart < existingEnd && newEnd > existingStart) {
          conflicts.push(`Time conflict with "${item.title}"`)
        }
      }
    })

    return conflicts
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "venues" | "schedule")}>
        <TabsList className="grid w-full grid-cols-2 bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30">
          <TabsTrigger value="venues" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">
            <Building className="h-4 w-4 mr-2" />
            Venues
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600/80 data-[state=active]:to-blue-600/80 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/10 rounded-sm text-sm transition-all duration-200">
            <Calendar className="h-4 w-4 mr-2" />
            Schedule
          </TabsTrigger>
        </TabsList>

        {/* Venues Tab */}
        <TabsContent value="venues" className="space-y-6">
          {/* Venue Search & Selection */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Venue Selection</CardTitle>
                <Button
                  onClick={() => setIsAddingVenue(true)}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Venue
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {eventData.venues.length === 0 ? (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Venues Selected</h3>
                  <p className="text-slate-400 mb-4">
                    Add venues to host your event. You can select multiple locations for multi-day events.
                  </p>
                  <Button 
                    onClick={() => setIsAddingVenue(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Select Your First Venue
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {eventData.venues.map((venue, index) => (
                    <VenueCard 
                      key={venue.id}
                      venue={venue}
                      onUpdate={(updates) => updateVenue(venue.id, updates)}
                      onRemove={() => removeVenue(venue.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Venue Browser Modal */}
          {isAddingVenue && (
            <VenueBrowser
              venues={venues}
              isLoading={isLoadingVenues}
              searchQuery={venueSearchQuery}
              onSearchChange={setVenueSearchQuery}
              onSelect={addVenue}
              onClose={() => setIsAddingVenue(false)}
            />
          )}
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          {/* Schedule Management */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Event Schedule</CardTitle>
                <Button
                  onClick={() => setIsAddingScheduleItem(true)}
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {eventData.schedule.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Schedule Items</h3>
                  <p className="text-slate-400 mb-4">
                    Create a detailed schedule for your event including performances, breaks, and setup times.
                  </p>
                  <Button 
                    onClick={() => setIsAddingScheduleItem(true)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Schedule Item
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {eventData.schedule
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((item) => (
                      <ScheduleItemCard
                        key={item.id}
                        item={item}
                        onRemove={() => removeScheduleItem(item.id)}
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule Item Form Modal */}
          {isAddingScheduleItem && (
            <ScheduleItemForm
              venues={eventData.venues}
              onAdd={addScheduleItem}
              onClose={() => setIsAddingScheduleItem(false)}
              conflicts={scheduleConflicts}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Step 3: Ticketing & Registration Component
function TicketingStep({ eventData, onUpdate }: { 
  eventData: EventPlannerData
  onUpdate: (updates: Partial<EventPlannerData>) => void 
}) {
  const [ticketTypes, setTicketTypes] = useState<any[]>(eventData.ticketTypes || [])
  const [registrationForms, setRegistrationForms] = useState<any[]>(eventData.registrationForms || [])
  const [capacity, setCapacity] = useState<any>({
    totalCapacity: 100,
    waitlistEnabled: true,
    waitlistCapacity: 20,
    groupBookingEnabled: false,
    maxGroupSize: 5
  })

  const handleTicketTypeAdd = () => {
    const newTicketType: any = {
      id: `temp-${Date.now()}`,
      name: '',
      description: '',
      price: 0,
      currency: 'USD',
      quantity: 50,
      availableFrom: new Date().toISOString(),
      availableUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      features: [],
      earlyBirdPrice: null,
      earlyBirdEndDate: null,
      groupDiscount: null,
      minGroupSize: null
    }
    setTicketTypes([...ticketTypes, newTicketType])
  }

  const handleTicketTypeUpdate = (id: string, updates: any) => {
    setTicketTypes(ticketTypes.map(ticket => 
      ticket.id === id ? { ...ticket, ...updates } : ticket
    ))
  }

  const handleTicketTypeDelete = (id: string) => {
    setTicketTypes(ticketTypes.filter(ticket => ticket.id !== id))
  }

  const handleCustomFieldAdd = () => {
    const newField: any = {
      id: `field-${Date.now()}`,
      label: '',
      type: 'text',
      required: false,
      options: []
    }
    setRegistrationForms([...registrationForms, newField])
  }

  const handleCustomFieldUpdate = (id: string, updates: any) => {
    setRegistrationForms(registrationForms.map((field: any) =>
      field.id === id ? { ...field, ...updates } : field
    ))
  }

  const handleCustomFieldDelete = (id: string) => {
    setRegistrationForms(registrationForms.filter((field: any) => field.id !== id))
  }

  const totalRevenue = ticketTypes.reduce((sum, ticket) => {
    const earlyBirdEndDate = parseDateOrUndefined(ticket.earlyBirdEndDate)
    const price = ticket.earlyBirdPrice && earlyBirdEndDate && new Date() < earlyBirdEndDate
      ? ticket.earlyBirdPrice 
      : ticket.price
    return sum + (price * ticket.quantity)
  }, 0)

  const totalTickets = ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0)

  useEffect(() => {
    onUpdate({
      ticketTypes,
      registrationForms
    })
  }, [ticketTypes, registrationForms, onUpdate])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ticketing & Registration</h3>
          <p className="text-sm text-muted-foreground">
            Set up ticket types, pricing, and registration forms
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">
            {formatSafeCurrency(totalRevenue)}
          </div>
          <div className="text-sm text-muted-foreground">
            Potential Revenue
          </div>
        </div>
      </div>

      {/* Ticket Types */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-md font-medium">Ticket Types</h4>
          <Button onClick={handleTicketTypeAdd} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Ticket Type
          </Button>
        </div>

        {ticketTypes.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
            <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No ticket types created yet</p>
            <Button onClick={handleTicketTypeAdd} variant="outline" className="mt-2">
              Create First Ticket Type
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {ticketTypes.map((ticket, index) => (
              <TicketTypeCard
                key={ticket.id}
                ticket={ticket}
                onUpdate={(updates) => handleTicketTypeUpdate(ticket.id, updates)}
                onDelete={() => handleTicketTypeDelete(ticket.id)}
                isFirst={index === 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Registration Form */}
      <div className="space-y-4">
        <h4 className="text-md font-medium">Registration Form</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Required Fields</label>
              <div className="space-y-2">
                                 <div className="flex items-center space-x-2">
                   <Checkbox
                     id="collectName"
                     checked={true}
                     onCheckedChange={() => {}}
                   />
                   <label htmlFor="collectName" className="text-sm">Full Name</label>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Checkbox
                     id="collectEmail"
                     checked={true}
                     onCheckedChange={() => {}}
                   />
                   <label htmlFor="collectEmail" className="text-sm">Email Address</label>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Checkbox
                     id="collectPhone"
                     checked={false}
                     onCheckedChange={() => {}}
                   />
                   <label htmlFor="collectPhone" className="text-sm">Phone Number</label>
                 </div>
                 <div className="flex items-center space-x-2">
                   <Checkbox
                     id="collectCompany"
                     checked={false}
                     onCheckedChange={() => {}}
                   />
                   <label htmlFor="collectCompany" className="text-sm">Company/Organization</label>
                 </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Capacity Settings</label>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">Total Capacity</label>
                  <Input
                    type="number"
                    value={capacity.totalCapacity}
                    onChange={(e) => setCapacity({ ...capacity, totalCapacity: parseIntegerInput(e.target.value) })}
                    min="1"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="waitlistEnabled"
                    checked={capacity.waitlistEnabled}
                    onCheckedChange={(checked) => 
                      setCapacity({ ...capacity, waitlistEnabled: checked as boolean })
                    }
                  />
                  <label htmlFor="waitlistEnabled" className="text-sm">Enable Waitlist</label>
                </div>
                {capacity.waitlistEnabled && (
                  <div>
                    <label className="text-xs text-muted-foreground">Waitlist Capacity</label>
                    <Input
                      type="number"
                      value={capacity.waitlistCapacity}
                      onChange={(e) => setCapacity({ ...capacity, waitlistCapacity: parseIntegerInput(e.target.value) })}
                      min="1"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Fields */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Custom Fields</label>
            <Button onClick={handleCustomFieldAdd} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
          
                     {registrationForms.length === 0 ? (
             <div className="text-center py-4 border border-dashed border-muted rounded-lg">
               <p className="text-sm text-muted-foreground">No custom fields added</p>
             </div>
           ) : (
             <div className="space-y-3">
               {registrationForms.map((field: any) => (
                 <CustomFieldCard
                   key={field.id}
                   field={field}
                   onUpdate={(updates) => handleCustomFieldUpdate(field.id, updates)}
                   onDelete={() => handleCustomFieldDelete(field.id)}
                 />
               ))}
             </div>
           )}
        </div>

        {/* Legal Text */}
        <div className="space-y-4">
                     <div>
             <label className="text-sm font-medium">Terms & Conditions</label>
             <Textarea
               value=""
               onChange={() => {}}
               placeholder="Enter terms and conditions for registration..."
               rows={3}
             />
           </div>
           <div>
             <label className="text-sm font-medium">Privacy Policy</label>
             <Textarea
               value=""
               onChange={() => {}}
               placeholder="Enter privacy policy information..."
               rows={3}
             />
           </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">Summary</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Ticket Types:</span>
            <span className="ml-2 font-medium">{ticketTypes.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Tickets:</span>
            <span className="ml-2 font-medium">{formatSafeNumber(totalTickets)}</span>
          </div>
                     <div>
             <span className="text-muted-foreground">Custom Fields:</span>
             <span className="ml-2 font-medium">{registrationForms.length}</span>
           </div>
        </div>
      </div>
    </div>
  )
}

// Ticket Type Card Component
function parseDateOrUndefined(value?: string | null) {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed
}

function parseIntegerInput(value: string) {
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

function parseDecimalInput(value: string) {
  const parsed = parseFloat(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function parseTimeToMinutes(value?: string) {
  if (!value || !value.includes(":")) return null
  const [hourValue, minuteValue] = value.split(":")
  const hours = parseInt(hourValue, 10)
  const minutes = parseInt(minuteValue, 10)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

function toLocalDateTimeInputValue(value?: string | null) {
  if (!value) return ""
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ""
  const offsetMs = parsed.getTimezoneOffset() * 60_000
  return new Date(parsed.getTime() - offsetMs).toISOString().slice(0, 16)
}

function toIsoFromLocalDateTime(value: string, fallbackValue: string) {
  if (!value) return fallbackValue
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallbackValue
  return parsed.toISOString()
}

function TicketTypeCard({ 
  ticket, 
  onUpdate, 
  onDelete, 
  isFirst 
}: { 
  ticket: any
  onUpdate: (updates: any) => void
  onDelete: () => void
  isFirst: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isFirst ? 'bg-green-500' : 'bg-blue-500'}`} />
          <div>
            <input
              type="text"
              value={ticket.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Ticket Type Name"
              className="font-medium bg-transparent border-none outline-none focus:ring-0"
            />
            <div className="text-sm text-muted-foreground">
              {ticket.quantity} tickets • ${ticket.price}
              {ticket.earlyBirdPrice && (
                <span className="text-green-600 ml-2">
                  Early Bird: ${ticket.earlyBirdPrice}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <Textarea
                value={ticket.description}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="Describe what's included with this ticket..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Quantity Available</label>
              <Input
                type="number"
                value={ticket.quantity}
                  onChange={(e) =>
                    onUpdate({
                      quantity: Number.isNaN(parseInt(e.target.value, 10)) ? 0 : parseInt(e.target.value, 10),
                    })
                  }
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={ticket.price}
                  onChange={(e) =>
                    onUpdate({
                      price: Number.isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value),
                    })
                  }
                  min="0"
                  step="0.01"
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Currency</label>
              <Select value={ticket.currency} onValueChange={(value) => onUpdate({ currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={ticket.isActive ? 'active' : 'inactive'} onValueChange={(value) => onUpdate({ isActive: value === 'active' })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Early Bird Pricing */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`earlyBird-${ticket.id}`}
                checked={ticket.earlyBirdPrice !== null}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onUpdate({ 
                      earlyBirdPrice: ticket.price * 0.8,
                      earlyBirdEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                    })
                  } else {
                    onUpdate({ earlyBirdPrice: null, earlyBirdEndDate: null })
                  }
                }}
              />
              <label htmlFor={`earlyBird-${ticket.id}`} className="text-sm font-medium">Early Bird Pricing</label>
            </div>
            
            {ticket.earlyBirdPrice !== null && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div>
                  <label className="text-xs text-muted-foreground">Early Bird Price</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={ticket.earlyBirdPrice}
                      onChange={(e) =>
                        onUpdate({
                          earlyBirdPrice: Number.isNaN(parseFloat(e.target.value))
                            ? 0
                            : parseFloat(e.target.value),
                        })
                      }
                      min="0"
                      step="0.01"
                      className="pl-8"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">End Date</label>
                  <Input
                    type="datetime-local"
                    value={toLocalDateTimeInputValue(ticket.earlyBirdEndDate)}
                    onChange={(e) =>
                      onUpdate({
                        earlyBirdEndDate: e.target.value
                          ? toIsoFromLocalDateTime(e.target.value, ticket.earlyBirdEndDate || "")
                          : null,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Availability Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Available From</label>
              <Input
                type="datetime-local"
                value={toLocalDateTimeInputValue(ticket.availableFrom)}
                onChange={(e) =>
                  onUpdate({
                    availableFrom: toIsoFromLocalDateTime(e.target.value, ticket.availableFrom),
                  })
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Available Until</label>
              <Input
                type="datetime-local"
                value={toLocalDateTimeInputValue(ticket.availableUntil)}
                onChange={(e) =>
                  onUpdate({
                    availableUntil: toIsoFromLocalDateTime(e.target.value, ticket.availableUntil),
                  })
                }
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Custom Field Card Component
function CustomFieldCard({ 
  field, 
  onUpdate, 
  onDelete 
}: { 
  field: any
  onUpdate: (updates: any) => void
  onDelete: () => void
}) {
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder="Field Label"
            className="font-medium bg-transparent border-none outline-none focus:ring-0"
          />
          <Select value={field.type} onValueChange={(value) => onUpdate({ type: value as any })}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="select">Dropdown</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`required-${field.id}`}
              checked={field.required}
              onCheckedChange={(checked) => onUpdate({ required: checked as boolean })}
            />
            <label htmlFor={`required-${field.id}`} className="text-xs">Required</label>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {field.type === 'select' && (
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Options (one per line)</label>
          <Textarea
            value={field.options.join('\n')}
            onChange={(e) => onUpdate({ options: e.target.value.split('\n').filter(option => option.trim()) })}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
            rows={3}
          />
        </div>
      )}
    </div>
  )
}

// Step 4: Team & Permissions Component
function TeamPermissionsStep({ eventData, onUpdate }: { 
  eventData: EventPlannerData
  onUpdate: (updates: Partial<EventPlannerData>) => void 
}) {
  const [teamMembers, setTeamMembers] = useState<any[]>(eventData.teamMembers || [])
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('staff')
  const [inviteMessage, setInviteMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Available roles from the existing RBAC system
  const availableRoles = [
    { value: 'tour_manager', label: 'Tour Manager', description: 'Full event management access' },
    { value: 'event_coordinator', label: 'Event Coordinator', description: 'Event planning and coordination' },
    { value: 'crew_chief', label: 'Crew Chief', description: 'Staff and logistics management' },
    { value: 'crew_member', label: 'Crew Member', description: 'Basic event access' },
    { value: 'vendor', label: 'Vendor', description: 'Vendor-specific access' },
    { value: 'venue_coordinator', label: 'Venue Coordinator', description: 'Venue-related permissions' },
    { value: 'financial_manager', label: 'Financial Manager', description: 'Financial and reporting access' }
  ]

  // Permission categories from the existing system
  const permissionCategories = {
    'Event Management': [
      'events.create',
      'events.view',
      'events.edit',
      'events.delete',
      'events.manage_logistics'
    ],
    'Staff Management': [
      'staff.view',
      'staff.invite',
      'staff.manage',
      'staff.remove'
    ],
    'Financial Management': [
      'finances.view',
      'finances.edit',
      'finances.approve',
      'finances.reports'
    ],
    'Communications': [
      'communications.view',
      'communications.send',
      'communications.broadcast'
    ],
    'Analytics & Reporting': [
      'analytics.view',
      'analytics.export'
    ]
  }

  const handleUserSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/search?type=all&q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults([
          ...(data.artists || []),
          ...(data.venues || []),
          ...(data.users || [])
        ])
      }
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddExistingUser = async (user: any) => {
    const newMember = {
      id: user.id,
      name: user.profile_data?.name || user.username,
      email: user.email,
      role: 'crew_member',
      permissions: [],
      status: 'pending',
      avatar: user.avatar_url,
      accountType: user.account_type
    }
    
    setTeamMembers([...teamMembers, newMember])
    setShowUserSearch(false)
    setSelectedUser(null)
    setSearchQuery('')
  }

  const handleInviteNewUser = async () => {
    if (!inviteEmail.trim()) return

    setLoading(true)
    try {
      const inviteToken = crypto.randomUUID()
      
      // Store invitation in database
      await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          positionDetails: {
            title: inviteRole,
            description: `Event team member - ${inviteRole}`,
            startDate: new Date().toISOString(),
            location: eventData.name || 'Event Location'
          },
          token: inviteToken,
          status: "pending"
        })
      })

      // Send email invitation
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "staff_signup_invite",
          data: {
            email: inviteEmail,
            positionDetails: {
              title: inviteRole,
              description: `Event team member - ${inviteRole}`,
              startDate: new Date().toISOString(),
              location: eventData.name || 'Event Location'
            },
            signupLink: `${window.location.origin}/login?token=${inviteToken}`
          }
        })
      })

      const newMember = {
        id: `invite-${Date.now()}`,
        name: inviteEmail,
        email: inviteEmail,
        role: inviteRole,
        permissions: [],
        status: 'pending',
        avatar: null,
        accountType: 'invite'
      }
      
      setTeamMembers([...teamMembers, newMember])
      setShowInviteDialog(false)
      setInviteEmail('')
      setInviteRole('staff')
      setInviteMessage('')
    } catch (error) {
      console.error('Error sending invitation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateMember = (memberId: string, updates: any) => {
    setTeamMembers(teamMembers.map(member => 
      member.id === memberId ? { ...member, ...updates } : member
    ))
  }

  const handleRemoveMember = (memberId: string) => {
    setTeamMembers(teamMembers.filter(member => member.id !== memberId))
  }

  const handleSendMessage = async (memberId: string) => {
    const member = teamMembers.find(m => m.id === memberId)
    if (!member) return

    try {
      // Create or get conversation
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: member.id,
          content: `Hi ${member.name}! You've been added to the event team for "${eventData.name}". Let's discuss your role and responsibilities.`
        })
      })

      if (response.ok) {
        // Open messages page or show success
        window.open('/messages', '_blank')
      }
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const getRolePermissions = (role: string) => {
    const roleMap: Record<string, string[]> = {
      'tour_manager': [
        'events.create', 'events.view', 'events.edit', 'events.delete', 'events.manage_logistics',
        'staff.view', 'staff.invite', 'staff.manage', 'staff.remove',
        'finances.view', 'finances.edit', 'finances.approve', 'finances.reports',
        'communications.view', 'communications.send', 'communications.broadcast',
        'analytics.view', 'analytics.export'
      ],
      'event_coordinator': [
        'events.create', 'events.view', 'events.edit', 'events.manage_logistics',
        'staff.view', 'staff.invite', 'staff.manage',
        'communications.view', 'communications.send',
        'analytics.view'
      ],
      'crew_chief': [
        'events.view', 'events.manage_logistics',
        'staff.view', 'staff.manage',
        'communications.view', 'communications.send'
      ],
      'crew_member': [
        'events.view',
        'communications.view', 'communications.send'
      ],
      'vendor': [
        'events.view',
        'finances.view',
        'communications.view', 'communications.send'
      ],
      'venue_coordinator': [
        'events.view', 'events.edit', 'events.manage_logistics',
        'communications.view', 'communications.send'
      ],
      'financial_manager': [
        'events.view',
        'finances.view', 'finances.edit', 'finances.approve', 'finances.reports',
        'analytics.view', 'analytics.export'
      ]
    }
    return roleMap[role] || []
  }

  useEffect(() => {
    onUpdate({ teamMembers })
  }, [teamMembers, onUpdate])

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team & Permissions</h3>
          <p className="text-sm text-muted-foreground">
            Manage team members, roles, and permissions for your event
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowUserSearch(true)} variant="outline">
            <Search className="h-4 w-4 mr-2" />
            Add Existing User
          </Button>
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite New User
          </Button>
        </div>
      </div>

      {/* Team Members List */}
      <div className="space-y-4">
        <h4 className="text-md font-medium">Team Members ({teamMembers.length})</h4>
        
        {teamMembers.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-muted rounded-lg">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No team members added yet</p>
            <div className="flex justify-center space-x-2 mt-4">
              <Button onClick={() => setShowUserSearch(true)} variant="outline">
                Add Existing User
              </Button>
              <Button onClick={() => setShowInviteDialog(true)}>
                Invite New User
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                onUpdate={(updates) => handleUpdateMember(member.id, updates)}
                onRemove={() => handleRemoveMember(member.id)}
                onMessage={() => handleSendMessage(member.id)}
                availableRoles={availableRoles}
                getRolePermissions={getRolePermissions}
              />
            ))}
          </div>
        )}
      </div>

      {/* User Search Dialog */}
      <Dialog open={showUserSearch} onOpenChange={setShowUserSearch}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Existing User</DialogTitle>
            <DialogDescription>
              Search for users in the platform to add to your event team
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name, email, or username..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  handleUserSearch(e.target.value)
                }}
                className="pl-10"
              />
            </div>

            {loading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleAddExistingUser(user)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>
                          {user.profile_data?.name?.[0] || user.username?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.profile_data?.name || user.username}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email} • {user.account_type}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery && !loading && searchResults.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No users found matching "{searchQuery}"
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite New User Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an invitation to join the platform and your event team
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>

            <div>
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-sm text-muted-foreground">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="invite-message">Personal Message (Optional)</Label>
              <Textarea
                id="invite-message"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Add a personal message to your invitation..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleInviteNewUser} disabled={loading || !inviteEmail.trim()}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Summary */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">Team Summary</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Members:</span>
            <span className="ml-2 font-medium">{teamMembers.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Active:</span>
            <span className="ml-2 font-medium">
              {teamMembers.filter(m => m.status === 'active').length}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Pending:</span>
            <span className="ml-2 font-medium">
              {teamMembers.filter(m => m.status === 'pending').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Team Member Card Component
function TeamMemberCard({ 
  member, 
  onUpdate, 
  onRemove, 
  onMessage,
  availableRoles,
  getRolePermissions
}: { 
  member: any
  onUpdate: (updates: any) => void
  onRemove: () => void
  onMessage: () => void
  availableRoles: any[]
  getRolePermissions: (role: string) => string[]
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-500/10 border-green-500/20'
      case 'pending': return 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20'
      case 'inactive': return 'text-gray-600 bg-gray-500/10 border-gray-500/20'
      default: return 'text-gray-600 bg-gray-500/10 border-gray-500/20'
    }
  }

  const getAccountTypeIcon = (type: string) => {
    switch (type) {
      case 'artist': return <Mic className="h-4 w-4" />
      case 'venue': return <Building2 className="h-4 w-4" />
      case 'invite': return <Mail className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const permissions = getRolePermissions(member.role)

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={member.avatar} />
            <AvatarFallback>
              {member.name?.[0] || member.email?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{member.name || member.email}</div>
            <div className="text-sm text-muted-foreground flex items-center space-x-2">
              <span>{member.email}</span>
              <span>•</span>
              <div className="flex items-center space-x-1">
                {getAccountTypeIcon(member.accountType)}
                <span className="capitalize">{member.accountType}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className={getStatusColor(member.status)}>
            {member.status}
          </Badge>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMessage}
              disabled={member.status !== 'active'}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Role</label>
              <Select value={member.role} onValueChange={(value) => onUpdate({ role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <div className="font-medium">{role.label}</div>
                        <div className="text-sm text-muted-foreground">{role.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={member.status} onValueChange={(value) => onUpdate({ status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-foreground">Permissions</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPermissions(!showPermissions)}
              >
                {showPermissions ? 'Hide' : 'Show'} Permissions
              </Button>
            </div>
            
            {showPermissions && (
              <div className="space-y-2">
                {Object.entries({
                  'Event Management': [
                    'events.create', 'events.view', 'events.edit', 'events.delete', 'events.manage_logistics'
                  ],
                  'Staff Management': [
                    'staff.view', 'staff.invite', 'staff.manage', 'staff.remove'
                  ],
                  'Financial Management': [
                    'finances.view', 'finances.edit', 'finances.approve', 'finances.reports'
                  ],
                  'Communications': [
                    'communications.view', 'communications.send', 'communications.broadcast'
                  ],
                  'Analytics & Reporting': [
                    'analytics.view', 'analytics.export'
                  ]
                }).map(([category, perms]) => (
                  <div key={category}>
                    <div className="text-sm font-medium text-muted-foreground mb-1">{category}</div>
                    <div className="flex flex-wrap gap-1">
                      {(perms as string[]).map((permission) => (
                        <Badge
                          key={permission}
                          variant={permissions.includes(permission) ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Step 5: Marketing & Promotion Component
function MarketingPromotionStep({ eventData, updateEventData }: { 
  eventData: EventPlannerData
  updateEventData: (updates: Partial<EventPlannerData>) => void 
}) {
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [showContentForm, setShowContentForm] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    type: "social-media",
    platform: "all",
    budget: 0,
    startDate: "",
    endDate: "",
    targetAudience: "",
    goals: "",
    content: ""
  })

  const campaignTypes = [
    { id: "social-media", name: "Social Media", icon: "📱", platforms: ["Instagram", "Facebook", "Twitter", "TikTok", "LinkedIn"] },
    { id: "email", name: "Email Marketing", icon: "📧", platforms: ["Newsletter", "Direct Mail", "Automated Sequences"] },
    { id: "paid-advertising", name: "Paid Advertising", icon: "💰", platforms: ["Google Ads", "Facebook Ads", "Instagram Ads", "YouTube Ads"] },
    { id: "influencer", name: "Influencer Marketing", icon: "⭐", platforms: ["Instagram", "TikTok", "YouTube", "Blog"] },
    { id: "pr", name: "Public Relations", icon: "📰", platforms: ["Press Release", "Media Outreach", "Press Kit"] },
    { id: "partnership", name: "Partnerships", icon: "🤝", platforms: ["Brand Collaborations", "Sponsorships", "Cross-Promotions"] }
  ]

  const contentTemplates = [
    {
      id: "announcement",
      name: "Event Announcement",
      template: `🎉 Exciting news! We're thrilled to announce [EVENT_NAME]!

📅 Date: [EVENT_DATE]
📍 Location: [VENUE_NAME]
🎫 Tickets: [TICKET_LINK]

[EVENT_DESCRIPTION]

Don't miss out on this incredible experience! Get your tickets now and be part of something special.

#EventName #LiveMusic #Experience #Tickets`
    },
    {
      id: "countdown",
      name: "Countdown Post",
      template: `⏰ [COUNTDOWN_DAYS] days until [EVENT_NAME]!

The excitement is building and we can't wait to see you there! 

🎵 What to expect:
• [FEATURE_1]
• [FEATURE_2] 
• [FEATURE_3]

🎫 Limited tickets remaining - secure yours today!

#Countdown #EventName #LiveMusic`
    },
    {
      id: "behind-scenes",
      name: "Behind the Scenes",
      template: `🎬 Behind the scenes at [EVENT_NAME]!

We're working hard to bring you an unforgettable experience. Here's a sneak peek at what's happening behind the curtain:

📸 [PHOTO_DESCRIPTION]
🎪 [SETUP_DETAILS]
🎵 [MUSIC_PREVIEW]

Stay tuned for more updates as we get closer to the big day!

#BehindTheScenes #EventName #Preparation`
    },
    {
      id: "lineup",
      name: "Lineup Reveal",
      template: `🎤 The wait is over! Here's your incredible lineup for [EVENT_NAME]:

🎵 [ARTIST_1] - [TIME]
🎵 [ARTIST_2] - [TIME]
🎵 [ARTIST_3] - [TIME]
🎵 [ARTIST_4] - [TIME]

This is going to be EPIC! 🚀

🎫 Get your tickets before they're gone: [TICKET_LINK]

#Lineup #EventName #LiveMusic #Artists`
    }
  ]

  const handleCampaignAdd = () => {
    const newCampaign = {
      id: Date.now().toString(),
      ...campaignForm,
      status: "draft",
      metrics: {
        reach: 0,
        engagement: 0,
        clicks: 0,
        conversions: 0
      },
      content: []
    }

    updateEventData({
      campaigns: [...eventData.campaigns, newCampaign]
    })

    setCampaignForm({
      name: "",
      type: "social-media",
      platform: "all",
      budget: 0,
      startDate: "",
      endDate: "",
      targetAudience: "",
      goals: "",
      content: ""
    })
    setShowCampaignForm(false)
  }

  const handleCampaignUpdate = (campaignId: string, updates: any) => {
    const updatedCampaigns = eventData.campaigns.map(campaign =>
      campaign.id === campaignId ? { ...campaign, ...updates } : campaign
    )
    updateEventData({ campaigns: updatedCampaigns })
  }

  const handleCampaignDelete = (campaignId: string) => {
    const updatedCampaigns = eventData.campaigns.filter(campaign => campaign.id !== campaignId)
    updateEventData({ campaigns: updatedCampaigns })
  }

  const handleContentAdd = (campaignId: string, content: any) => {
    const updatedCampaigns = eventData.campaigns.map(campaign =>
      campaign.id === campaignId 
        ? { ...campaign, content: [...campaign.content, content] }
        : campaign
    )
    updateEventData({ campaigns: updatedCampaigns })
  }

  const getCampaignTypeIcon = (type: string) => {
    return campaignTypes.find(t => t.id === type)?.icon || "📢"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "border-green-500/50 text-green-400"
      case "draft": return "border-yellow-500/50 text-yellow-400"
      case "paused": return "border-orange-500/50 text-orange-400"
      case "completed": return "border-blue-500/50 text-blue-400"
      default: return "border-slate-500/50 text-slate-400"
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <MegaphoneIcon className="h-16 w-16 text-slate-500 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Marketing & Promotion</h3>
        <p className="text-slate-400">
          Build multi-channel campaigns and create engaging content to reach your audience
        </p>
      </div>

      {/* Campaign Overview */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Marketing Campaigns</CardTitle>
            <Button
              onClick={() => setShowCampaignForm(true)}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {eventData.campaigns.length === 0 ? (
            <div className="text-center py-8">
              <MegaphoneIcon className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 mb-4">No campaigns created yet</p>
              <Button
                onClick={() => setShowCampaignForm(true)}
                variant="outline"
                className="border-slate-600 hover:border-slate-500"
              >
                Create Your First Campaign
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {eventData.campaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onUpdate={(updates) => handleCampaignUpdate(campaign.id, updates)}
                  onDelete={() => handleCampaignDelete(campaign.id)}
                  onContentAdd={(content) => handleContentAdd(campaign.id, content)}
                  campaignTypes={campaignTypes}
                  getStatusColor={getStatusColor}
                  getCampaignTypeIcon={getCampaignTypeIcon}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Templates */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Content Templates</CardTitle>
          <p className="text-slate-400 text-sm">
            Pre-built templates to help you create engaging content quickly
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {contentTemplates.map((template) => (
              <div key={template.id} className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-white">{template.name}</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCampaign(eventData.campaigns[0])
                      setShowContentForm(true)
                    }}
                    className="border-slate-600 hover:border-slate-500"
                  >
                    Use Template
                  </Button>
                </div>
                <p className="text-sm text-slate-400 whitespace-pre-line">
                  {template.template.substring(0, 200)}...
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Form Modal */}
      {showCampaignForm && (
        <CampaignFormModal
          form={campaignForm}
          setForm={setCampaignForm}
          onSubmit={handleCampaignAdd}
          onClose={() => setShowCampaignForm(false)}
          campaignTypes={campaignTypes}
        />
      )}

      {/* Content Form Modal */}
      {showContentForm && selectedCampaign && (
        <ContentFormModal
          campaign={selectedCampaign}
          onSubmit={(content) => {
            handleContentAdd(selectedCampaign.id, content)
            setShowContentForm(false)
            setSelectedCampaign(null)
          }}
          onClose={() => {
            setShowContentForm(false)
            setSelectedCampaign(null)
          }}
          contentTemplates={contentTemplates}
        />
      )}
    </div>
  )
}

// Step 6: Financials & Reporting Component
function FinancialsReportingStep({ eventData, updateEventData }: { 
  eventData: EventPlannerData
  updateEventData: (updates: Partial<EventPlannerData>) => void 
}) {
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [showRevenueForm, setShowRevenueForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<any>(null)

  const budgetCategories = [
    { id: "venue", name: "Venue & Facilities", icon: "🏢", color: "border-blue-500/50 bg-blue-500/10 text-blue-400" },
    { id: "marketing", name: "Marketing & Promotion", icon: "📢", color: "border-purple-500/50 bg-purple-500/10 text-purple-400" },
    { id: "staff", name: "Staff & Personnel", icon: "👥", color: "border-green-500/50 bg-green-500/10 text-green-400" },
    { id: "equipment", name: "Equipment & Tech", icon: "🎵", color: "border-orange-500/50 bg-orange-500/10 text-orange-400" },
    { id: "catering", name: "Catering & Refreshments", icon: "🍽️", color: "border-pink-500/50 bg-pink-500/10 text-pink-400" },
    { id: "transportation", name: "Transportation", icon: "🚗", color: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400" },
    { id: "insurance", name: "Insurance & Security", icon: "🛡️", color: "border-red-500/50 bg-red-500/10 text-red-400" },
    { id: "misc", name: "Miscellaneous", icon: "📋", color: "border-slate-500/50 bg-slate-500/10 text-slate-400" }
  ]

  const revenueSources = [
    { id: "tickets", name: "Ticket Sales", icon: "🎫" },
    { id: "sponsorships", name: "Sponsorships", icon: "💼" },
    { id: "merchandise", name: "Merchandise", icon: "👕" },
    { id: "food", name: "Food & Beverage", icon: "🍔" },
    { id: "parking", name: "Parking", icon: "🅿️" },
    { id: "other", name: "Other Revenue", icon: "💰" }
  ]

  const handleBudgetCategoryAdd = (category: any) => {
    const newCategory = {
      name: category.name,
      allocated: category.allocated,
      spent: 0
    }

    updateEventData({
      budget: {
        ...eventData.budget,
        categories: [...eventData.budget.categories, newCategory],
        totalBudget: eventData.budget.totalBudget + category.allocated
      }
    })
  }

  const handleBudgetCategoryUpdate = (index: number, updates: any) => {
    const updatedCategories = [...eventData.budget.categories]
    const oldAllocated = updatedCategories[index].allocated
    updatedCategories[index] = { ...updatedCategories[index], ...updates }
    
    const budgetDifference = updates.allocated - oldAllocated

    updateEventData({
      budget: {
        ...eventData.budget,
        categories: updatedCategories,
        totalBudget: eventData.budget.totalBudget + budgetDifference
      }
    })
  }

  const handleBudgetCategoryDelete = (index: number) => {
    const categoryToRemove = eventData.budget.categories[index]
    const updatedCategories = eventData.budget.categories.filter((_, i) => i !== index)

    updateEventData({
      budget: {
        ...eventData.budget,
        categories: updatedCategories,
        totalBudget: eventData.budget.totalBudget - categoryToRemove.allocated
      }
    })
  }

  const calculateTotalSpent = () => {
    return eventData.budget.categories.reduce((total, category) => total + category.spent, 0)
  }

  const calculateRemainingBudget = () => {
    return eventData.budget.totalBudget - calculateTotalSpent()
  }

  const getBudgetProgress = (allocated: number, spent: number) => {
    if (allocated === 0) return 0
    return Math.min((spent / allocated) * 100, 100)
  }

  const getBudgetStatus = (allocated: number, spent: number) => {
    const percentage = (spent / allocated) * 100
    if (percentage >= 90) return "critical"
    if (percentage >= 75) return "warning"
    return "good"
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <BarChart3 className="h-16 w-16 text-slate-500 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Financials & Reporting</h3>
        <p className="text-slate-400">
          Manage budgets, track expenses, and monitor revenue projections
        </p>
      </div>

      {/* Budget Overview */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Budget Overview</CardTitle>
            <Button
              onClick={() => setShowBudgetForm(true)}
              size="sm"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center p-4 rounded-lg bg-slate-900/50 border border-slate-700">
              <h4 className="text-sm font-medium text-slate-400 mb-2">Total Budget</h4>
              <p className="text-2xl font-bold text-white">{formatSafeCurrency(eventData.budget.totalBudget)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-900/50 border border-slate-700">
              <h4 className="text-sm font-medium text-slate-400 mb-2">Total Spent</h4>
              <p className="text-2xl font-bold text-white">{formatSafeCurrency(calculateTotalSpent())}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-900/50 border border-slate-700">
              <h4 className="text-sm font-medium text-slate-400 mb-2">Remaining</h4>
              <p className={`text-2xl font-bold ${calculateRemainingBudget() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatSafeCurrency(calculateRemainingBudget())}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {eventData.budget.categories.map((category, index) => {
              const progress = getBudgetProgress(category.allocated, category.spent)
              const status = getBudgetStatus(category.allocated, category.spent)
              const categoryInfo = budgetCategories.find(c => c.name === category.name)

              return (
                <div key={index} className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{categoryInfo?.icon || "📋"}</div>
                      <div>
                        <h4 className="font-medium text-white">{category.name}</h4>
                        <p className="text-sm text-slate-400">
                          {formatSafeCurrency(category.spent)} / {formatSafeCurrency(category.allocated)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          status === "critical" ? "border-red-500/50 text-red-400" :
                          status === "warning" ? "border-yellow-500/50 text-yellow-400" :
                          "border-green-500/50 text-green-400"
                        }`}
                      >
                        {Math.round(progress)}%
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedCategory({ ...category, index })
                          setShowBudgetForm(true)
                        }}
                        className="border-slate-600 hover:border-slate-500"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBudgetCategoryDelete(index)}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Projections */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Revenue Projections</CardTitle>
            <Button
              onClick={() => setShowRevenueForm(true)}
              size="sm"
              variant="outline"
              className="border-slate-600 hover:border-slate-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Revenue Source
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-6 rounded-lg bg-slate-900/50 border border-slate-700">
              <h4 className="text-lg font-medium text-white mb-2">Expected Revenue</h4>
              <p className="text-3xl font-bold text-green-400">{formatSafeCurrency(eventData.budget.expectedRevenue)}</p>
              <p className="text-sm text-slate-400 mt-2">Total projected income</p>
            </div>
            <div className="text-center p-6 rounded-lg bg-slate-900/50 border border-slate-700">
              <h4 className="text-lg font-medium text-white mb-2">Net Profit</h4>
              <p className={`text-3xl font-bold ${eventData.budget.expectedRevenue - eventData.budget.totalBudget >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatSafeCurrency(eventData.budget.expectedRevenue - eventData.budget.totalBudget)}
              </p>
              <p className="text-sm text-slate-400 mt-2">Revenue minus expenses</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget Form Modal */}
      {showBudgetForm && (
        <BudgetFormModal
          category={selectedCategory}
          categories={budgetCategories}
          onSubmit={handleBudgetCategoryAdd}
          onUpdate={selectedCategory ? (updates) => handleBudgetCategoryUpdate(selectedCategory.index, updates) : undefined}
          onClose={() => {
            setShowBudgetForm(false)
            setSelectedCategory(null)
          }}
        />
      )}

      {/* Revenue Form Modal */}
      {showRevenueForm && (
        <RevenueFormModal
          revenueSources={revenueSources}
          currentRevenue={eventData.budget.expectedRevenue}
          onSubmit={(revenue) => {
            updateEventData({
              budget: {
                ...eventData.budget,
                expectedRevenue: revenue
              }
            })
            setShowRevenueForm(false)
          }}
          onClose={() => setShowRevenueForm(false)}
        />
      )}
    </div>
  )
}

function ReviewPublishStep({ 
  eventData, 
  updateEventData, 
  onPublish 
}: { 
  eventData: EventPlannerData
  updateEventData: (updates: Partial<EventPlannerData>) => void
  onPublish: () => void
}) {
  const [activeTab, setActiveTab] = useState("overview")
  const [showPreview, setShowPreview] = useState(false)
  const [publishStatus, setPublishStatus] = useState(eventData.publishStatus || "draft")

  const checklist = [
    { 
      item: "Event details completed", 
      completed: !!eventData.name && !!eventData.description, 
      required: true,
      details: "Event name, description, and basic information"
    },
    { 
      item: "Venue confirmed", 
      completed: eventData.venues.length > 0, 
      required: true,
      details: `${eventData.venues.length} venue(s) selected`
    },
    { 
      item: "Ticket types configured", 
      completed: eventData.ticketTypes.length > 0, 
      required: true,
      details: `${eventData.ticketTypes.length} ticket type(s) created`
    },
    { 
      item: "Team members assigned", 
      completed: eventData.teamMembers.length > 0, 
      required: false,
      details: `${eventData.teamMembers.length} team member(s) added`
    },
    { 
      item: "Marketing campaigns ready", 
      completed: eventData.campaigns.length > 0, 
      required: false,
      details: `${eventData.campaigns.length} campaign(s) created`
    },
    { 
      item: "Budget planning complete", 
      completed: eventData.budget.totalBudget > 0, 
      required: false,
      details: `${formatSafeCurrency(eventData.budget.totalBudget)} budget allocated`
    },
    { 
      item: "Schedule finalized", 
      completed: eventData.schedule.length > 0, 
      required: false,
      details: `${eventData.schedule.length} schedule item(s) created`
    },
    { 
      item: "Financial projections set", 
      completed: eventData.budget.expectedRevenue > 0, 
      required: false,
      details: `${formatSafeCurrency(eventData.budget.expectedRevenue)} expected revenue`
    }
  ]

  const requiredCompleted = checklist.filter(item => item.required && item.completed).length
  const requiredTotal = checklist.filter(item => item.required).length
  const canPublish = requiredCompleted === requiredTotal

  const handlePublish = async () => {
    setPublishStatus("published")
    updateEventData({ publishStatus: "published" })
    onPublish()
  }

  const handleSaveDraft = () => {
    setPublishStatus("draft")
    updateEventData({ publishStatus: "draft" })
  }

  const handleRequestReview = () => {
    setPublishStatus("review")
    updateEventData({ publishStatus: "review" })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "border-green-500/50 text-green-400 bg-green-500/10"
      case "review": return "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
      case "draft": return "border-slate-500/50 text-slate-400 bg-slate-500/10"
      default: return "border-slate-500/50 text-slate-400 bg-slate-500/10"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "published": return "🚀"
      case "review": return "👀"
      case "draft": return "📝"
      default: return "📝"
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Rocket className="h-16 w-16 text-slate-500 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-white mb-2">Ready to Launch?</h3>
        <p className="text-slate-400">
          Review your event details and publish when ready
        </p>
      </div>

      {/* Status Overview */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Event Status</CardTitle>
            <Badge variant="outline" className={`text-sm ${getStatusColor(publishStatus)}`}>
              <span className="mr-2">{getStatusIcon(publishStatus)}</span>
              {publishStatus.charAt(0).toUpperCase() + publishStatus.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-slate-900/50 border border-slate-700">
              <h4 className="text-sm font-medium text-slate-400 mb-2">Completion</h4>
              <p className="text-2xl font-bold text-white">{Math.round((checklist.filter(item => item.completed).length / checklist.length) * 100)}%</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-900/50 border border-slate-700">
              <h4 className="text-sm font-medium text-slate-400 mb-2">Required Items</h4>
              <p className="text-2xl font-bold text-white">{requiredCompleted}/{requiredTotal}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-900/50 border border-slate-700">
              <h4 className="text-sm font-medium text-slate-400 mb-2">Total Items</h4>
              <p className="text-2xl font-bold text-white">{checklist.filter(item => item.completed).length}/{checklist.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Tabs */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Event Review</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-slate-800/60 backdrop-blur-sm p-1 rounded-sm border border-slate-700/30">
              <TabsTrigger value="overview" className="text-slate-400">Overview</TabsTrigger>
              <TabsTrigger value="checklist" className="text-slate-400">Checklist</TabsTrigger>
              <TabsTrigger value="details" className="text-slate-400">Details</TabsTrigger>
              <TabsTrigger value="preview" className="text-slate-400">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                    <h4 className="font-medium text-white mb-2">Event Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Name:</span>
                        <span className="text-white">{eventData.name || "Not set"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Type:</span>
                        <span className="text-white">{eventData.eventType || "Not set"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Privacy:</span>
                        <span className="text-white capitalize">{eventData.privacy || "Not set"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                    <h4 className="font-medium text-white mb-2">Financial Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Budget:</span>
                        <span className="text-white">{formatSafeCurrency(eventData.budget.totalBudget)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Revenue:</span>
                        <span className="text-white">{formatSafeCurrency(eventData.budget.expectedRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Profit:</span>
                        <span className={`${eventData.budget.expectedRevenue - eventData.budget.totalBudget >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatSafeCurrency(eventData.budget.expectedRevenue - eventData.budget.totalBudget)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="checklist" className="mt-6">
              <div className="space-y-3">
                {checklist.map((item, index) => (
                  <div key={index} className="flex items-start justify-between p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                    <div className="flex items-start space-x-3 flex-1">
                      {item.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`font-medium ${item.completed ? "text-white" : "text-slate-400"}`}>
                            {item.item}
                          </span>
                          {item.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{item.details}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                    <h4 className="font-medium text-white mb-3">Venues ({eventData.venues.length})</h4>
                    {eventData.venues.length > 0 ? (
                      <div className="space-y-2">
                        {eventData.venues.map((venue, index) => (
                          <div key={index} className="text-sm">
                            <span className="text-white">{venue.name}</span>
                            <span className="text-slate-400 ml-2">• {venue.capacity} capacity</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">No venues selected</p>
                    )}
                  </div>
                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700">
                    <h4 className="font-medium text-white mb-3">Ticket Types ({eventData.ticketTypes.length})</h4>
                    {eventData.ticketTypes.length > 0 ? (
                      <div className="space-y-2">
                        {eventData.ticketTypes.map((ticket, index) => (
                          <div key={index} className="text-sm">
                            <span className="text-white">{ticket.name}</span>
                            <span className="text-slate-400 ml-2">• ${ticket.price}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">No ticket types created</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-6">
              <div className="text-center">
                <Button
                  onClick={() => setShowPreview(true)}
                  variant="outline"
                  className="border-slate-600 hover:border-slate-500"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview Event Page
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-center space-x-4">
        <Button
          onClick={handleSaveDraft}
          variant="outline"
          className="border-slate-600 hover:border-slate-500"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Draft
        </Button>
        <Button
          onClick={handleRequestReview}
          variant="outline"
          className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
        >
          <Eye className="h-4 w-4 mr-2" />
          Request Review
        </Button>
        <Button
          onClick={handlePublish}
          disabled={!canPublish}
          size="lg"
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        >
          <Rocket className="h-5 w-5 mr-2" />
          {canPublish ? "Publish Event" : `Complete ${requiredTotal - requiredCompleted} required items`}
        </Button>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <EventPreviewModal
          eventData={eventData}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}

// Schedule Item Card Component
function ScheduleItemCard({ item, onRemove }: {
  item: any
  onRemove: () => void
}) {
  return (
    <Card className="bg-slate-900/50 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="font-medium text-white">{item.title}</h4>
              <Badge variant="outline" className="text-xs border-purple-500/50 text-purple-400">
                {item.type}
              </Badge>
            </div>
            <p className="text-sm text-slate-400 mb-2">{item.description}</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <Label className="text-slate-400">Start Time</Label>
                <p className="text-white">{item.startTime}</p>
              </div>
              <div>
                <Label className="text-slate-400">End Time</Label>
                <p className="text-white">{item.endTime}</p>
              </div>
              <div>
                <Label className="text-slate-400">Venue</Label>
                <p className="text-white">{item.venue}</p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Venue-related Components
function VenueCard({ venue, onUpdate, onRemove }: {
  venue: any
  onUpdate: (updates: any) => void
  onRemove: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <Card className="bg-slate-900/50 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="font-medium text-white">{venue.name}</h4>
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  venue.bookingStatus === 'confirmed' ? 'border-green-500/50 text-green-400' :
                  venue.bookingStatus === 'pending' ? 'border-yellow-500/50 text-yellow-400' :
                  'border-slate-500/50 text-slate-400'
                }`}
              >
                {venue.bookingStatus}
              </Badge>
            </div>
            <p className="text-sm text-slate-400 mb-2">{venue.address}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-slate-400">Date</Label>
                <DatePicker
                  date={parseDateOrUndefined(venue.selectedDate)}
                  onDateChange={(date) => onUpdate({ selectedDate: date?.toISOString().split('T')[0] })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-400">Time</Label>
                <TimePicker
                  time={venue.selectedTime}
                  onTimeChange={(time) => onUpdate({ selectedTime: time })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="border-slate-600 hover:border-slate-500"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onRemove}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function VenueBrowser({ 
  venues, 
  isLoading, 
  searchQuery, 
  onSearchChange, 
  onSelect, 
  onClose 
}: {
  venues: any[]
  isLoading: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelect: (venue: any) => void
  onClose: () => void
}) {
  const [selectedVenue, setSelectedVenue] = useState<any>(null)

  const filteredVenues = venues.filter(venue =>
    venue.venue_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (venue.description && venue.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (venue.city && venue.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (venue.venue_types && venue.venue_types.some((type: string) => 
      type.toLowerCase().includes(searchQuery.toLowerCase())
    ))
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl max-h-[90vh] bg-slate-900 rounded-xl border border-slate-700 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Choose Venue</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Input
              placeholder="Search venues by name, location, or type..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white pl-10"
            />
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div className="flex h-[600px]">
          {/* Venue List */}
          <div className="w-1/2 p-4 border-r border-slate-700 overflow-y-auto">
            <div className="space-y-3">
              {filteredVenues.map((venue) => (
                <Card
                  key={venue.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedVenue?.id === venue.id
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                  }`}
                  onClick={() => setSelectedVenue(venue)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-white">{venue.venue_name}</h4>
                      <Badge 
                        variant="outline" 
                        className="text-xs border-green-500/50 text-green-400"
                      >
                        Available
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">
                      {[venue.address, venue.city, venue.state].filter(Boolean).join(', ')}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">
                        {venue.venue_types?.join(', ') || 'Venue'}
                      </span>
                      <span className="text-slate-300">
                        {venue.capacity ? `${formatSafeNumber(venue.capacity)} capacity` : 'Capacity TBD'}
                      </span>
                    </div>
                    {venue.description && (
                      <div className="mt-2 text-sm text-slate-400 line-clamp-2">
                        {venue.description}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Venue Details */}
          <div className="w-1/2 p-4">
            {selectedVenue ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-white mb-2">{selectedVenue.venue_name}</h4>
                  <p className="text-slate-400">
                    {[selectedVenue.address, selectedVenue.city, selectedVenue.state].filter(Boolean).join(', ')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-slate-400">Type</Label>
                    <p className="text-white">{selectedVenue.venue_types?.join(', ') || 'Venue'}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Capacity</Label>
                    <p className="text-white">
                      {selectedVenue.capacity ? `${formatSafeNumber(selectedVenue.capacity)}` : 'Capacity TBD'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Status</Label>
                    <p className="text-white">Available</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Location</Label>
                    <p className="text-white">{selectedVenue.city}, {selectedVenue.state}</p>
                  </div>
                </div>

                {selectedVenue.description && (
                  <div>
                    <Label className="text-slate-400">Description</Label>
                    <p className="text-white text-sm">{selectedVenue.description}</p>
                  </div>
                )}

                <div>
                  <Label className="text-slate-400">Contact</Label>
                  <div className="space-y-1 mt-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-slate-400" />
                      <span className="text-white">
                        {selectedVenue.contact_info?.manager_name || 'Contact Venue'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className="text-white">
                        {selectedVenue.contact_info?.email || selectedVenue.contact_info?.booking_email || 'Email not available'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span className="text-white">
                        {selectedVenue.contact_info?.phone || 'Phone not available'}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => onSelect(selectedVenue)}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Select This Venue
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MapPin className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">Select a venue to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ScheduleTimeline({ schedule, venues, onRemoveItem }: {
  schedule: any[]
  venues: any[]
  onRemoveItem: (itemId: string) => void
}) {
  const sortedSchedule = [...schedule].sort((a, b) => {
    const firstStart = parseTimeToMinutes(a.startTime) ?? 0
    const secondStart = parseTimeToMinutes(b.startTime) ?? 0
    return firstStart - secondStart
  })

  const getScheduleTypeColor = (type: string) => {
    switch (type) {
      case 'performance': return 'border-purple-500/50 bg-purple-500/10 text-purple-400'
      case 'workshop': return 'border-blue-500/50 bg-blue-500/10 text-blue-400'
      case 'break': return 'border-green-500/50 bg-green-500/10 text-green-400'
      case 'setup': return 'border-orange-500/50 bg-orange-500/10 text-orange-400'
      case 'other': return 'border-slate-500/50 bg-slate-500/10 text-slate-400'
      default: return 'border-slate-500/50 bg-slate-500/10 text-slate-400'
    }
  }

  return (
    <div className="space-y-3">
      {sortedSchedule.map((item, index) => (
        <Card key={item.id} className="bg-slate-900/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-medium text-white">{item.title}</h4>
                  <Badge variant="outline" className={`text-xs ${getScheduleTypeColor(item.type)}`}>
                    {item.type}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-slate-400">Time</Label>
                    <p className="text-white">{item.startTime} - {item.endTime}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Venue</Label>
                    <p className="text-white">{item.venue}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Duration</Label>
                    <p className="text-white">
                      {Math.abs((parseTimeToMinutes(item.endTime) ?? 0) - (parseTimeToMinutes(item.startTime) ?? 0))} minutes
                    </p>
                  </div>
                </div>
                {item.description && (
                  <p className="text-sm text-slate-400 mt-2">{item.description}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRemoveItem(item.id)}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ScheduleItemForm({ venues, onAdd, onClose, conflicts }: {
  venues: any[]
  onAdd: (item: any) => boolean
  onClose: () => void
  conflicts: string[]
}) {
  const [formData, setFormData] = useState({
    title: "",
    startTime: "",
    endTime: "",
    venue: "",
    type: "performance",
    description: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const success = onAdd(formData)
    if (success) {
      setFormData({
        title: "",
        startTime: "",
        endTime: "",
        venue: "",
        type: "performance",
        description: ""
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-slate-900 rounded-xl border border-slate-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Add Schedule Item</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-white">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Performance, Workshop, Break, etc."
              className="bg-slate-800 border-slate-700 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time" className="text-white">Start Time *</Label>
              <TimePicker
                time={formData.startTime}
                onTimeChange={(time) => setFormData({ ...formData, startTime: time })}
                placeholder="Start time"
              />
            </div>
            <div>
              <Label htmlFor="end-time" className="text-white">End Time *</Label>
              <TimePicker
                time={formData.endTime}
                onTimeChange={(time) => setFormData({ ...formData, endTime: time })}
                placeholder="End time"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="venue" className="text-white">Venue *</Label>
              <Select value={formData.venue} onValueChange={(value) => setFormData({ ...formData, venue: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select venue" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {venues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.name} className="text-white">
                      {venue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="type" className="text-white">Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="performance" className="text-white">Performance</SelectItem>
                  <SelectItem value="workshop" className="text-white">Workshop</SelectItem>
                  <SelectItem value="break" className="text-white">Break</SelectItem>
                  <SelectItem value="setup" className="text-white">Setup</SelectItem>
                  <SelectItem value="other" className="text-white">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details..."
              className="bg-slate-800 border-slate-700 text-white"
              rows={3}
            />
          </div>

          {conflicts.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center mb-2">
                <AlertTriangle className="h-4 w-4 text-red-400 mr-2" />
                <span className="text-sm font-medium text-red-400">Scheduling Conflicts</span>
              </div>
              <ul className="text-xs text-red-300 space-y-1">
                {conflicts.map((conflict, index) => (
                  <li key={index}>• {conflict}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-slate-700 hover:border-slate-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700"
              disabled={!formData.title || !formData.startTime || !formData.endTime || !formData.venue}
            >
              Add to Schedule
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
} 

// Marketing & Promotion Supporting Components
function CampaignCard({ 
  campaign, 
  onUpdate, 
  onDelete, 
  onContentAdd,
  campaignTypes,
  getStatusColor,
  getCampaignTypeIcon
}: { 
  campaign: any
  onUpdate: (updates: any) => void
  onDelete: () => void
  onContentAdd: (content: any) => void
  campaignTypes: any[]
  getStatusColor: (status: string) => string
  getCampaignTypeIcon: (type: string) => string
}) {
  const [showContentForm, setShowContentForm] = useState(false)
  const campaignType = campaignTypes.find(t => t.id === campaign.type)

  return (
    <Card className="bg-slate-900/50 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getCampaignTypeIcon(campaign.type)}</div>
            <div>
              <h4 className="font-medium text-white">{campaign.name}</h4>
              <p className="text-sm text-slate-400">{campaignType?.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={`text-xs ${getStatusColor(campaign.status)}`}>
              {campaign.status}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <Label className="text-slate-400">Budget</Label>
            <p className="text-white">{formatSafeCurrency(campaign.budget)}</p>
          </div>
          <div>
            <Label className="text-slate-400">Platform</Label>
            <p className="text-white">{campaign.platform}</p>
          </div>
          <div>
            <Label className="text-slate-400">Start Date</Label>
            <p className="text-white">{campaign.startDate || "Not set"}</p>
          </div>
          <div>
            <Label className="text-slate-400">End Date</Label>
            <p className="text-white">{campaign.endDate || "Not set"}</p>
          </div>
        </div>

        {campaign.targetAudience && (
          <div className="mb-4">
            <Label className="text-slate-400 text-sm">Target Audience</Label>
            <p className="text-white text-sm">{campaign.targetAudience}</p>
          </div>
        )}

        {campaign.goals && (
          <div className="mb-4">
            <Label className="text-slate-400 text-sm">Goals</Label>
            <p className="text-white text-sm">{campaign.goals}</p>
          </div>
        )}

        {/* Content Section */}
        <div className="border-t border-slate-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium text-white">Content ({campaign.content?.length || 0})</h5>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowContentForm(true)}
              className="border-slate-600 hover:border-slate-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Content
            </Button>
          </div>

          {campaign.content && campaign.content.length > 0 ? (
            <div className="space-y-2">
              {campaign.content.map((content: any, index: number) => (
                <div key={index} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <h6 className="font-medium text-white">{content.title}</h6>
                    <Badge variant="outline" className="text-xs">
                      {content.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">{content.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-slate-400 text-sm">No content created yet</p>
            </div>
          )}
        </div>

        {/* Content Form Modal */}
        {showContentForm && (
          <ContentFormModal
            campaign={campaign}
            onSubmit={(content) => {
              onContentAdd(content)
              setShowContentForm(false)
            }}
            onClose={() => setShowContentForm(false)}
            contentTemplates={[]}
          />
        )}
      </CardContent>
    </Card>
  )
}

function CampaignFormModal({ 
  form, 
  setForm, 
  onSubmit, 
  onClose, 
  campaignTypes 
}: { 
  form: any
  setForm: (form: any) => void
  onSubmit: () => void
  onClose: () => void
  campaignTypes: any[]
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-slate-900 rounded-xl border border-slate-700 p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Create Marketing Campaign</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-white">Campaign Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Summer Concert Series"
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="type" className="text-white">Campaign Type *</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {campaignTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center space-x-2">
                        <span>{type.icon}</span>
                        <span>{type.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="platform" className="text-white">Platform</Label>
              <Select value={form.platform} onValueChange={(value) => setForm({ ...form, platform: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {campaignTypes.find(t => t.id === form.type)?.platforms.map((platform: string) => (
                    <SelectItem key={platform} value={platform.toLowerCase()}>
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="budget" className="text-white">Budget ($)</Label>
              <Input
                id="budget"
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: parseDecimalInput(e.target.value) })}
                placeholder="1000"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date" className="text-white">Start Date</Label>
              <DatePicker
                date={parseDateOrUndefined(form.startDate)}
                onDateChange={(date) => setForm({ ...form, startDate: date?.toISOString().split('T')[0] || "" })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label htmlFor="end-date" className="text-white">End Date</Label>
              <DatePicker
                date={parseDateOrUndefined(form.endDate)}
                onDateChange={(date) => setForm({ ...form, endDate: date?.toISOString().split('T')[0] || "" })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="target-audience" className="text-white">Target Audience</Label>
            <Input
              id="target-audience"
              value={form.targetAudience}
              onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
              placeholder="Music lovers aged 18-35, local community"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div>
            <Label htmlFor="goals" className="text-white">Campaign Goals</Label>
            <Textarea
              id="goals"
              value={form.goals}
              onChange={(e) => setForm({ ...form, goals: e.target.value })}
              placeholder="Increase ticket sales by 50%, reach 10,000 people, generate 500 social media mentions"
              className="bg-slate-800 border-slate-700 text-white"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              Create Campaign
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function ContentFormModal({ 
  campaign, 
  onSubmit, 
  onClose, 
  contentTemplates 
}: { 
  campaign: any
  onSubmit: (content: any) => void
  onClose: () => void
  contentTemplates: any[]
}) {
  const [form, setForm] = useState({
    title: "",
    type: "social-post",
    description: "",
    template: "",
    scheduledDate: "",
    platforms: [] as string[]
  })

  const contentTypes = [
    { id: "social-post", name: "Social Media Post", icon: "📱" },
    { id: "email", name: "Email Newsletter", icon: "📧" },
    { id: "ad", name: "Paid Advertisement", icon: "💰" },
    { id: "video", name: "Video Content", icon: "🎥" },
    { id: "image", name: "Image/Graphic", icon: "🖼️" }
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const content = {
      id: Date.now().toString(),
      ...form,
      campaignId: campaign.id,
      status: "draft",
      createdAt: new Date().toISOString()
    }
    onSubmit(content)
  }

  const handleTemplateSelect = (template: any) => {
    setForm({ ...form, description: template.template })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-slate-900 rounded-xl border border-slate-700 p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Create Content for {campaign.name}</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title" className="text-white">Content Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Event Announcement Post"
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="type" className="text-white">Content Type *</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center space-x-2">
                        <span>{type.icon}</span>
                        <span>{type.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {contentTemplates.length > 0 && (
            <div>
              <Label className="text-white">Content Templates</Label>
              <div className="grid gap-2 mt-2">
                {contentTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 cursor-pointer hover:border-slate-600"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">{template.name}</h4>
                      <Button size="sm" variant="outline" className="border-slate-600 hover:border-slate-500">
                        Use Template
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="description" className="text-white">Content *</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Write your content here..."
              className="bg-slate-800 border-slate-700 text-white"
              rows={6}
              required
            />
          </div>

          <div>
            <Label htmlFor="scheduled-date" className="text-white">Scheduled Date</Label>
            <DatePicker
              date={parseDateOrUndefined(form.scheduledDate)}
              onDateChange={(date) => setForm({ ...form, scheduledDate: date?.toISOString().split('T')[0] || "" })}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              Create Content
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// Financials & Review Supporting Components
function BudgetFormModal({ 
  category, 
  categories, 
  onSubmit, 
  onUpdate, 
  onClose 
}: { 
  category?: any
  categories: any[]
  onSubmit: (category: any) => void
  onUpdate?: (updates: any) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name: category?.name || "",
    allocated: category?.allocated || 0,
    spent: category?.spent || 0
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onUpdate && category) {
      onUpdate(form)
    } else {
      onSubmit(form)
    }
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-slate-900 rounded-xl border border-slate-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">
            {category ? "Edit Budget Category" : "Add Budget Category"}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-white">Category Name *</Label>
            <Select value={form.name} onValueChange={(value) => setForm({ ...form, name: value })}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    <div className="flex items-center space-x-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="allocated" className="text-white">Allocated Budget ($) *</Label>
            <Input
              id="allocated"
              type="number"
              value={form.allocated}
              onChange={(e) => setForm({ ...form, allocated: parseDecimalInput(e.target.value) })}
              placeholder="1000"
              className="bg-slate-800 border-slate-700 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="spent" className="text-white">Amount Spent ($)</Label>
            <Input
              id="spent"
              type="number"
              value={form.spent}
              onChange={(e) => setForm({ ...form, spent: parseDecimalInput(e.target.value) })}
              placeholder="0"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              {category ? "Update Category" : "Add Category"}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function RevenueFormModal({ 
  revenueSources, 
  currentRevenue, 
  onSubmit, 
  onClose 
}: { 
  revenueSources: any[]
  currentRevenue: number
  onSubmit: (revenue: number) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    sources: revenueSources.map(source => ({
      ...source,
      amount: 0
    }))
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const totalRevenue = form.sources.reduce((total, source) => total + source.amount, 0)
    onSubmit(totalRevenue)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-slate-900 rounded-xl border border-slate-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Revenue Projections</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {form.sources.map((source, index) => (
              <div key={source.id} className="flex items-center space-x-3">
                <div className="text-2xl">{source.icon}</div>
                <div className="flex-1">
                  <Label className="text-white text-sm">{source.name}</Label>
                </div>
                <Input
                  type="number"
                  value={source.amount}
                  onChange={(e) => {
                    const updatedSources = [...form.sources]
                    updatedSources[index].amount = parseDecimalInput(e.target.value)
                    setForm({ ...form, sources: updatedSources })
                  }}
                  placeholder="0"
                  className="w-32 bg-slate-800 border-slate-700 text-white"
                />
              </div>
            ))}
          </div>

          <div className="border-t border-slate-700 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">Total Expected Revenue:</span>
              <span className="text-2xl font-bold text-green-400">
                {formatSafeCurrency(form.sources.reduce((total, source) => total + source.amount, 0))}
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              Update Revenue
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function EventPreviewModal({ 
  eventData, 
  onClose 
}: { 
  eventData: EventPlannerData
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-slate-900 rounded-xl border border-slate-700 p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Event Preview</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Event Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white mb-2">{eventData.name || "Event Name"}</h1>
            <p className="text-slate-400 mb-4">{eventData.description || "Event description"}</p>
            <div className="flex items-center justify-center space-x-4 text-sm text-slate-400">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Date TBD</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="h-4 w-4" />
                <span>{eventData.venues.length} venue(s)</span>
              </div>
              <div className="flex items-center space-x-1">
                <Ticket className="h-4 w-4" />
                <span>{eventData.ticketTypes.length} ticket type(s)</span>
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <h4 className="font-medium text-white mb-3">Event Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Type:</span>
                  <span className="text-white capitalize">{eventData.eventType || "Not specified"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Privacy:</span>
                  <span className="text-white capitalize">{eventData.privacy || "Public"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Contact:</span>
                  <span className="text-white">{eventData.primaryContact || "Not specified"}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <h4 className="font-medium text-white mb-3">Financial Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Budget:</span>
                  <span className="text-white">{formatSafeCurrency(eventData.budget.totalBudget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Expected Revenue:</span>
                  <span className="text-white">{formatSafeCurrency(eventData.budget.expectedRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Profit:</span>
                  <span className={`${eventData.budget.expectedRevenue - eventData.budget.totalBudget >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatSafeCurrency(eventData.budget.expectedRevenue - eventData.budget.totalBudget)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ticket Types */}
          {eventData.ticketTypes.length > 0 && (
            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
              <h4 className="font-medium text-white mb-3">Available Tickets</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {eventData.ticketTypes.map((ticket, index) => (
                  <div key={index} className="p-3 rounded-lg bg-slate-900/50 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-white">{ticket.name}</h5>
                      <span className="text-lg font-bold text-green-400">${ticket.price}</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2">{ticket.description}</p>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{ticket.quantity} available</span>
                      <span>Max {ticket.maxPerCustomer} per customer</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call to Action */}
          <div className="text-center p-6 rounded-lg bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30">
            <h3 className="text-xl font-bold text-white mb-2">Ready to Attend?</h3>
            <p className="text-slate-300 mb-4">Get your tickets now and be part of this amazing event!</p>
            <Button size="lg" className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Ticket className="h-5 w-5 mr-2" />
              Get Tickets
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}