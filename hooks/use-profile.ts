"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { Profile, ArtistProfile, VenueProfile, ProfileType, OnboardingState, ProfileData } from "@/types/profile"

interface UseProfileReturn {
  session: Session | null
  user: User | null
  loading: boolean
  error: Error | null
  profileData: ProfileData
  onboardingState: OnboardingState | null
  activeProfileType: ProfileType
  switchProfile: (type: ProfileType) => Promise<void>
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

export function useProfile(): UseProfileReturn {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [profileData, setProfileData] = useState<ProfileData>({
    profile: null,
    artistProfile: null,
    venueProfile: null
  })
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null)
  const [activeProfileType, setActiveProfileType] = useState<ProfileType>('general')

  // Load initial session and subscribe to auth changes
  useEffect(() => {
    async function getInitialSession() {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        setSession(initialSession)
        if (initialSession) await loadProfileData(initialSession.user.id)
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to get initial session'))
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession)
      if (newSession) {
        await loadProfileData(newSession.user.id)
      } else {
        setProfileData({ profile: null, artistProfile: null, venueProfile: null })
        setOnboardingState(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load profile data and onboarding state
  async function loadProfileData(userId: string) {
    try {
      setLoading(true)
      
      // Use maybeSingle() so a missing row (PGRST116) returns null instead of throwing.
      // The signup trigger creates this row automatically, but it may be absent for
      // users who signed up before the trigger was deployed or if the trigger failed.
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (profileError)
        console.warn('[useProfile] profiles query error:', profileError.message)

      const { data: artistProfile } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      const { data: venueProfile } = await supabase
        .from('venue_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      const { data: onboarding, error: onboardingError } = await supabase
        .from('onboarding')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (onboardingError)
        console.warn('[useProfile] onboarding row unavailable:', onboardingError.message)

      setProfileData({
        profile: profile ?? null,
        artistProfile: artistProfile ?? null,
        venueProfile: venueProfile ?? null
      })
      setOnboardingState(onboarding ?? null)
      setActiveProfileType((onboarding?.active_profile_type as ProfileType) ?? 'general')

    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load profile data'))
    } finally {
      setLoading(false)
    }
  }

  // Switch active profile type
  async function switchProfile(type: ProfileType) {
    if (!session?.user) return

    try {
      setLoading(true)
      const { error } = await supabase
        .from('onboarding')
        .update({ active_profile_type: type })
        .eq('user_id', session.user.id)

      if (error) throw error

      setActiveProfileType(type)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to switch profile'))
    } finally {
      setLoading(false)
    }
  }

  // Refresh profile data
  async function refreshProfile() {
    if (!session?.user) return
    await loadProfileData(session.user.id)
  }

  // Sign out
  async function signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.push('/login')
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to sign out'))
    }
  }

  return {
    session,
    user: session?.user ?? null,
    loading,
    error,
    profileData,
    onboardingState,
    activeProfileType,
    switchProfile,
    refreshProfile,
    signOut
  }
} 