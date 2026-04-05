"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

// Import the appropriate onboarding component based on type
import ArtistVenueOnboarding from "@/components/onboarding/artist-venue-onboarding"
import StaffOnboarding from "@/components/onboarding/staff-onboarding"
import InvitationOnboarding from "@/components/onboarding/invitation-onboarding"
import QuickSignupOnboarding from "@/components/onboarding/quick-signup-onboarding"
import SocialAccountSetup from "@/components/onboarding/social-account-setup"

interface OnboardingRouterProps {
  // Props will be determined by the specific onboarding type
}

export default function OnboardingRouter(props: OnboardingRouterProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [onboardingType, setOnboardingType] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    if (loading) return

    // Determine onboarding type from URL parameters
    const type = searchParams.get('type')
    const token = searchParams.get('token')
    const invitation = searchParams.get('invitation')
    const source = searchParams.get('source')
    const step = searchParams.get('step')

    if (source === 'social') {
      setOnboardingType('social-account-setup')
    } else if (token) {
      // Token-based onboarding (staff invitations)
      setOnboardingType('staff')
    } else if (invitation) {
      // Invitation-based onboarding
      setOnboardingType('invitation')
    } else if (type === 'artist' || type === 'venue') {
      // Direct artist/venue onboarding (for creating sub-accounts)
      setOnboardingType(type)
    } else {
      // Default to quick signup for new users
      setOnboardingType('quick-signup')
    }

    setIsInitializing(false)
  }, [loading, searchParams])

  // Show loading while determining onboarding type
  if (loading || isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-4" />
          <p className="text-white">Setting up your account...</p>
        </div>
      </div>
    )
  }

  // Redirect to dashboard if user is already authenticated and has completed onboarding
  if (user && !searchParams.get('force')) {
    // Check if user has a primary account setup
    // For now, redirect to dashboard - they can create sub-accounts from there
    router.push('/dashboard')
    return null
  }

  // Render the appropriate onboarding component
  switch (onboardingType) {
    case 'artist':
      return <ArtistVenueOnboarding accountType="artist" />
    
    case 'venue':
      return <ArtistVenueOnboarding accountType="venue" />
    
    case 'staff':
      return <StaffOnboarding />
    
    case 'invitation':
      return <InvitationOnboarding />

    case 'social-account-setup':
      return <SocialAccountSetup />
    
    case 'quick-signup':
    default:
      return <QuickSignupOnboarding />
  }
} 