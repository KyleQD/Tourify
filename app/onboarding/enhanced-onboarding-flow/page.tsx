"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { NeoDateInput } from "@/components/ui/neo-date-input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { 
  CheckCircle, Clock, Star, Award, Zap, BrainCircuit, Users, 
  Briefcase, Calendar, MapPin, Phone, Mail, Globe, Shield,
  FileText, Upload, Download, Eye, EyeOff, AlertCircle,
  Info, HelpCircle, ArrowRight, ArrowLeft, Save, Send,
  UserCheck, Building, Crown, Target, Activity, TrendingUp
} from "lucide-react"

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
  defaultValue?: any
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
}

interface InvitationData {
  token: string
  position: string
  department: string
  venueId: string
  templateId?: string
}

export default function EnhancedOnboardingFlow() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [template, setTemplate] = useState<OnboardingTemplate | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [showPassword, setShowPassword] = useState(false)
  const [accountCreated, setAccountCreated] = useState(false)

  // Extract invitation data from URL
  useEffect(() => {
    const token = searchParams.get('token')
    const position = searchParams.get('position')
    const department = searchParams.get('department')
    const venueId = searchParams.get('venue')
    const templateId = searchParams.get('template')

    if (token && position && department && venueId) {
      setInvitationData({
        token,
        position,
        department,
        venueId,
        templateId: templateId || undefined
      })
      
      // Validate invitation and fetch template
      validateInvitation(token)
    } else {
      toast({
        title: "Invalid Invitation",
        description: "This invitation link is invalid or has expired.",
        variant: "destructive"
      })
      router.push('/')
    }
  }, [searchParams, router, toast])

  async function validateInvitation(token: string) {
    try {
      const response = await fetch(`/api/admin/onboarding/enhanced-invite?action=validate_token&token=${token}`)
      const data = await response.json()
      
      if (data.success) {
        // Fetch onboarding template
        if (data.data.invitation.template_id) {
          await fetchTemplate(data.data.invitation.template_id)
        } else {
          // Use default template based on position
          await fetchDefaultTemplate()
        }
      } else {
        toast({
          title: "Invalid Invitation",
          description: data.error || "This invitation is no longer valid.",
          variant: "destructive"
        })
        router.push('/')
      }
    } catch (error) {
      console.error('Error validating invitation:', error)
      toast({
        title: "Error",
        description: "Failed to validate invitation. Please try again.",
        variant: "destructive"
      })
    }
  }

  async function fetchTemplate(templateId: string) {
    try {
      const response = await fetch(`/api/admin/onboarding/templates/${templateId}`)
      const data = await response.json()
      
      if (data.success) {
        setTemplate(data.data)
        initializeFormData(data.data.fields)
      }
    } catch (error) {
      console.error('Error fetching template:', error)
    }
  }

  async function fetchDefaultTemplate() {
    // Create a default template based on position
    const defaultTemplate: OnboardingTemplate = {
      id: 'default',
      name: 'Default Onboarding',
      description: 'Standard onboarding process',
      department: invitationData?.department || '',
      position: invitationData?.position || '',
      employmentType: 'full_time',
      fields: getDefaultFields(),
      estimatedDays: 7,
      requiredDocuments: ['Government ID', 'Emergency Contact']
    }
    
    setTemplate(defaultTemplate)
    initializeFormData(defaultTemplate.fields)
  }

  function getDefaultFields(): OnboardingField[] {
    return [
      {
        id: "full_name",
        type: "text",
        label: "Full Name",
        required: true,
        order: 1,
        section: "Personal Information"
      },
      {
        id: "email",
        type: "email",
        label: "Email Address",
        required: true,
        order: 2,
        section: "Personal Information"
      },
      {
        id: "phone",
        type: "phone",
        label: "Phone Number",
        required: true,
        order: 3,
        section: "Personal Information"
      },
      {
        id: "address",
        type: "address",
        label: "Home Address",
        required: true,
        order: 4,
        section: "Personal Information"
      },
      {
        id: "emergency_contact",
        type: "emergency_contact",
        label: "Emergency Contact",
        required: true,
        order: 5,
        section: "Emergency Contact"
      },
      {
        id: "availability",
        type: "textarea",
        label: "Availability Schedule",
        required: true,
        order: 6,
        section: "Employment Information"
      }
    ]
  }

  function initializeFormData(fields: OnboardingField[]) {
    const initialData: Record<string, any> = {}
    fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        initialData[field.id] = field.defaultValue
      }
    })
    setFormData(initialData)
  }

  const totalSteps = template ? Math.ceil(template.fields.length / 3) + 2 : 5 // +2 for account creation and completion
  const progress = (currentStep / totalSteps) * 100

  const currentFields = template?.fields.filter(field => {
    const fieldStep = Math.ceil(field.order / 3)
    return fieldStep === currentStep - 1 // -1 because step 1 is account creation
  }) || []

  function validateField(field: OnboardingField, value: any): string | null {
    if (field.required && (!value || value === '')) {
      return `${field.label} is required`
    }

    if (value && field.validation) {
      if (field.validation.min && typeof value === 'number' && value < field.validation.min) {
        return `${field.label} must be at least ${field.validation.min}`
      }
      if (field.validation.max && typeof value === 'number' && value > field.validation.max) {
        return `${field.label} must be at most ${field.validation.max}`
      }
      if (field.validation.pattern && typeof value === 'string') {
        const regex = new RegExp(field.validation.pattern)
        if (!regex.test(value)) {
          return `${field.label} format is invalid`
        }
      }
    }

    return null
  }

  function validateCurrentStep(): boolean {
    const newErrors: Record<string, string> = {}
    let isValid = true

    currentFields.forEach(field => {
      const error = validateField(field, formData[field.id])
      if (error) {
        newErrors[field.id] = error
        isValid = false
      }
    })

    setErrors(newErrors)
    return isValid
  }

  async function handleNext() {
    if (currentStep === 1) {
      // Account creation step
      await handleAccountCreation()
    } else if (currentStep === totalSteps) {
      // Final step - submit onboarding
      await handleSubmitOnboarding()
    } else {
      // Validate current step
      if (validateCurrentStep()) {
        setCompletedSteps(prev => new Set([...prev, currentStep]))
        setCurrentStep(currentStep + 1)
        setErrors({})
      }
    }
  }

  async function handleAccountCreation() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          invitation_token: invitationData?.token
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setAccountCreated(true)
        setCompletedSteps(prev => new Set([...prev, currentStep]))
        setCurrentStep(currentStep + 1)
        toast({
          title: "Account Created",
          description: "Your account has been created successfully!",
        })
      } else {
        setErrors({ account: data.error })
      }
    } catch (error) {
      setErrors({ account: "Failed to create account. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmitOnboarding() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitation_token: invitationData?.token,
          responses: formData,
          template_id: template?.id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setCompletedSteps(prev => new Set([...prev, currentStep]))
        toast({
          title: "Onboarding Complete!",
          description: "Welcome to the team! Your onboarding has been completed successfully.",
        })
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        setErrors({ submit: data.error })
      }
    } catch (error) {
      setErrors({ submit: "Failed to submit onboarding. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  function handlePrevious() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setErrors({})
    }
  }

  function renderField(field: OnboardingField) {
    const value = formData[field.id] || ''
    const error = errors[field.id]

    const commonProps = {
      id: field.id,
      value: value,
      onChange: (e: any) => setFormData(prev => ({ ...prev, [field.id]: e.target.value })),
      className: `bg-slate-800 border-slate-700 text-white ${error ? 'border-red-500' : ''}`,
      placeholder: field.placeholder
    }

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-white">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              {...commonProps}
              type={field.type === 'phone' ? 'tel' : field.type}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.helpText && <p className="text-sm text-slate-400">{field.helpText}</p>}
          </div>
        )

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-white">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              {...commonProps}
              rows={4}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.helpText && <p className="text-sm text-slate-400">{field.helpText}</p>}
          </div>
        )

      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-white">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(val) => setFormData(prev => ({ ...prev, [field.id]: val }))}
            >
              <SelectTrigger className={`bg-slate-800 border-slate-700 text-white ${error ? 'border-red-500' : ''}`}>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option} className="text-white">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.helpText && <p className="text-sm text-slate-400">{field.helpText}</p>}
          </div>
        )

      case 'multiselect':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-white">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.id}-${option}`}
                    checked={value.includes?.(option) || false}
                    onCheckedChange={(checked) => {
                      const currentValues = value || []
                      const newValues = checked
                        ? [...currentValues, option]
                        : currentValues.filter((v: string) => v !== option)
                      setFormData(prev => ({ ...prev, [field.id]: newValues }))
                    }}
                  />
                  <Label htmlFor={`${field.id}-${option}`} className="text-white text-sm">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.helpText && <p className="text-sm text-slate-400">{field.helpText}</p>}
          </div>
        )

      case 'checkbox':
        return (
          <div key={field.id} className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value || false}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, [field.id]: checked }))}
            />
            <Label htmlFor={field.id} className="text-white">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.helpText && <p className="text-sm text-slate-400">{field.helpText}</p>}
          </div>
        )

      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-white">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input
              {...commonProps}
              type="number"
              min={field.validation?.min}
              max={field.validation?.max}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.helpText && <p className="text-sm text-slate-400">{field.helpText}</p>}
          </div>
        )

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-white">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <NeoDateInput
              {...commonProps}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.helpText && <p className="text-sm text-slate-400">{field.helpText}</p>}
          </div>
        )

      default:
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id} className="text-white">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </Label>
            <Input {...commonProps} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.helpText && <p className="text-sm text-slate-400">{field.helpText}</p>}
          </div>
        )
    }
  }

  if (!invitationData || !template) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading onboarding...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Welcome to the Team!</h1>
              <p className="text-slate-400 mt-1">
                Complete your onboarding to join as {invitationData.position} in {invitationData.department}
              </p>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                {template.estimatedDays} days estimated
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Step 1: Account Creation */}
            {currentStep === 1 && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <UserCheck className="h-5 w-5 mr-2 text-purple-400" />
                    Create Your Account
                  </CardTitle>
                  <p className="text-slate-400">
                    Set up your account to get started with the onboarding process.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-white">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="full_name"
                        value={formData.full_name || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white">
                        Email Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="bg-slate-700 border-slate-600 text-white pr-10"
                        placeholder="Create a strong password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-sm text-slate-400">
                      Password must be at least 8 characters long
                    </p>
                  </div>
                  {errors.account && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-red-400 text-sm">{errors.account}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Onboarding Fields */}
            {currentStep > 1 && currentStep < totalSteps && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-purple-400" />
                    {currentFields[0]?.section || 'Additional Information'}
                  </CardTitle>
                  <p className="text-slate-400">
                    Please provide the following information to complete your onboarding.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {currentFields.map(renderField)}
                </CardContent>
              </Card>
            )}

            {/* Final Step: Review and Submit */}
            {currentStep === totalSteps && (
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                    Review and Complete
                  </CardTitle>
                  <p className="text-slate-400">
                    Review your information and complete your onboarding.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-white mb-3">Personal Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Name:</span>
                          <span className="text-white">{formData.full_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Email:</span>
                          <span className="text-white">{formData.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Phone:</span>
                          <span className="text-white">{formData.phone || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-white mb-3">Position Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Position:</span>
                          <span className="text-white">{invitationData.position}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Department:</span>
                          <span className="text-white">{invitationData.department}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Employment Type:</span>
                          <span className="text-white capitalize">{template.employmentType.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-700" />

                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="font-medium text-white mb-3 flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-blue-400" />
                      Required Documents
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {template.requiredDocuments.map((doc, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-slate-300">{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {errors.submit && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-red-400 text-sm">{errors.submit}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || isLoading}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex space-x-2">
            {currentStep < totalSteps && (
              <Button
                onClick={handleNext}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            )}

            {currentStep === totalSteps && (
              <Button
                onClick={handleNext}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Completing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Onboarding
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 