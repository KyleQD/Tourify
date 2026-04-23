"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Plus, 
  X, 
  Calendar as CalendarIcon, 
  MapPin, 
  DollarSign, 
  Clock,
  Users,
  Mic,
  Music,
  Settings,
  Star,
  AlertCircle,
  Info,
  CheckCircle,
  Sparkles,
  Zap
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { 
  CreateJobFormData, 
  ArtistJobCategory,
  PAYMENT_TYPE_OPTIONS,
  JOB_TYPE_OPTIONS,
  LOCATION_TYPE_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS
} from '@/types/artist-jobs'

interface JobPostingModalProps {
  isOpen: boolean
  onClose: () => void
  onJobCreated: (job: any) => void
  categories: ArtistJobCategory[]
}

const commonGenres = [
  'Rock', 'Pop', 'Hip-Hop', 'Jazz', 'Blues', 'Country', 'Electronic', 'Folk',
  'Classical', 'R&B', 'Soul', 'Funk', 'Reggae', 'Punk', 'Metal', 'Indie',
  'Alternative', 'World Music', 'Gospel', 'Latin', 'Ambient', 'House', 'Techno'
]

const commonSkills = [
  'Live Performance', 'Studio Recording', 'Songwriting', 'Music Production',
  'Mixing', 'Mastering', 'Guitar', 'Bass', 'Drums', 'Vocals', 'Piano',
  'Keyboard', 'Saxophone', 'Trumpet', 'Violin', 'Cello', 'Sound Engineering',
  'Stage Management', 'Lighting', 'Photography', 'Video Production', 'Marketing'
]

const commonEquipment = [
  'Microphones', 'Guitars', 'Amplifiers', 'Keyboards', 'Drum Kit', 'PA System',
  'Mixing Board', 'Monitors', 'Cables', 'Instruments', 'Effects Pedals',
  'Recording Equipment', 'Lighting Equipment', 'Video Equipment', 'Transportation'
]

const commonBenefits = [
  'Networking Opportunities', 'Performance Experience', 'Studio Access',
  'Equipment Provided', 'Meals Included', 'Transportation', 'Accommodation',
  'Professional Development', 'Industry Connections', 'Portfolio Building',
  'Mentorship', 'Future Opportunities', 'Royalty Sharing', 'Credit/Recognition'
]

const stepVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
}

export function JobPostingModal({ isOpen, onClose, onJobCreated, categories }: JobPostingModalProps) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<CreateJobFormData>({
    title: '',
    description: '',
    category_id: '',
    job_type: 'one_time',
    payment_type: 'paid',
    payment_amount: undefined,
    payment_currency: 'USD',
    payment_description: '',
    location: '',
    location_type: 'in_person',
    city: '',
    state: '',
    country: '',
    event_date: undefined,
    event_time: undefined,
    duration_hours: undefined,
    deadline: undefined,
    required_skills: [],
    required_equipment: [],
    required_experience: 'intermediate',
    required_genres: [],
    age_requirement: '',
    benefits: [],
    special_requirements: '',
    contact_email: '',
    contact_phone: '',
    external_link: '',
    priority: 'normal',
    featured: false,
    status: 'open'
  })

  const [skillInput, setSkillInput] = useState('')
  const [equipmentInput, setEquipmentInput] = useState('')
  const [customGenre, setCustomGenre] = useState('')
  const [customBenefit, setCustomBenefit] = useState('')
  const [eventDate, setEventDate] = useState<Date>()
  const [deadlineDate, setDeadlineDate] = useState<Date>()

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category_id: '',
      job_type: 'one_time',
      payment_type: 'paid',
      payment_amount: undefined,
      payment_currency: 'USD',
      payment_description: '',
      location: '',
      location_type: 'in_person',
      city: '',
      state: '',
      country: '',
      event_date: undefined,
      event_time: undefined,
      duration_hours: undefined,
      deadline: undefined,
      required_skills: [],
      required_equipment: [],
      required_experience: 'intermediate',
      required_genres: [],
      age_requirement: '',
      benefits: [],
      special_requirements: '',
      contact_email: '',
      contact_phone: '',
      external_link: '',
      priority: 'normal',
      featured: false,
      status: 'open'
    })
    setCurrentStep(1)
    setEventDate(undefined)
    setDeadlineDate(undefined)
    setSkillInput('')
    setEquipmentInput('')
    setCustomGenre('')
    setCustomBenefit('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const addSkill = (skill: string) => {
    if (skill && !formData.required_skills?.includes(skill)) {
      setFormData(prev => ({
        ...prev,
        required_skills: [...(prev.required_skills || []), skill]
      }))
      setSkillInput('')
    }
  }

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      required_skills: prev.required_skills?.filter(s => s !== skill) || []
    }))
  }

  const addEquipment = (equipment: string) => {
    if (equipment && !formData.required_equipment?.includes(equipment)) {
      setFormData(prev => ({
        ...prev,
        required_equipment: [...(prev.required_equipment || []), equipment]
      }))
      setEquipmentInput('')
    }
  }

  const removeEquipment = (equipment: string) => {
    setFormData(prev => ({
      ...prev,
      required_equipment: prev.required_equipment?.filter(e => e !== equipment) || []
    }))
  }

  const addGenre = (genre: string) => {
    if (genre && !formData.required_genres?.includes(genre)) {
      setFormData(prev => ({
        ...prev,
        required_genres: [...(prev.required_genres || []), genre]
      }))
      setCustomGenre('')
    }
  }

  const removeGenre = (genre: string) => {
    setFormData(prev => ({
      ...prev,
      required_genres: prev.required_genres?.filter(g => g !== genre) || []
    }))
  }

  const addBenefit = (benefit: string) => {
    if (benefit && !formData.benefits?.includes(benefit)) {
      setFormData(prev => ({
        ...prev,
        benefits: [...(prev.benefits || []), benefit]
      }))
      setCustomBenefit('')
    }
  }

  const removeBenefit = (benefit: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits?.filter(b => b !== benefit) || []
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        event_date: eventDate ? format(eventDate, 'yyyy-MM-dd') : undefined,
        deadline: deadlineDate ? format(deadlineDate, 'yyyy-MM-dd') : undefined,
      }

      const response = await fetch('/api/artist-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(submitData),
      })

      const rawText = await response.text()
      let result: { success?: boolean; error?: string; data?: { title?: string } }
      try {
        result = rawText ? JSON.parse(rawText) : {}
      } catch {
        throw new Error(`HTTP ${response.status}: ${rawText || response.statusText}`)
      }

      if (!response.ok || !result.success) {
        const msg = result.error || rawText || `Request failed (${response.status})`
        throw new Error(msg)
      }

      if (result.data?.title) console.log('Job posted successfully:', result.data.title)

      try {
        onJobCreated(result.data)
      } catch (callbackError) {
        console.error('Error in onJobCreated callback:', callbackError)
      }

      toast({
        title: 'Job posted',
        description: result.data?.title
          ? `"${result.data.title}" is live on the job board.`
          : 'Your job is live on the job board.',
      })
      resetForm()
      onClose()
    } catch (error) {
      console.error('Error submitting job:', error)
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred'
      toast({
        title: 'Could not post job',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceed = (step: number) => {
    switch (step) {
      case 1:
        return formData.title && formData.description && formData.category_id
      case 2:
        return formData.job_type && formData.payment_type
      case 3:
        return true // Optional fields
      case 4:
        return true // Review step
      default:
        return false
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "max-w-4xl max-h-[90vh] overflow-y-auto",
        "bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95",
        "backdrop-blur-xl border border-slate-700/50",
        "shadow-2xl shadow-slate-900/50"
      )}>
        {/* Animated background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),rgba(255,255,255,0))] opacity-60 rounded-lg" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 rounded-lg" />
        
        <DialogHeader className="relative z-10">
          <DialogTitle className="text-3xl font-bold flex items-center gap-3">
            <motion.div 
              className="h-12 w-12 rounded-2xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-600 flex items-center justify-center shadow-2xl border border-white/10"
              whileHover={{ 
                rotate: 360,
                scale: 1.1,
                transition: { duration: 0.6, ease: "easeInOut" }
              }}
            >
              <Plus className="w-6 h-6 text-white drop-shadow-sm" />
            </motion.div>
            <span className="bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent">
              Post a Job
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 relative z-10">
          {/* Progress Steps */}
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <motion.div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-medium shadow-lg border",
                    currentStep >= step
                      ? "bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white border-purple-400/50"
                      : "bg-slate-800/50 text-slate-400 border-slate-700/50"
                  )}
                  whileHover={{ 
                    scale: 1.05,
                    transition: { type: "spring", stiffness: 400, damping: 17 }
                  }}
                  animate={currentStep >= step ? { 
                    boxShadow: "0 0 20px rgba(168, 85, 247, 0.4)" 
                  } : {}}
                >
                  {currentStep > step ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    step
                  )}
                </motion.div>
                {step < 4 && (
                  <div
                    className={cn(
                      "w-20 h-1 mx-2 rounded-full transition-all duration-500",
                      currentStep > step 
                        ? "bg-gradient-to-r from-purple-500 to-fuchsia-600" 
                        : "bg-slate-700/50"
                    )}
                  />
                )}
              </div>
            ))}
          </motion.div>

          {/* Step Labels */}
          <div className="flex justify-between text-sm">
            {[
              { label: "Basic Info", icon: Info },
              { label: "Job Details", icon: Settings },
              { label: "Requirements", icon: Star },
              { label: "Review", icon: CheckCircle }
            ].map((item, index) => (
              <motion.div
                key={item.label}
                className={cn(
                  "flex items-center gap-2 transition-colors duration-300",
                  currentStep > index + 1 
                    ? "text-purple-400" 
                    : currentStep === index + 1 
                    ? "text-white" 
                    : "text-slate-400"
                )}
                whileHover={{ scale: 1.02 }}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </motion.div>
            ))}
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <Card className={cn(
                  "bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60",
                  "border border-slate-700/30 backdrop-blur-xl",
                  "hover:border-slate-600/50 transition-all duration-300",
                  "hover:shadow-2xl hover:shadow-slate-900/50 relative overflow-hidden"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
                  
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-3">
                      <motion.div
                        className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg border border-white/10"
                        whileHover={{ 
                          rotate: 360,
                          transition: { duration: 0.6, ease: "easeInOut" }
                        }}
                      >
                        <Info className="w-5 h-5 text-white" />
                      </motion.div>
                      <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                        Basic Information
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="title" className="text-slate-300 font-medium">Job Title *</Label>
                        <Input
                          id="title"
                          placeholder="e.g., Lead Guitarist Needed for Rock Band"
                          value={formData.title}
                          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                          className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-slate-300 font-medium">Category *</Label>
                        <Select
                          value={formData.category_id}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                        >
                          <SelectTrigger className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {(categories || []).map((category) => (
                              <SelectItem key={category.id} value={category.id} className="text-white hover:bg-slate-700">
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="job_type" className="text-slate-300 font-medium">Job Type *</Label>
                        <Select
                          value={formData.job_type}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, job_type: value as any }))}
                        >
                          <SelectTrigger className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {JOB_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value} className="text-white hover:bg-slate-700">
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-slate-300 font-medium">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the position, requirements, and what you're looking for..."
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={4}
                        className={cn(
                          "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                          "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300 resize-none"
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <Card className={cn(
                  "bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60",
                  "border border-slate-700/30 backdrop-blur-xl",
                  "hover:border-slate-600/50 transition-all duration-300",
                  "hover:shadow-2xl hover:shadow-slate-900/50 relative overflow-hidden"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
                  
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-3">
                      <motion.div
                        className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg border border-white/10"
                        whileHover={{ 
                          rotate: 360,
                          transition: { duration: 0.6, ease: "easeInOut" }
                        }}
                      >
                        <DollarSign className="w-5 h-5 text-white" />
                      </motion.div>
                      <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                        Payment & Location
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-slate-300 font-medium">Payment Type *</Label>
                        <Select
                          value={formData.payment_type}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, payment_type: value as any }))}
                        >
                          <SelectTrigger className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {PAYMENT_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value} className="text-white hover:bg-slate-700">
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.payment_type === 'paid' && (
                        <div className="space-y-2">
                          <Label htmlFor="payment_amount" className="text-slate-300 font-medium">Payment Amount</Label>
                          <div className="flex">
                            <span className="inline-flex items-center px-3 text-sm bg-slate-800 border border-r-0 border-slate-700 rounded-l-md text-slate-300">
                              $
                            </span>
                            <Input
                              id="payment_amount"
                              type="number"
                              placeholder="500"
                              min="0"
                              step="1"
                              value={formData.payment_amount || ''}
                              onChange={(e) => setFormData(prev => ({ 
                                ...prev, 
                                payment_amount: e.target.value ? parseFloat(e.target.value) : undefined 
                              }))}
                              className={cn(
                                "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                                "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300 rounded-l-none"
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {formData.payment_type !== 'paid' && (
                      <div className="space-y-2">
                        <Label htmlFor="payment_description" className="text-slate-300 font-medium">Payment Description</Label>
                        <Input
                          id="payment_description"
                          placeholder="e.g., Revenue split, Exposure opportunity, etc."
                          value={formData.payment_description || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, payment_description: e.target.value }))}
                          className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}
                        />
                      </div>
                    )}

                    <Separator className="bg-slate-700/30" />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-slate-300 font-medium">Location Type</Label>
                        <Select
                          value={formData.location_type || 'in_person'}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, location_type: value as any }))}
                        >
                          <SelectTrigger className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {LOCATION_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value!} value={option.value!} className="text-white hover:bg-slate-700">
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-slate-300 font-medium">Venue/Location</Label>
                        <Input
                          id="location"
                          placeholder="e.g., The Fillmore, Recording Studio, etc."
                          value={formData.location || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-slate-300 font-medium">City</Label>
                        <Input
                          id="city"
                          placeholder="San Francisco"
                          value={formData.city || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-slate-300 font-medium">State</Label>
                        <Input
                          id="state"
                          placeholder="CA"
                          value={formData.state || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                          className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country" className="text-slate-300 font-medium">Country</Label>
                        <Input
                          id="country"
                          placeholder="USA"
                          value={formData.country || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                          className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60",
                  "border border-slate-700/30 backdrop-blur-xl",
                  "hover:border-slate-600/50 transition-all duration-300",
                  "hover:shadow-2xl hover:shadow-slate-900/50 relative overflow-hidden"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
                  
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-3">
                      <motion.div
                        className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg border border-white/10"
                        whileHover={{ 
                          rotate: 360,
                          transition: { duration: 0.6, ease: "easeInOut" }
                        }}
                      >
                        <CalendarIcon className="w-5 h-5 text-white" />
                      </motion.div>
                      <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                        Dates & Timing
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-slate-300 font-medium">Event Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                "bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50",
                                "hover:border-slate-600/50 transition-all duration-300",
                                !eventDate && "text-slate-400"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700" align="start">
                            <Calendar
                              mode="single"
                              selected={eventDate}
                              onSelect={setEventDate}
                              initialFocus
                              disabled={(date) => date < new Date()}
                              className="bg-slate-800 text-white [&_.rdp-day]:text-white [&_.rdp-day_selected]:bg-purple-600 [&_.rdp-day_selected]:text-white"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-slate-300 font-medium">Application Deadline</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                "bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50",
                                "hover:border-slate-600/50 transition-all duration-300",
                                !deadlineDate && "text-slate-400"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {deadlineDate ? format(deadlineDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700" align="start">
                            <Calendar
                              mode="single"
                              selected={deadlineDate}
                              onSelect={setDeadlineDate}
                              initialFocus
                              disabled={(date) => date < new Date()}
                              className="bg-slate-800 text-white [&_.rdp-day]:text-white [&_.rdp-day_selected]:bg-purple-600 [&_.rdp-day_selected]:text-white"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="event_time" className="text-slate-300 font-medium">Event Time</Label>
                        <Input
                          id="event_time"
                          type="time"
                          value={formData.event_time || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, event_time: e.target.value }))}
                          className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration_hours" className="text-slate-300 font-medium">Duration (hours)</Label>
                        <Input
                          id="duration_hours"
                          type="number"
                          placeholder="3"
                          min="0.5"
                          step="0.5"
                          value={formData.duration_hours || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            duration_hours: e.target.value ? parseFloat(e.target.value) : undefined 
                          }))}
                          className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <Card className={cn(
                  "bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60",
                  "border border-slate-700/30 backdrop-blur-xl",
                  "hover:border-slate-600/50 transition-all duration-300",
                  "hover:shadow-2xl hover:shadow-slate-900/50 relative overflow-hidden"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
                  
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-3">
                      <motion.div
                        className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg border border-white/10"
                        whileHover={{ 
                          rotate: 360,
                          transition: { duration: 0.6, ease: "easeInOut" }
                        }}
                      >
                        <Users className="w-5 h-5 text-white" />
                      </motion.div>
                      <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                        Requirements & Preferences
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10">
                    <div>
                      <Label className="text-slate-300 font-medium">Experience Level</Label>
                      <Select
                        value={formData.required_experience || 'intermediate'}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, required_experience: value as any }))}
                      >
                        <SelectTrigger className={cn(
                          "bg-slate-800/50 border-slate-700/50 text-white",
                          "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {EXPERIENCE_LEVEL_OPTIONS.map((option) => (
                            <SelectItem key={option.value!} value={option.value!} className="text-white hover:bg-slate-700">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-slate-300 font-medium">Required Genres</Label>
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {formData.required_genres?.map((genre) => (
                            <Badge key={genre} variant="secondary" className="bg-purple-600/20 text-purple-300 border-purple-600/30 pr-1">
                              {genre}
                              <X 
                                className="w-3 h-3 ml-1 cursor-pointer hover:text-red-400 transition-colors duration-200"
                                onClick={() => removeGenre(genre)}
                              />
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add custom genre"
                            value={customGenre}
                            onChange={(e) => setCustomGenre(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addGenre(customGenre)
                              }
                            }}
                            className={cn(
                              "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                              "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => addGenre(customGenre)}
                            disabled={!customGenre}
                            className={cn(
                              "bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50",
                              "hover:border-slate-600/50 transition-all duration-300",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {commonGenres.map((genre) => (
                            <Button
                              key={genre}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addGenre(genre)}
                              disabled={formData.required_genres?.includes(genre)}
                              className={cn(
                                "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50",
                                "hover:border-slate-600/50 transition-all duration-300",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                              )}
                            >
                              {genre}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-300 font-medium">Required Skills</Label>
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {formData.required_skills?.map((skill) => (
                            <Badge key={skill} variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-600/30 pr-1">
                              {skill}
                              <X 
                                className="w-3 h-3 ml-1 cursor-pointer hover:text-red-400 transition-colors duration-200"
                                onClick={() => removeSkill(skill)}
                              />
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add custom skill"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addSkill(skillInput)
                              }
                            }}
                            className={cn(
                              "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                              "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => addSkill(skillInput)}
                            disabled={!skillInput}
                            className={cn(
                              "bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50",
                              "hover:border-slate-600/50 transition-all duration-300",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {commonSkills.map((skill) => (
                            <Button
                              key={skill}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addSkill(skill)}
                              disabled={formData.required_skills?.includes(skill)}
                              className={cn(
                                "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50",
                                "hover:border-slate-600/50 transition-all duration-300",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                              )}
                            >
                              {skill}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-300 font-medium">Required Equipment</Label>
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {formData.required_equipment?.map((equipment) => (
                            <Badge key={equipment} variant="secondary" className="bg-slate-700/20 text-slate-300 border-slate-700/30 pr-1">
                              {equipment}
                              <X 
                                className="w-3 h-3 ml-1 cursor-pointer hover:text-red-400 transition-colors duration-200"
                                onClick={() => removeEquipment(equipment)}
                              />
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add custom equipment"
                            value={equipmentInput}
                            onChange={(e) => setEquipmentInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addEquipment(equipmentInput)
                              }
                            }}
                            className={cn(
                              "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                              "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => addEquipment(equipmentInput)}
                            disabled={!equipmentInput}
                            className={cn(
                              "bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50",
                              "hover:border-slate-600/50 transition-all duration-300",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {commonEquipment.map((equipment) => (
                            <Button
                              key={equipment}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addEquipment(equipment)}
                              disabled={formData.required_equipment?.includes(equipment)}
                              className={cn(
                                "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50",
                                "hover:border-slate-600/50 transition-all duration-300",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                              )}
                            >
                              {equipment}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(
                  "bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60",
                  "border border-slate-700/30 backdrop-blur-xl",
                  "hover:border-slate-600/50 transition-all duration-300",
                  "hover:shadow-2xl hover:shadow-slate-900/50 relative overflow-hidden"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
                  
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-3">
                      <motion.div
                        className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg border border-white/10"
                        whileHover={{ 
                          rotate: 360,
                          transition: { duration: 0.6, ease: "easeInOut" }
                        }}
                      >
                        <Star className="w-5 h-5 text-white" />
                      </motion.div>
                      <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                        Additional Information
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 relative z-10">
                    <div>
                      <Label className="text-slate-300 font-medium">Benefits & Perks</Label>
                      <div className="mt-2 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {formData.benefits?.map((benefit) => (
                            <Badge key={benefit} variant="secondary" className="bg-slate-700/20 text-slate-300 border-slate-700/30 pr-1">
                              {benefit}
                              <X 
                                className="w-3 h-3 ml-1 cursor-pointer hover:text-red-400 transition-colors duration-200"
                                onClick={() => removeBenefit(benefit)}
                              />
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add custom benefit"
                            value={customBenefit}
                            onChange={(e) => setCustomBenefit(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addBenefit(customBenefit)
                              }
                            }}
                            className={cn(
                              "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                              "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => addBenefit(customBenefit)}
                            disabled={!customBenefit}
                            className={cn(
                              "bg-slate-800/50 border-slate-700/50 text-white hover:bg-slate-700/50",
                              "hover:border-slate-600/50 transition-all duration-300",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {commonBenefits.map((benefit) => (
                            <Button
                              key={benefit}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addBenefit(benefit)}
                              disabled={formData.benefits?.includes(benefit)}
                              className={cn(
                                "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50",
                                "hover:border-slate-600/50 transition-all duration-300",
                                "disabled:opacity-50 disabled:cursor-not-allowed"
                              )}
                            >
                              {benefit}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="age_requirement" className="text-slate-300 font-medium">Age Requirement</Label>
                        <Input
                          id="age_requirement"
                          placeholder="e.g., 18+, 21+, etc."
                          value={formData.age_requirement || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, age_requirement: e.target.value }))}
                          className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact_email" className="text-slate-300 font-medium">Contact Email</Label>
                        <Input
                          id="contact_email"
                          type="email"
                          placeholder="booking@example.com"
                          value={formData.contact_email || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                          className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact_phone" className="text-slate-300 font-medium">Contact Phone</Label>
                        <Input
                          id="contact_phone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={formData.contact_phone || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                          className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}
                        />
                      </div>
                      <div>
                        <Label htmlFor="external_link" className="text-slate-300 font-medium">External Link</Label>
                        <Input
                          id="external_link"
                          type="url"
                          placeholder="https://example.com"
                          value={formData.external_link || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, external_link: e.target.value }))}
                          className={cn(
                            "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                            "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300"
                          )}
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-300 font-medium">Special Requirements</Label>
                      <Textarea
                        id="special_requirements"
                        placeholder="Any additional requirements, notes, or special instructions..."
                        value={formData.special_requirements || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, special_requirements: e.target.value }))}
                        rows={3}
                        className={cn(
                          "bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-400",
                          "focus:border-purple-500/50 focus:ring-purple-500/20 transition-all duration-300 resize-none"
                        )}
                      />
                    </div>

                    <div className="flex items-center space-x-3 p-4 bg-slate-900/30 border border-slate-700/50 rounded-lg">
                      <Checkbox
                        id="featured"
                        checked={formData.featured}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked as boolean }))}
                        className="data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                      />
                      <Label htmlFor="featured" className="flex items-center gap-2 text-slate-300 font-medium cursor-pointer">
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6, ease: "easeInOut" }}
                        >
                          <Star className="w-4 h-4 text-yellow-400" />
                        </motion.div>
                        Feature this job (premium placement)
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                variants={stepVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5 }}
                className="space-y-6"
              >
                <Card className={cn(
                  "bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-slate-900/60",
                  "border border-slate-700/30 backdrop-blur-xl",
                  "hover:border-slate-600/50 transition-all duration-300",
                  "hover:shadow-2xl hover:shadow-slate-900/50 relative overflow-hidden"
                )}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
                  
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-3">
                      <motion.div
                        className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg border border-white/10"
                        whileHover={{ 
                          rotate: 360,
                          transition: { duration: 0.6, ease: "easeInOut" }
                        }}
                      >
                        <CheckCircle className="w-5 h-5 text-white" />
                      </motion.div>
                      <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                        Review Your Job Posting
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-400">Job Title</Label>
                        <p className="text-white font-medium">{formData.title}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-400">Category</Label>
                        <p className="text-white font-medium">
                          {categories.find(c => c.id === formData.category_id)?.name || 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-400">Job Type</Label>
                        <p className="text-white font-medium">
                          {JOB_TYPE_OPTIONS.find(o => o.value === formData.job_type)?.label}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-400">Payment</Label>
                        <p className="text-white font-medium">
                          {formData.payment_type === 'paid' && formData.payment_amount
                            ? `$${formData.payment_amount}`
                            : PAYMENT_TYPE_OPTIONS.find(o => o.value === formData.payment_type)?.label}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-400">Description</Label>
                      <div className="bg-slate-900/30 border border-slate-700/50 rounded-lg p-3">
                        <p className="text-white whitespace-pre-wrap">{formData.description}</p>
                      </div>
                    </div>

                    {formData.required_genres && formData.required_genres.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-400">Required Genres</Label>
                        <div className="flex flex-wrap gap-2">
                          {(formData.required_genres || []).map((genre) => (
                            <Badge key={genre} variant="secondary" className="bg-purple-600/20 text-purple-300 border-purple-600/30">
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.required_skills && formData.required_skills.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-400">Required Skills</Label>
                        <div className="flex flex-wrap gap-2">
                          {(formData.required_skills || []).map((skill) => (
                            <Badge key={skill} variant="secondary" className="bg-blue-600/20 text-blue-300 border-blue-600/30">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-400">Before you post:</span>
                      </div>
                      <ul className="text-sm text-slate-300 space-y-1">
                        <li>• Make sure all information is accurate and complete</li>
                        <li>• Your job will be visible to all artists on the platform</li>
                        <li>• You'll receive notifications when artists apply</li>
                        <li>• You can edit or remove your job posting later</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <motion.div 
            className="flex justify-between pt-6 border-t border-slate-700/30"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.div
              whileHover={{ 
                scale: 1.05,
                transition: { type: "spring", stiffness: 400, damping: 17 }
              }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className={cn(
                  "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50",
                  "hover:border-slate-600/50 transition-all duration-300",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Previous
              </Button>
            </motion.div>
            
            <div className="flex gap-3">
              <motion.div
                whileHover={{ 
                  scale: 1.05,
                  transition: { type: "spring", stiffness: 400, damping: 17 }
                }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className={cn(
                    "bg-slate-800/50 border-slate-700/50 text-slate-300 hover:bg-slate-700/50",
                    "hover:border-slate-600/50 transition-all duration-300"
                  )}
                >
                  Cancel
                </Button>
              </motion.div>
              
              {currentStep < 4 ? (
                <motion.div
                  whileHover={{ 
                    scale: 1.05,
                    transition: { type: "spring", stiffness: 400, damping: 17 }
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="group"
                >
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed(currentStep)}
                    className={cn(
                      "bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600",
                      "hover:from-purple-700 hover:via-fuchsia-700 hover:to-pink-700",
                      "transition-all duration-300 text-white font-semibold",
                      "shadow-lg border border-purple-500/30 hover:border-purple-400/50",
                      "disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    Next
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ 
                    scale: 1.05,
                    transition: { type: "spring", stiffness: 400, damping: 17 }
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="group"
                >
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={cn(
                      "bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600",
                      "hover:from-green-700 hover:via-emerald-700 hover:to-teal-700",
                      "transition-all duration-300 text-white font-semibold",
                      "shadow-lg border border-green-500/30 hover:border-green-400/50",
                      "disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <AnimatePresence mode="wait">
                      {isSubmitting ? (
                        <motion.div
                          key="submitting"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2"
                        >
                          <motion.div
                            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          Posting...
                        </motion.div>
                      ) : (
                        <motion.div
                          key="post"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          Post Job
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 