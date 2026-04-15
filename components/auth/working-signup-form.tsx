"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { 
  Eye, 
  EyeOff, 
  Mail, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle, 
  Music, 
  User, 
  Building, 
  Briefcase, 
  Users,
  Crown,
  Shield,
  Star,
  Truck,
  Calendar,
  DollarSign,
  MessageSquare,
  BarChart3,
  Globe,
  Lock,
  Smartphone,
  CheckCircle2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getAuthSignUpEmailRedirectTo } from '@/lib/auth/auth-email-redirect'

interface SignupFormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  username: string
  accountMode: 'creator' | 'professional'
  accountType: 'general' | 'artist' | 'venue' | 'industry' | 'tour_manager'
  organization?: string
  role?: string
  acceptTerms: boolean
  acceptMarketing: boolean
  enableMFA: boolean
}

interface SignupStep {
  id: number
  title: string
  description: string
}

export default function WorkingSignupForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [progress, setProgress] = useState(25)

  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    username: '',
    accountMode: 'creator',
    accountType: 'general',
    organization: '',
    role: '',
    acceptTerms: false,
    acceptMarketing: false,
    enableMFA: false
  })

  const steps: SignupStep[] = [
    {
      id: 1,
      title: 'Basic Information',
      description: 'Enter your personal details'
    },
    {
      id: 2,
      title: 'Account Type',
      description: 'Choose your account type'
    },
    {
      id: 3,
      title: 'Security',
      description: 'Set up your password and security'
    },
    {
      id: 4,
      title: 'Terms & Conditions',
      description: 'Review and accept terms'
    }
  ]

  useEffect(() => {
    setProgress((currentStep / steps.length) * 100)
  }, [currentStep, steps.length])

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.fullName.trim() && formData.username.trim() && formData.email.trim())
      case 2:
        return !!(formData.accountType && formData.accountMode)
      case 3:
        return !!(formData.password && formData.confirmPassword && formData.password === formData.confirmPassword && formData.password.length >= 6)
      case 4:
        return formData.acceptTerms
      default:
        return false
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length))
      setError(null)
    } else {
      setError('Please complete all required fields')
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError(null)
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      setError('Please accept the terms and conditions')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Step 1: Create user account (without trigger)
      console.log('Creating user account...')
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: getAuthSignUpEmailRedirectTo(),
          data: {
            full_name: formData.fullName,
            username: formData.username,
            account_type: formData.accountType,
            organization: formData.organization,
            role: formData.role,
            enable_mfa: formData.enableMFA
          }
        }
      })

      if (error) {
        console.error('User creation failed:', error)
        setError(error.message || 'Failed to create account')
        return
      }

      if (!data.user) {
        setError('Failed to create user account')
        return
      }

      console.log('User account created successfully:', data.user.id)

      // Profile, user_active_profiles, and onboarding rows are created by the
      // database trigger `on_auth_user_created` (see supabase migrations).

      const needsEmailConfirmation = Boolean(data.user) && !data.session

      // TOS / agreements require an authenticated session (RLS + API use cookies)
      if (formData.acceptTerms && data.session) {
        const now = new Date().toISOString()
        const { error: tosError } = await supabase
          .from('profiles')
          .update({ tos_accepted_at: now, tos_version: 1, privacy_accepted_at: now })
          .eq('id', data.user.id)
        if (tosError) console.error('TOS profile update failed:', tosError)

        try {
          await fetch('/api/agreements/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              template_id: 'a0000000-0000-0000-0000-000000000001',
              template_version: 1,
              context: 'signup',
              signature_method: 'clickwrap',
              metadata: { account_type: formData.accountType, email: formData.email }
            })
          })
        } catch {
          // Non-blocking
        }
      }

      if (needsEmailConfirmation) {
        setSuccess('Account created successfully! Please check your email to confirm your account.')
        // Store signup data for onboarding
        localStorage.setItem('signup_data', JSON.stringify({
          email: formData.email,
          account_type: formData.accountType,
          account_mode: formData.accountMode
        }))
        
        // Redirect to login page
        setTimeout(() => {
          router.push(`/login?message=account_created&email=${encodeURIComponent(formData.email)}`)
        }, 2000)
      } else {
        setSuccess('Account created successfully! Redirecting to dashboard...')
        // User is already signed in, redirect to dashboard
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }

    } catch (error) {
      console.error('Signup error:', error)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const getAccountTypes = () => [
    {
      type: 'general',
      title: 'General User',
      description: 'Join the community and discover events',
      icon: User,
      features: ['Browse events', 'Connect with others', 'Save favorites']
    },
    {
      type: 'artist',
      title: 'Artist/Performer',
      description: 'Showcase your talent and find opportunities',
      icon: Music,
      features: ['Create artist profile', 'Upload music', 'Find gigs', 'Manage bookings']
    },
    {
      type: 'venue',
      title: 'Venue/Event Space',
      description: 'Host events and manage your space',
      icon: Building,
      features: ['List your venue', 'Manage bookings', 'Promote events', 'Analytics']
    },
    {
      type: 'industry',
      title: 'Industry Professional',
      description: 'Connect with artists and venues',
      icon: Briefcase,
      features: ['Network with professionals', 'Find talent', 'Manage projects']
    },
    {
      type: 'tour_manager',
      title: 'Tour Manager',
      description: 'Organize and manage tours',
      icon: Truck,
      features: ['Plan tours', 'Manage logistics', 'Coordinate venues', 'Track expenses']
    }
  ]

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="username">Username *</Label>
          <Input
            id="username"
            type="text"
            placeholder="Choose a unique username"
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            className="mt-1"
          />
        </div>
        
        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-medium">Account Mode</Label>
        <RadioGroup
          value={formData.accountMode}
          onValueChange={(value: 'creator' | 'professional') => 
            setFormData(prev => ({ ...prev, accountMode: value }))
          }
          className="mt-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="creator" id="creator" />
            <Label htmlFor="creator" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Creator (Artist, Performer, Content Creator)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="professional" id="professional" />
            <Label htmlFor="professional" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Professional (Venue, Manager, Industry)
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div>
        <Label className="text-base font-medium">Account Type</Label>
        <div className="mt-3 grid gap-3">
          {getAccountTypes().map((accountType) => (
            <div
              key={accountType.type}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                formData.accountType === accountType.type
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => setFormData(prev => ({ ...prev, accountType: accountType.type as any }))}
            >
              <div className="flex items-start gap-3">
                <accountType.icon className="h-5 w-5 mt-0.5 text-primary" />
                <div className="flex-1">
                  <h3 className="font-medium">{accountType.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{accountType.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {accountType.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
                {formData.accountType === accountType.type && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(formData.accountType === 'industry' || formData.accountType === 'tour_manager') && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="organization">Organization</Label>
            <Input
              id="organization"
              type="text"
              placeholder="Enter your organization name"
              value={formData.organization}
              onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              type="text"
              placeholder="Enter your role/title"
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="mt-1"
            />
          </div>
        </div>
      )}
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="password">Password *</Label>
        <div className="relative mt-1">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a strong password"
            value={formData.password}
            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
            className="pr-10"
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
        <p className="text-xs text-muted-foreground mt-1">
          Must be at least 6 characters long
        </p>
      </div>

      <div>
        <Label htmlFor="confirmPassword">Confirm Password *</Label>
        <div className="relative mt-1">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            className="pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
          <p className="text-xs text-destructive mt-1">Passwords do not match</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="enableMFA"
            checked={formData.enableMFA}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, enableMFA: checked as boolean }))
            }
          />
          <Label htmlFor="enableMFA" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Enable Two-Factor Authentication (Recommended)
          </Label>
        </div>
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start space-x-2">
          <Checkbox
            id="acceptTerms"
            checked={formData.acceptTerms}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, acceptTerms: checked as boolean }))
            }
            className="mt-1"
          />
          <Label htmlFor="acceptTerms" className="text-sm leading-relaxed">
            I agree to the{' '}
            <a href="/terms" className="text-primary hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </a>
            *
          </Label>
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="acceptMarketing"
            checked={formData.acceptMarketing}
            onCheckedChange={(checked) => 
              setFormData(prev => ({ ...prev, acceptMarketing: checked as boolean }))
            }
            className="mt-1"
          />
          <Label htmlFor="acceptMarketing" className="text-sm leading-relaxed">
            I would like to receive updates about new features and events (optional)
          </Label>
        </div>
      </div>

      <div className="bg-muted/50 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Account Summary</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Name:</span>
            <span className="font-medium">{formData.fullName}</span>
          </div>
          <div className="flex justify-between">
            <span>Email:</span>
            <span className="font-medium">{formData.email}</span>
          </div>
          <div className="flex justify-between">
            <span>Account Type:</span>
            <span className="font-medium">{getAccountTypes().find(t => t.type === formData.accountType)?.title}</span>
          </div>
          <div className="flex justify-between">
            <span>Username:</span>
            <span className="font-medium">@{formData.username}</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        return renderStep3()
      case 4:
        return renderStep4()
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Music className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Join Tourify
          </CardTitle>
          <CardDescription className="text-gray-600">
            Create your account and start your journey
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Step {currentStep} of {steps.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-sm font-medium text-gray-900">
              {steps[currentStep - 1].title}
            </p>
            <p className="text-sm text-gray-600">
              {steps[currentStep - 1].description}
            </p>
          </div>

          <Separator />

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Form Content */}
          {renderCurrentStep()}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1 || isLoading}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            {currentStep < steps.length ? (
              <Button
                onClick={nextStep}
                disabled={!validateStep(currentStep) || isLoading}
                className="flex items-center gap-2"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!validateStep(currentStep) || isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Sign In Link */}
          <div className="text-center pt-4">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
