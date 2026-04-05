'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/database.types'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { useAuth } from '@/contexts/auth-context'
import {
  normalizeGenreList,
  normalizeSocialLinksForStorage,
  validateSocialField
} from '@/lib/artist/profile-social-validation'
import {
  buildCreatorCapabilitiesV1,
  serializeCapabilityList
} from '@/lib/creator/capability-system'

/** Public-facing identity row (profiles) — hero avatar, banner, location on /artist/[username] */
export interface PublicProfileIdentity {
  avatar_url: string | null
  cover_image: string | null
  username: string | null
  location: string | null
  website: string | null
}

interface ArtistProfile {
  id: string
  user_id: string
  artist_name: string | null
  bio: string | null
  genres: string[] | null
  social_links: Record<string, string> | null
  verification_status: string
  account_tier: string
  settings: Record<string, any> | null
  created_at: string
  updated_at: string
}

interface ArtistStats {
  totalRevenue: number
  totalFans: number
  totalStreams: number
  engagementRate: number
  monthlyListeners: number
  totalTracks: number
  totalEvents: number
  totalCollaborations: number
  // New stats from content
  musicCount: number
  videoCount: number
  photoCount: number
  blogCount: number
  eventCount: number
  merchandiseCount: number
  totalPlays: number
  totalViews: number
}

interface ArtistContextType {
  // User & Profile
  user: any | null
  profile: ArtistProfile | null
  /** Synced from `profiles` for public hero (avatar, banner, location) */
  publicProfile: PublicProfileIdentity | null
  isLoading: boolean
  
  // Computed values
  displayName: string
  avatarInitial: string
  
  // Stats & Analytics
  stats: ArtistStats
  
  // Actions
  updateProfile: (data: Partial<ArtistProfile>) => Promise<boolean>
  refreshStats: () => Promise<void>
  refreshPublicProfile: () => Promise<void>
  syncArtistName: () => Promise<boolean>
  updateDetailedProfile: (profileData: any) => Promise<{ success: boolean; errors?: string[] }>
  
  // Content Management
  createContent: (type: string, data: any) => Promise<any>
  
  // Feature Flags
  features: {
    feedEnabled: boolean
    storeEnabled: boolean
    analyticsEnabled: boolean
    collaborationEnabled: boolean
  }
}

const ArtistContext = createContext<ArtistContextType | undefined>(undefined)

export function ArtistProvider({ children }: { children: ReactNode }) {
  const { user: authUser, loading: authLoading } = useAuth()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<ArtistProfile | null>(null)
  const [publicProfile, setPublicProfile] = useState<PublicProfileIdentity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<ArtistStats>({
    totalRevenue: 0,
    totalFans: 0,
    totalStreams: 0,
    engagementRate: 0,
    monthlyListeners: 0,
    totalTracks: 0,
    totalEvents: 0,
    totalCollaborations: 0,
    musicCount: 0,
    videoCount: 0,
    photoCount: 0,
    blogCount: 0,
    eventCount: 0,
    merchandiseCount: 0,
    totalPlays: 0,
    totalViews: 0
  })

  const { currentAccount } = useMultiAccount()

  // Feature flags (can be moved to database later)
  const features = {
    feedEnabled: true,
    storeEnabled: true,
    analyticsEnabled: true,
    collaborationEnabled: true
  }

  // Computed values for display
  const getDisplayName = (): string => {
    // Priority order: artist_name from profile, artist_name from account, user metadata, email
    if (profile?.artist_name) {
      return profile.artist_name
    }
    
    if (currentAccount?.profile_data?.artist_name) {
      return currentAccount.profile_data.artist_name
    }
    
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
    }
    
    if (user?.user_metadata?.name) {
      return user.user_metadata.name
    }
    
    if (user?.email) {
      return user.email.split('@')[0]
    }
    
    return 'Artist'
  }

  const getAvatarInitial = (): string => {
    const name = getDisplayName()
    return name.charAt(0).toUpperCase()
  }

  const displayName = getDisplayName()
  const avatarInitial = getAvatarInitial()

  useEffect(() => {
    // Wait for auth to finish loading before initializing
    if (!authLoading && authUser) {
      setUser(authUser)
      initializeUser()
    } else if (!authLoading && !authUser) {
      // User is not authenticated
      setUser(null)
      setProfile(null)
      setPublicProfile(null)
      setIsLoading(false)
    }
  }, [authUser, authLoading])

  const loadPublicProfileIdentity = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url, cover_image, username, location, website')
      .eq('id', userId)
      .single()

    if (error || !data) {
      setPublicProfile(null)
      return
    }

    const row = data as Record<string, unknown>
    setPublicProfile({
      avatar_url: (row.avatar_url as string | null) ?? null,
      cover_image: (row.cover_image as string | null) ?? null,
      username: (row.username as string | null) ?? null,
      location: (row.location as string | null) ?? null,
      website: (row.website as string | null) ?? null
    })
  }

  const refreshPublicProfile = async () => {
    if (!user?.id) return
    await loadPublicProfileIdentity(user.id)
  }

  const initializeUser = async () => {
    try {
      setIsLoading(true)
      
      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Initialization timeout')), 10000)
      )
      
      const initPromise = async () => {
        // Ensure we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.error('Session error during artist initialization:', sessionError)
          throw new Error('Authentication session expired')
        }
        
        if (!session) {
          console.error('No session found during artist initialization')
          throw new Error('No active session')
        }

        if (authUser) {
          // Try to get artist profile
          await loadArtistProfile(authUser.id)
          await loadArtistStats(authUser.id)
          
          // Ensure artist account exists in multi-account system
          await ensureArtistAccountExists(authUser.id)
        }
      }

      // Race between initialization and timeout
      await Promise.race([initPromise(), timeoutPromise])
    } catch (error) {
      console.error('Error initializing artist user:', error)
      // Even on error, we should stop loading to prevent infinite loading states
    } finally {
      setIsLoading(false)
    }
  }

  const ensureArtistAccountExists = async (userId: string) => {
    try {
      // Check if artist account relationship exists
      const { data: existingRelation, error } = await supabase
        .from('account_relationships')
        .select('*')
        .eq('owner_user_id', userId)
        .eq('account_type', 'artist')
        .single()

      if (error && error.code === 'PGRST116') {
        // No relationship exists, create one
        console.log('Creating artist account relationship for user:', userId)
        
        const { error: relationError } = await supabase
          .from('account_relationships')
          .insert({
            owner_user_id: userId,
            owned_profile_id: userId, // Artist profile uses the same user ID
            account_type: 'artist',
            permissions: {},
            is_active: true
          })

        if (relationError) {
          console.error('Error creating artist account relationship:', relationError)
        }
      }
    } catch (error) {
      console.error('Error ensuring artist account exists:', error)
    }
  }

  const loadArtistProfile = async (userId: string): Promise<ArtistProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile exists, create one automatically
          console.log('No artist profile found, creating one for user:', userId)
          const createdProfile = await createArtistProfile(userId)
          return createdProfile
        } else {
          throw error
        }
      } else if (data) {
        setProfile(data)
        await loadPublicProfileIdentity(userId)
        
        // Check if artist_name is missing and try to sync it
        if (!data.artist_name) {
          console.log('Artist name is missing, attempting to sync from account data')
          await syncArtistName()
        }
        
        return data
      }
      
      return null
    } catch (error) {
      console.error('Error loading artist profile:', error)
      setProfile(null)
      setPublicProfile(null)
      return null
    }
  }

  const createArtistProfile = async (userId: string): Promise<ArtistProfile | null> => {
    try {
      console.log('Creating artist profile for user:', userId)
      
      // Get artist name from user metadata or account data
      let artistName = null
      
      if (currentAccount?.profile_data?.artist_name) {
        artistName = currentAccount.profile_data.artist_name
      } else if (user?.user_metadata?.full_name) {
        artistName = user.user_metadata.full_name
      } else if (user?.user_metadata?.name) {
        artistName = user.user_metadata.name
      } else if (user?.email) {
        artistName = user.email.split('@')[0]
      }

      // First try to use the SQL function to ensure artist profile exists
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('ensure_artist_profile', { target_user_id: userId })

      if (rpcError) {
        console.log('RPC function not available, creating profile manually:', rpcError)
        
        // Fallback: Create profile manually
        const { error: insertError } = await supabase
          .from('artist_profiles')
          .insert({
            user_id: userId,
            artist_name: artistName,
            bio: null,
            genres: [],
            social_links: {},
            verification_status: 'unverified',
            account_tier: 'pro',
            settings: {}
          })

        if (insertError && insertError.code !== '23505') { // 23505 is unique constraint violation (already exists)
          throw insertError
        }
      }

      // Update the profile with the artist name if we have one
      if (artistName) {
        const { error: updateError } = await supabase
          .from('artist_profiles')
          .update({ artist_name: artistName })
          .eq('user_id', userId)

        if (updateError) {
          console.error('Error updating artist name:', updateError)
        }
      }

      // Reload the profile after creation
      const { data: newProfile, error: loadError } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (loadError) throw loadError
      if (newProfile) {
        console.log('Artist profile created/loaded successfully:', newProfile)
        setProfile(newProfile)
        await loadPublicProfileIdentity(userId)
        return newProfile
      }
      
      return null
    } catch (error) {
      console.error('Error creating artist profile:', error)
      setProfile(null)
      return null
    }
  }

  const syncArtistName = async (): Promise<boolean> => {
    if (!user?.id || !profile) return false

    try {
      let artistName = null
      
      // Priority order: account data, user metadata, email
      if (currentAccount?.profile_data?.artist_name) {
        artistName = currentAccount.profile_data.artist_name
      } else if (user?.user_metadata?.full_name) {
        artistName = user.user_metadata.full_name
      } else if (user?.user_metadata?.name) {
        artistName = user.user_metadata.name
      } else if (user?.email) {
        artistName = user.email.split('@')[0]
      }

      if (artistName && artistName !== profile.artist_name) {
        const { error } = await supabase
          .from('artist_profiles')
          .update({ 
            artist_name: artistName,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)

        if (error) throw error

        // Update local state
        setProfile(prev => prev ? { ...prev, artist_name: artistName } : prev)
        console.log('Artist name synced successfully:', artistName)
        return true
      }

      return false
    } catch (error) {
      console.error('Error syncing artist name:', error)
      return false
    }
  }

  const loadArtistStats = async (userId: string) => {
    try {
      console.log('📊 Loading artist stats for user:', userId)
      
      // Attempt optimized RPC first for aggregated stats
      try {
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_enhanced_artist_stats', { artist_user_id: userId as any })

        if (!rpcError && rpcData) {
          const s = rpcData as Record<string, any>
          const enhancedStats: ArtistStats = {
            totalRevenue: Number(s.total_revenue) || 0,
            totalFans: Number(s.total_fans) || 0,
            totalStreams: Number(s.total_streams) || 0,
            engagementRate: Number(s.engagement_rate) || 0,
            monthlyListeners: Number(s.monthly_listeners) || 0,
            totalTracks: Number(s.total_tracks) || 0,
            totalEvents: Number(s.total_events) || 0,
            totalCollaborations: Number(s.total_collaborations) || 0,
            musicCount: Number(s.music_count) || 0,
            videoCount: Number(s.video_count) || 0,
            photoCount: Number(s.photo_count) || 0,
            blogCount: Number(s.blog_count) || 0,
            eventCount: Number(s.event_count) || 0,
            merchandiseCount: Number(s.merchandise_count) || 0,
            totalPlays: Number(s.total_plays) || 0,
            totalViews: Number(s.total_views) || 0
          }

          setStats(enhancedStats)
          console.log('✅ Enhanced artist stats loaded via RPC')
          return
        }
      } catch (rpcErr) {
        console.log('ℹ️ Enhanced stats RPC unavailable, falling back to basic counts:', rpcErr)
      }

      // Fallback: get basic counts from the tables directly
      try {
        // Try simple table queries first
        const { count: musicCount } = await supabase
          .from('artist_music')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_public', true)

        const { count: videoCount } = await supabase
          .from('artist_videos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_public', true)

        const { count: photoCount } = await supabase
          .from('artist_photos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_public', true)

        const { count: blogCount } = await supabase
          .from('artist_blog_posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'published')

        const { count: eventCount } = await supabase
          .from('artist_events')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_public', true)

        console.log('📊 Basic counts loaded:', { musicCount, videoCount, photoCount, blogCount, eventCount })

        const basicStats: ArtistStats = {
          // Real data from database
          musicCount: musicCount || 0,
          videoCount: videoCount || 0,
          photoCount: photoCount || 0,
          blogCount: blogCount || 0,
          eventCount: eventCount || 0,
          merchandiseCount: 0, // Will be updated if table exists
          totalPlays: 0,
          totalViews: 0,
          
          // Calculated/derived stats
          totalTracks: musicCount || 0,
          totalEvents: eventCount || 0,
          totalFans: 0,
          engagementRate: 0,
          
          // Placeholder for features not yet implemented
          totalRevenue: 0,
          totalStreams: 0,
          monthlyListeners: 0,
          totalCollaborations: 0
        }
        
        setStats(basicStats)
        console.log('✅ Artist stats loaded successfully')
        
      } catch (tableError) {
        console.log('⚠️ Artist content tables not available, using default stats:', tableError)
        
        // Fallback to default stats
        const defaultStats: ArtistStats = {
          totalRevenue: 0,
          totalFans: 0,
          totalStreams: 0,
          engagementRate: 0,
          monthlyListeners: 0,
          totalTracks: 0,
          totalEvents: 0,
          totalCollaborations: 0,
          musicCount: 0,
          videoCount: 0,
          photoCount: 0,
          blogCount: 0,
          eventCount: 0,
          merchandiseCount: 0,
          totalPlays: 0,
          totalViews: 0
        }
        
        setStats(defaultStats)
      }
      
    } catch (error) {
      console.error('Error loading artist stats:', error)
      // Keep default stats on error
    }
  }

  const updateProfile = async (data: Partial<ArtistProfile>): Promise<boolean> => {
    if (!user || !profile) return false

    try {
      const { error } = await supabase
        .from('artist_profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (error) throw error

      // Update local state
      setProfile(prev => prev ? { ...prev, ...data } : prev)
      return true
    } catch (error) {
      console.error('Error updating profile:', error)
      return false
    }
  }

  const createContent = async (type: string, data: any) => {
    if (!user || !profile) throw new Error('User not authenticated or no artist profile')

    const contentData = {
      user_id: user.id,
      artist_profile_id: profile.id,
      ...data
    }

    try {
      let result
      switch (type) {
        case 'music':
          const { data: musicData, error: musicError } = await supabase
            .from('artist_music')
            .insert(contentData)
            .select()
            .single()
          if (musicError) throw musicError
          result = musicData
          break

        case 'video':
          const { data: videoData, error: videoError } = await supabase
            .from('artist_videos')
            .insert(contentData)
            .select()
            .single()
          if (videoError) throw videoError
          result = videoData
          break

        case 'photo':
          const { data: photoData, error: photoError } = await supabase
            .from('artist_photos')
            .insert(contentData)
            .select()
            .single()
          if (photoError) throw photoError
          result = photoData
          break

        case 'blog':
          const { data: blogData, error: blogError } = await supabase
            .from('artist_blog_posts')
            .insert(contentData)
            .select()
            .single()
          if (blogError) throw blogError
          result = blogData
          break

        case 'event':
          const { data: eventData, error: eventError } = await supabase
            .from('artist_events')
            .insert(contentData)
            .select()
            .single()
          if (eventError) throw eventError
          result = eventData
          break

        case 'merchandise':
          const { data: merchData, error: merchError } = await supabase
            .from('artist_merchandise')
            .insert(contentData)
            .select()
            .single()
          if (merchError) throw merchError
          result = merchData
          break

        default:
          throw new Error(`Unsupported content type: ${type}`)
      }

      // Refresh stats after creating content
      await loadArtistStats(user.id)
      return result
    } catch (error) {
      console.error(`Error creating ${type} content:`, error)
      throw error
    }
  }

  const refreshStats = async () => {
    if (!user?.id) return
    await loadArtistStats(user.id)
  }

  const updateDetailedProfile = async (profileData: any): Promise<{ success: boolean; errors?: string[] }> => {
    if (!user || !profile) {
      return { success: false, errors: ['User not authenticated or no artist profile'] }
    }

    try {
      const errors: string[] = []

      const artistName = profileData.stage_name || profileData.artist_name
      const bio = profileData.bio ?? ''
      const genres = normalizeGenreList(
        profileData.genres ?? (profileData.genre ? [profileData.genre] : [])
      )
      const location = typeof profileData.location === 'string' ? profileData.location.trim() : ''
      const normalizedSocial = normalizeSocialLinksForStorage({
        website: profileData.website ?? '',
        instagram: profileData.instagram ?? '',
        twitter: profileData.twitter ?? '',
        youtube: profileData.youtube ?? '',
        spotify: profileData.spotify ?? ''
      })

      if (!artistName?.trim()) {
        errors.push('Artist name is required')
      }

      if (profileData.contact_email && !isValidEmail(profileData.contact_email)) {
        errors.push('Invalid email format')
      }

      for (const field of ['website', 'instagram', 'twitter', 'youtube', 'spotify'] as const) {
        const err = validateSocialField(field, profileData[field] ?? '')
        if (err) errors.push(err)
      }

      if (errors.length > 0) {
        return { success: false, errors }
      }

      const socialLinks = {
        website: normalizedSocial.website,
        instagram: normalizedSocial.instagram,
        twitter: normalizedSocial.twitter,
        youtube: normalizedSocial.youtube,
        spotify: normalizedSocial.spotify
      }

      const settings = {
        professional: {
          location,
          contact_email: profileData.contact_email || '',
          phone: profileData.phone || '',
          booking_rate: profileData.booking_rate || '',
          availability: profileData.availability || '',
          creator_type: profileData.creator_type || profileData.music_style || '',
          service_offerings: serializeCapabilityList(profileData.service_offerings || profileData.equipment),
          products_for_sale: serializeCapabilityList(profileData.products_for_sale || profileData.upcoming_releases),
          equipment: profileData.equipment || '',
          music_style: profileData.music_style || '',
          experience_years: profileData.experience_years || '',
          notable_performances: profileData.notable_performances || '',
          record_label: profileData.record_label || '',
          awards: profileData.awards || '',
          upcoming_releases: profileData.upcoming_releases || ''
        },
        preferences: {
          collaboration_interest: profileData.collaboration_interest || false,
          available_for_hire: profileData.available_for_hire || false,
          newsletter_signup: profileData.newsletter_signup || false,
          privacy_settings: profileData.privacy_settings || 'public',
          preferred_contact: profileData.preferred_contact || 'email'
        },
        capabilities_v1: buildCreatorCapabilitiesV1({
          creatorType: profileData.creator_type || profileData.music_style,
          serviceOfferings: profileData.service_offerings || profileData.equipment,
          productsForSale: profileData.products_for_sale || profileData.upcoming_releases,
          credentials: profileData.credentials,
          workHighlights: profileData.work_highlights || profileData.notable_performances,
          availableForHire: profileData.available_for_hire,
          collaborationInterest: profileData.collaboration_interest,
          availability: profileData.availability,
          preferredContact: profileData.preferred_contact
        })
      }

      const { error: profileError } = await supabase
        .from('artist_profiles')
        .update({
          artist_name: artistName,
          bio: bio || '',
          genres,
          social_links: socialLinks,
          settings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (profileError) {
        console.error('Error updating artist profile:', profileError)
        throw profileError
      }

      const websiteForProfiles = socialLinks.website || null
      const bioForProfiles = bio || null

      const { error: identityError } = await supabase
        .from('profiles')
        .update({
          location: location || null,
          website: websiteForProfiles,
          bio: bioForProfiles,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (identityError) {
        console.error('Error syncing profiles row:', identityError)
        return {
          success: false,
          errors: ['Artist profile saved, but public profile fields could not be synced. Try again or contact support.']
        }
      }

      setProfile(prev =>
        prev
          ? {
              ...prev,
              artist_name: artistName,
              bio: bio || '',
              genres,
              social_links: socialLinks,
              settings,
              updated_at: new Date().toISOString()
            }
          : prev
      )
      await loadPublicProfileIdentity(user.id)

      return { success: true }
    } catch (error) {
      console.error('Error updating detailed profile:', error)
      return { success: false, errors: ['Failed to update profile. Please try again.'] }
    }
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const contextValue: ArtistContextType = {
    user,
    profile,
    publicProfile,
    isLoading,
    displayName,
    avatarInitial,
    stats,
    updateProfile,
    refreshStats,
    refreshPublicProfile,
    syncArtistName,
    updateDetailedProfile,
    createContent,
    features
  }

  return (
    <ArtistContext.Provider value={contextValue}>
      {children}
    </ArtistContext.Provider>
  )
}

export function useArtist() {
  const context = useContext(ArtistContext)
  if (context === undefined) {
    throw new Error('useArtist must be used within an ArtistProvider')
  }
  return context
}