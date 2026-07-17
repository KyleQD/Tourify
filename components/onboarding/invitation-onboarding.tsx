"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { 
  Loader2,
  AlertCircle,
  CheckCircle,
  User,
  Briefcase,
  FileText,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react"

interface InvitationData {
  token: string
  position: string
  department: string
  venueId: string
  templateId?: string
}

interface OnboardingTemplate {
  id: string
  name: string
  fields: OnboardingField[]
}

interface OnboardingField {
  id: string
  type: string
  label: string
  placeholder?: string
  required: boolean
  description?: string
  options?: string[]
}

export default function InvitationOnboarding() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
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
    setIsLoading(true)
    try {
      const response = await fetch(`/api/onboarding/validate-invitation?token=${token}`)
      if (response.ok) {
        const data = await response.json()
        setTemplate(data.template)
        
        // Initialize form data
        const initialFormData: Record<string, any> = {}
        data.template.fields.forEach((field: OnboardingField) => {
          if (field.type === "multiselect") {
            initialFormData[field.id] = []
          } else if (field.type === "checkbox") {
            initialFormData[field.id] = false
          } else {
            initialFormData[field.id] = ""
          }
        })
        setFormData(initialFormData)
      } else {
        throw new Error("Invalid invitation")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate invitation. Please check your link.",
        variant: "destructive"
      })
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAccountCreation() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/onboarding/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitation_token: invitationData?.token,
          form_data: formData
        })
      })

      const data = await response.json()
      
      if (data.success) {
        if (data.needsEmailConfirmation) {
          toast({
            title: "Confirm your email",
            description: data.message || "We sent a confirmation link. Open it before signing in.",
          })
          const emailQuery = data.user?.email ? `&email=${encodeURIComponent(data.user.email)}` : ""
          router.push(`/login?tab=signin&message=account_created${emailQuery}`)
          return
        }

        setAccountCreated(true)
        setCompletedSteps(prev => new Set([...prev, currentStep]))
        toast({
          title: "Account Created!",
          description: "Your account has been created successfully.",
        })
        
        // Move to next step
        setCurrentStep(currentStep + 1)
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
    const value = formData[field.id]
    const error = errors[field.id]

    switch (field.type) {
      case "text":
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="text-white font-medium">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </Label>
            <Input
              id={field.id}
              value={value}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
              className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
              placeholder={field.placeholder}
              required={field.required}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {field.description && <p className="text-gray-400 text-sm">{field.description}</p>}
          </div>
        )

      case "password":
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="text-white font-medium">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </Label>
            <div className="relative">
              <Input
                id={field.id}
                type={showPassword ? "text" : "password"}
                value={value}
                onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50 pr-10"
                placeholder={field.placeholder}
                required={field.required}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {field.description && <p className="text-gray-400 text-sm">{field.description}</p>}
          </div>
        )

      case "textarea":
        return (
          <div className="space-y-2">
            <Label htmlFor={field.id} className="text-white font-medium">
              {field.label} {field.required && <span className="text-red-400">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={value}
              onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
              className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50 min-h-[100px]"
              placeholder={field.placeholder}
              required={field.required}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {field.description && <p className="text-gray-400 text-sm">{field.description}</p>}
          </div>
        )

      default:
        return null
    }
  }

  const steps = [
    { id: 1, title: "Account Setup", description: "Create your account" },
    { id: 2, title: "Profile Information", description: "Complete your profile" },
    { id: 3, title: "Success", description: "You're all set!" }
  ]

  const progressPercentage = (currentStep / steps.length) * 100

  if (isLoading && !template) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-white">Validating invitation...</p>
        </div>
      </div>
    )
  }

  if (!invitationData || !template) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl blur opacity-30 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                  Invitation Onboarding
                </h1>
                <p className="text-sm text-gray-400">Step {currentStep} of {steps.length}</p>
              </div>
            </div>
            
            {/* Progress */}
            <div className="flex items-center space-x-4">
              <div className="w-48">
                <Progress 
                  value={progressPercentage} 
                  className="h-2 bg-white/10"
                />
              </div>
              <span className="text-sm text-gray-400 font-medium">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          
          {/* Error Alert */}
          {Object.keys(errors).length > 0 && (
            <Alert className="mb-8 bg-red-500/20 border-red-500/50 backdrop-blur-sm">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <AlertDescription className="text-red-200">
                {Object.values(errors)[0]}
              </AlertDescription>
            </Alert>
          )}

          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-3xl text-white mb-2">
                {currentStep === 1 && "Create Your Account"}
                {currentStep === 2 && "Complete Your Profile"}
                {currentStep === 3 && "Welcome to the Team!"}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {currentStep === 1 && `You've been invited as ${invitationData.position} in ${invitationData.department}`}
                {currentStep === 2 && "Please provide the following information to complete your onboarding"}
                {currentStep === 3 && "Your account has been created successfully and you're ready to get started"}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {currentStep === 1 && (
                <form className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white font-medium">
                      Email Address <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                      placeholder="Enter your email address"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white font-medium">
                      Password <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50 pr-10"
                        placeholder="Create a strong password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 border-white/20 text-gray-300 hover:bg-white/10"
                      onClick={() => router.push('/')}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    
                    <Button
                      type="button"
                      disabled={isLoading || !formData.email || !formData.password}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
                      onClick={handleAccountCreation}
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating Account...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          Create Account
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {currentStep === 2 && (
                <form className="space-y-6">
                  {template.fields.map((field) => (
                    <div key={field.id}>
                      {renderField(field)}
                    </div>
                  ))}

                  <Separator className="bg-white/10" />

                  <div className="flex gap-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 border-white/20 text-gray-300 hover:bg-white/10"
                      onClick={handlePrevious}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    
                    <Button
                      type="button"
                      disabled={isLoading}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
                      onClick={handleSubmitOnboarding}
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Completing...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          Complete Onboarding
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              )}

              {currentStep === 3 && (
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="w-24 h-24 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center shadow-2xl">
                        <CheckCircle className="h-12 w-12 text-white" />
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-3xl blur opacity-30 animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Welcome to the Team! 🎉
                    </h3>
                    <p className="text-gray-400">
                      Your account has been created successfully and you're now part of the team.
                      You'll be redirected to your dashboard shortly.
                    </p>
                  </div>

                  <div className="pt-4">
                    <Button 
                      onClick={() => router.push('/dashboard')}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-8 py-3 text-lg"
                    >
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
