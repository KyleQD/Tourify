"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Loader2,
  AlertCircle,
  CheckCircle,
  Mail,
  ArrowRight,
  Sparkles,
  Star,
  Zap,
  Users,
  Heart,
  Target,
  Award,
  Globe
} from "lucide-react"

interface QuickSignupData {
  email: string
  password: string
  fullName: string
  acceptTerms: boolean
}

export default function QuickSignupOnboarding() {
  const { signUp, user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<QuickSignupData>({
    email: '',
    password: '',
    fullName: '',
    acceptTerms: false
  })

  // Check if user is already authenticated
  useEffect(() => {
    if (user) {
      router.push('/dashboard?welcome=true')
    }
  }, [user, router])

  const steps = [
    { id: 1, title: 'Welcome', description: 'Join Tourify' },
    { id: 2, title: 'Account Setup', description: 'Create your account' },
    { id: 3, title: 'Success', description: 'You\'re all set!' }
  ]

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
    if (!formData.acceptTerms) {
      setError('Please accept the terms and conditions')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Sign up the user
      const result = await signUp(
        formData.email,
        formData.password,
        {
          full_name: formData.fullName
        }
      )

      if (result.error) {
        throw new Error(result.error.message)
      }

      // Move to success step
      setCurrentStep(3)
      
      toast({
        title: "Account created successfully!",
        description: result.needsEmailConfirmation
          ? "Please check your email to verify your account."
          : "You are signed in. Continue to set up your profile.",
      })
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = () => {
    router.push('/dashboard?welcome=true')
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
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -inset-1 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl blur opacity-30 animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent">
                    Join Tourify
                  </h1>
                  <p className="text-sm text-gray-400">Step {currentStep} of {steps.length}</p>
                </div>
              </div>
              
              {/* Progress */}
              <div className="flex items-center space-x-4">
                <div className="w-48">
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progressValue}%` }}
                    ></div>
                  </div>
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
                        <Star className="h-12 w-12 text-white" />
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-3xl blur opacity-30 animate-pulse"></div>
                    </div>
                  </div>
                  
                  <CardTitle className="text-4xl text-white mb-4">
                    Welcome to Tourify! 🎉
                  </CardTitle>
                  <CardDescription className="text-xl text-gray-300 leading-relaxed">
                    Join the future of music networking. Get started in seconds and unlock your creative potential.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-6 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-white mb-2">Connect</h3>
                      <p className="text-sm text-gray-400">Build meaningful relationships with artists, venues, and industry professionals</p>
                    </div>
                    
                    <div className="text-center p-6 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Target className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-white mb-2">Create</h3>
                      <p className="text-sm text-gray-400">Showcase your work with professional tools and reach new audiences</p>
                    </div>
                    
                    <div className="text-center p-6 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Award className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-white mb-2">Grow</h3>
                      <p className="text-sm text-gray-400">Track your progress and discover new opportunities for your career</p>
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

            {/* Step 2: Account Setup */}
            {currentStep === 2 && (
              <Card className="bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                <CardHeader className="text-center pb-6">
                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center">
                        <Zap className="h-8 w-8 text-white" />
                      </div>
                      <div className="absolute -inset-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl blur opacity-30 animate-pulse"></div>
                    </div>
                  </div>
                  
                  <CardTitle className="text-3xl text-white mb-2">
                    Create Your Account
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Quick setup - you can add more details later from your dashboard
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-white font-medium">
                        Full Name *
                      </Label>
                      <Input
                        id="fullName"
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-white font-medium">
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                        placeholder="Enter your email address"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-white font-medium">
                        Password *
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="bg-white/10 border-white/20 text-white placeholder-gray-400 backdrop-blur-sm focus:border-purple-500 focus:ring-purple-500/50"
                        placeholder="Create a strong password"
                        required
                        minLength={8}
                      />
                      <p className="text-xs text-gray-400">Must be at least 8 characters long</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="acceptTerms"
                        checked={formData.acceptTerms}
                        onChange={(e) => setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                        className="rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500/50"
                        required
                      />
                      <Label htmlFor="acceptTerms" className="text-sm text-gray-300">
                        I agree to the{" "}
                        <a href="/terms" className="text-purple-400 hover:text-purple-300 underline">
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="/privacy" className="text-purple-400 hover:text-purple-300 underline">
                          Privacy Policy
                        </a>
                      </Label>
                    </div>

                    <div className="flex gap-4 pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 border-white/20 text-gray-300 hover:bg-white/10"
                        onClick={handleBack}
                      >
                        Back
                      </Button>
                      
                      <Button
                        type="submit"
                        disabled={isSubmitting || !formData.fullName || !formData.email || !formData.password || !formData.acceptTerms}
                        className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Creating Account...
                          </div>
                        ) : (
                          <div className="flex items-center">
                            Create Account
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
                    Account Created! 🚀
                  </CardTitle>
                  <CardDescription className="text-xl text-gray-300 leading-relaxed max-w-md mx-auto">
                    Welcome to Tourify! Please check your email to verify your account and get started.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                          <Mail className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-white">Check Your Email</h3>
                      </div>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          Verify your email address
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          Access your dashboard
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          Create your first profile
                        </li>
                      </ul>
                    </div>
                    
                    <div className="p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                          <Globe className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-white">What's Next?</h3>
                      </div>
                      <ul className="space-y-2 text-sm text-gray-300">
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                          Create artist or venue profiles
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          Connect with other creators
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          Start building your network
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
