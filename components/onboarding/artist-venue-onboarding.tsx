"use client"

import { useCallback, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useMultiAccount } from "@/hooks/use-multi-account"
import type {
  OnboardingFlow,
  OnboardingTemplate,
} from "@/lib/services/unified-onboarding.service"
import {
  fallbackPersonaTemplate,
  initializePersonaResponses,
  personaAccountPayload,
  validatePersonaResponses,
} from "@/lib/onboarding/persona-onboarding"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { 
  Music, 
  Building, 
  User, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  Star,
  Zap,
  Globe,
  Users,
  Heart,
  MapPin,
  Calendar,
  Target,
  Award,
  Plus
} from "lucide-react"

interface ArtistVenueOnboardingProps {
  accountType: 'artist' | 'venue'
}

const steps = [
  { id: 1, title: 'Welcome', description: 'Create your profile' },
  { id: 2, title: 'Profile Setup', description: 'Complete your profile' },
  { id: 3, title: 'Success', description: 'Profile created!' }
]

export default function ArtistVenueOnboarding({ accountType }: ArtistVenueOnboardingProps) {
  const { user } = useAuth()
  const userId = user?.id
  const { createArtistAccount, createVenueAccount } = useMultiAccount()
  const router = useRouter()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingFlow, setIsLoadingFlow] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [template, setTemplate] = useState<OnboardingTemplate | null>(null)
  const [flowId, setFlowId] = useState<string | null>(null)
  const [createdAccountId, setCreatedAccountId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!userId) {
      router.replace(`/login?redirect=${encodeURIComponent(`/onboarding?type=${accountType}`)}`)
      return
    }

    const controller = new AbortController()

    const loadFlow = async () => {
      setIsLoadingFlow(true)
      setError(null)
      try {
        const response = await fetch(
          `/api/onboarding/unified?flow_type=${accountType}`,
          { signal: controller.signal },
        )
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Unable to load onboarding")

        const resolvedTemplate =
          (result.data?.template as OnboardingTemplate | null) ||
          fallbackPersonaTemplate(accountType)
        let flow = result.data?.flow as OnboardingFlow | null

        if (!flow) {
          const createResponse = await fetch("/api/onboarding/unified", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              action: "get_or_create_flow",
              flow_type: accountType,
              template_id: result.data?.template?.id,
              metadata: { current_step: 1 },
            }),
          })
          const createResult = await createResponse.json()
          if (!createResponse.ok) {
            throw new Error(createResult.error || "Unable to start onboarding")
          }
          flow = createResult.data as OnboardingFlow
        }

        setTemplate(resolvedTemplate)
        setFlowId(flow.id)
        setFormData(
          initializePersonaResponses(resolvedTemplate, flow.responses || {}),
        )
        setCreatedAccountId(
          typeof flow.metadata?.created_account_id === "string"
            ? flow.metadata.created_account_id
            : null,
        )
        const savedStep = Number(flow.metadata?.current_step)
        setCurrentStep(
          flow.status === "completed"
            ? 3
            : savedStep === 2
              ? 2
              : 1,
        )
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load onboarding",
          )
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingFlow(false)
      }
    }

    void loadFlow()
    return () => controller.abort()
  }, [userId, accountType, router, reloadKey])

  const saveFlow = useCallback(
    async (
      responses: Record<string, unknown>,
      step: number,
      accountId = createdAccountId,
    ) => {
      if (!flowId) throw new Error("Onboarding session is unavailable")
      const response = await fetch("/api/onboarding/unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_flow",
          id: flowId,
          status: "in_progress",
          responses,
          metadata: {
            current_step: step,
            ...(accountId ? { created_account_id: accountId } : {}),
          },
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Unable to save progress")
      return result.data as OnboardingFlow
    },
    [createdAccountId, flowId],
  )

  useEffect(() => {
    if (isLoadingFlow || isSubmitting || !flowId || currentStep === 3) return

    setSaveState("saving")
    const timeout = window.setTimeout(() => {
      void saveFlow(formData, currentStep)
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("error"))
    }, 700)

    return () => window.clearTimeout(timeout)
    // createdAccountId is deliberately included so its recovery marker is persisted.
  }, [formData, currentStep, flowId, isLoadingFlow, isSubmitting, saveFlow])

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!template || !flowId || !user) return

    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    try {
      const validationErrors = validatePersonaResponses(template, formData)
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors)
        throw new Error("Complete the required fields before creating your profile")
      }

      await saveFlow(formData, 2)
      let accountId = createdAccountId

      if (!accountId) {
        if (accountType === "artist") {
          const payload = personaAccountPayload("artist", formData)
          accountId = await createArtistAccount(payload)
        } else {
          const payload = personaAccountPayload("venue", formData)
          accountId = await createVenueAccount(payload)
        }
        setCreatedAccountId(accountId)
        await saveFlow(formData, 2, accountId)
      }

      const completeResponse = await fetch("/api/onboarding/unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete_flow",
          id: flowId,
          responses: formData,
        }),
      })
      const completeResult = await completeResponse.json()
      if (!completeResponse.ok) {
        throw new Error(
          completeResult.error ||
            "Your profile was created, but onboarding could not be finalized. Retry to continue safely.",
        )
      }

      setCurrentStep(3)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = () => {
    router.push('/dashboard?profile_created=true')
  }

  if (!user) {
    return null
  }

  if (isLoadingFlow) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center" role="status">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" aria-hidden="true" />
          <p>Restoring your onboarding progress…</p>
        </div>
      </div>
    )
  }

  const progressValue = (currentStep / steps.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center bg-repeat opacity-5"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                    {accountType === 'artist' ? (
                      <Music className="h-6 w-6 text-white" />
                    ) : (
                      <Building className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl blur opacity-30 animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                    Create {accountType === 'artist' ? 'Artist' : 'Venue'} Profile
                  </h1>
                  <p className="text-sm text-gray-400">Step {currentStep} of {steps.length}</p>
                </div>
              </div>
              
              {/* Progress */}
              <div className="flex items-center space-x-4">
                <div className="w-48">
                  <Progress 
                    value={progressValue} 
                    className="h-2 bg-white/10"
                  />
                </div>
                <span className="text-sm text-gray-400 font-medium">
                  {Math.round(progressValue)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto">
            
            {/* Error Alert */}
            {error && (
              <Alert className="mb-8 bg-red-500/20 border-red-500/50 backdrop-blur-sm">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <AlertDescription className="text-red-200">
                  {error}
                  {!flowId && (
                    <Button
                      type="button"
                      variant="link"
                      className="ml-2 h-auto p-0 text-red-100 underline"
                      onClick={() => setReloadKey((value) => value + 1)}
                    >
                      Retry
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-3xl flex items-center justify-center shadow-2xl">
                        {accountType === 'artist' ? (
                          <Music className="h-12 w-12 text-white" />
                        ) : (
                          <Building className="h-12 w-12 text-white" />
                        )}
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-3xl blur opacity-30 animate-pulse"></div>
                    </div>
                  </div>
                  
                  <CardTitle className="text-4xl text-white mb-4">
                    Create Your {accountType === 'artist' ? 'Artist' : 'Venue'} Profile! 🎉
                  </CardTitle>
                  <CardDescription className="text-xl text-gray-300 leading-relaxed">
                    {accountType === 'artist' 
                      ? 'Showcase your music and connect with fans, venues, and industry professionals.'
                      : 'List your venue and connect with artists, promoters, and event organizers.'
                    }
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Plus className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-white mb-2">Create Profile</h3>
                      <p className="text-sm text-gray-400">
                        {accountType === 'artist' 
                          ? 'Build your artist profile with music, bio, and social links'
                          : 'Set up your venue profile with details and amenities'
                        }
                      </p>
                    </div>
                    
                    <div className="text-center p-6 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-white mb-2">Connect</h3>
                      <p className="text-sm text-gray-400">
                        {accountType === 'artist' 
                          ? 'Connect with venues, promoters, and other artists'
                          : 'Connect with artists, promoters, and event organizers'
                        }
                      </p>
                    </div>
                    
                    <div className="text-center p-6 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-white mb-2">Grow</h3>
                      <p className="text-sm text-gray-400">
                        {accountType === 'artist' 
                          ? 'Book gigs, grow your audience, and advance your career'
                          : 'Host events, attract talent, and grow your business'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-center pt-4">
                    <Button 
                      onClick={handleNext}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold px-8 py-3 text-lg"
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Profile Setup */}
            {currentStep === 2 && template && (
              <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                <CardHeader className="text-center pb-6">
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center">
                        {accountType === 'artist' ? (
                          <Music className="h-8 w-8 text-white" />
                        ) : (
                          <Building className="h-8 w-8 text-white" />
                        )}
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl blur opacity-30 animate-pulse"></div>
                    </div>
                  </div>
                  
                  <CardTitle className="text-3xl text-white mb-2">
                    {template.name}
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    {template.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <form className="space-y-6">
                    {template.fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={field.id} className="text-white font-medium">
                          {field.label} {field.required && <span className="text-red-400">*</span>}
                        </Label>
                        
                        {field.type === 'text' && (
                          <Input
                            id={field.id}
                            value={formData[field.id] || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                            placeholder={field.placeholder}
                            required={field.required}
                          />
                        )}
                        
                        {field.type === 'textarea' && (
                          <Textarea
                            id={field.id}
                            value={formData[field.id] || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                            className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50 min-h-[100px]"
                            placeholder={field.placeholder}
                            required={field.required}
                          />
                        )}
                        
                        {field.type === 'number' && (
                          <Input
                            id={field.id}
                            type="number"
                            value={formData[field.id] || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: parseInt(e.target.value) || 0 }))}
                            className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                            placeholder={field.placeholder}
                            required={field.required}
                          />
                        )}
                        
                        {field.type === 'multiselect' && field.options && (
                          <div className="grid grid-cols-2 gap-2">
                            {field.options.map((option) => (
                              <label key={option} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={(formData[field.id] || []).includes(option)}
                                  onChange={(e) => {
                                    const currentValues = formData[field.id] || []
                                    const newValues = e.target.checked
                                      ? [...currentValues, option]
                                      : currentValues.filter((v: string) => v !== option)
                                    setFormData(prev => ({ ...prev, [field.id]: newValues }))
                                  }}
                                  className="rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500/50"
                                />
                                <span className="text-white text-sm">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                        
                        {field.description && (
                          <p className="text-gray-400 text-sm">{field.description}</p>
                        )}
                        {fieldErrors[field.id] && (
                          <p className="text-sm text-red-300" role="alert">
                            {fieldErrors[field.id]}
                          </p>
                        )}
                      </div>
                    ))}

                    <p
                      className="text-sm text-gray-300"
                      role="status"
                      aria-live="polite"
                    >
                      {saveState === "saving" && "Saving your progress…"}
                      {saveState === "saved" && "Progress saved"}
                      {saveState === "error" &&
                        "Progress could not be saved. Keep this page open and retry."}
                    </p>

                    <div className="flex gap-4 pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-white/20 text-gray-300 hover:bg-white/10"
                        onClick={handleBack}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                      
                      <Button
                        type="button"
                        disabled={isSubmitting}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
                        onClick={handleSubmit}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Creating Profile...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            Create Profile
                            <Sparkles className="ml-2 h-4 w-4" />
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Success */}
            {currentStep === 3 && (
              <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-24 h-24 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center shadow-2xl">
                        <CheckCircle className="h-12 w-12 text-white" />
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 rounded-3xl blur opacity-30 animate-pulse"></div>
                    </div>
                  </div>
                  
                  <CardTitle className="text-4xl text-white mb-4">
                    Profile Created! 🚀
                  </CardTitle>
                  <CardDescription className="text-xl text-gray-300 leading-relaxed max-w-md mx-auto">
                    Your {accountType} profile has been created successfully! You can now start connecting with the community.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                          <Heart className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-white">Next Steps</h3>
                      </div>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          Explore your dashboard
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          Connect with other users
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          Start building your network
                        </li>
                      </ul>
                    </div>
                    
                    <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                          <Zap className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-white">Pro Tips</h3>
                      </div>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          Complete your profile for better visibility
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          Join communities that match your interests
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          Use analytics to track your growth
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="text-center pt-4">
                    <Button 
                      onClick={handleComplete}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-8 py-3 text-lg"
                    >
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
