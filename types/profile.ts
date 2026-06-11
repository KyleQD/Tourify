import { Database } from './supabase'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ArtistProfile = Database['public']['Tables']['artist_profiles']['Row']
export type VenueProfile = Database['public']['Tables']['venue_profiles']['Row']

// Import for local use; re-export so existing consumers continue to work.
import type { ProfileType } from '@/lib/accounts/account-types'
export type { ProfileType } from '@/lib/accounts/account-types'

export interface OnboardingSteps {
  general: {
    basic_info: boolean
    preferences: boolean
  }
  artist: {
    basic_info: boolean
    genres: boolean
    social: boolean
  }
  venue: {
    basic_info: boolean
    location: boolean
    amenities: boolean
  }
}

export interface OnboardingState {
  id: string
  user_id: string
  general_profile_completed: boolean
  artist_profile_completed: boolean
  venue_profile_completed: boolean
  active_profile_type: ProfileType
  steps: OnboardingSteps
  created_at: string
  updated_at: string | null
}

export interface UserSession {
  id: string
  email?: string
  isAdmin: boolean
  profiles: {
    general: boolean
    artist: boolean
    venue: boolean
  }
  activeProfile: ProfileType
}

export interface ProfileData {
  profile: Profile | null;
  artistProfile: ArtistProfile | null;
  venueProfile: VenueProfile | null;
} 