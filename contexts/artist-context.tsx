'use client'

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/database.types'
import { useMultiAccount } from '@/hooks/use-multi-account'
import { useAuth } from '@/contexts/auth-context'
import { readAccountFromSearch } from '@/lib/navigation/account-context-url'
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
  url_slug?: string | null
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
  updateSocialLinks: (
    links: Partial<Record<string, string>>
  ) => Promise<{ success: boolean; errors?: string[] }>
  
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
  const [isLoading, setIsLoading] = useState(false)
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

  const { currentAccount, activeSession, userAccounts, isAccountsReady } = useMultiAccount()
  const seededUserId =
    activeSession?.user_id ||
    userAccounts.find((account) => account.account_type === 'general')?.profile_id ||
    null

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
  const hasInitializedRef = useRef(false)
  const lastArtistProfileIdRef = useRef<string | null>(null)
  const profileRef = useRef<ArtistProfile | null>(null)
  const initGenerationRef = useRef(0)

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  function resolveActiveArtistProfileId(): string | null {
    if (
      currentAccount?.account_type === 'artist' ||
      currentAccount?.account_type === 'service'
    ) {
      return currentAccount.profile_id
    }
    if (typeof window === 'undefined') return null
    return readAccountFromSearch(window.location.search)
  }

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
          })

        if (relationError) {
          console.error('Error creating artist account relationship:', relationError)
        }
      }
    } catch (error) {
      console.error('Error ensuring artist account exists:', error)
    }
  }

  const loadArtistProfile = async (
    userId: string,
    profileId?: string | null,
    options?: { includePublicIdentity?: boolean }
  ): Promise<ArtistProfile | null> => {
    const includePublicIdentity = options?.includePublicIdentity !== false

    try {
      let query = supabase.from('artist_profiles').select('*')

      if (profileId) {
        // Precise lookup: use the profile_id from the active account context so that
        // users with multiple artist profiles always load the correct one.
        query = query.eq('id', profileId)
      } else {
        // Legacy path: filter by user_id when no specific profile is selected.
        // If the user has multiple artist profiles this returns the most recently
        // created one (safe default until the user explicitly switches).
        query = query.eq('user_id', userId).order('created_at', { ascending: false }).limit(1)
      }

      const { data: rows, error } = await query

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No artist profile found, creating one for user:', userId)
          return await createArtistProfile(userId)
        }
        throw error
      }

      const data = Array.isArray(rows) ? rows[0] ?? null : rows
      if (!data) return null

      setProfile(data)

      if (includePublicIdentity) {
        await loadPublicProfileIdentity(userId)

        if (!data.artist_name) {
          console.log('Artist name is missing, attempting to sync from account data')
          await syncArtistName()
        }
      } else if (!data.artist_name) {
        void syncArtistName().catch(() => {})
      }

      return data
    } catch (error) {
      console.error('Error loading artist profile:', error)
      setProfile(null)
      if (includePublicIdentity) setPublicProfile(null)
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

      // Fallback: get basic counts from the tables directly (parallel)
      try {
        const [
          { count: musicCount },
          { count: videoCount },
          { count: photoCount },
          { count: blogCount },
          { count: eventCount },
        ] = await Promise.all([
          supabase
            .from('artist_music')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_public', true),
          supabase
            .from('artist_videos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_public', true),
          supabase
            .from('artist_photos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_public', true),
          supabase
            .from('artist_blog_posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'published'),
          supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('artist_id', userId),
        ])

        console.log('📊 Basic counts loaded:', { musicCount, videoCount, photoCount, blogCount, eventCount })

        const basicStats: ArtistStats = {
          musicCount: musicCount || 0,
          videoCount: videoCount || 0,
          photoCount: photoCount || 0,
          blogCount: blogCount || 0,
          eventCount: eventCount || 0,
          merchandiseCount: 0,
          totalPlays: 0,
          totalViews: 0,
          totalTracks: musicCount || 0,
          totalEvents: eventCount || 0,
          totalFans: 0,
          engagementRate: 0,
          totalRevenue: 0,
          totalStreams: 0,
          monthlyListeners: 0,
          totalCollaborations: 0
        }
        
        setStats(basicStats)
        console.log('✅ Artist stats loaded successfully')
        
      } catch (tableError) {
        console.log('⚠️ Artist content tables not available, using default stats:', tableError)
        
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

  async function loadArtistContext(
    userId: string,
    artistProfileId: string | null,
    showFullScreenLoading: boolean
  ) {
    const initGeneration = ++initGenerationRef.current
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    try {
      if (showFullScreenLoading) setIsLoading(true)

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Initialization timeout')), 10000)
      })

      // Critical path only: profile load. Auth is already confirmed by useAuth.
      // Public identity sync and stats run after UI unblocks.
      const criticalInitPromise = async () => {
        await loadArtistProfile(userId, artistProfileId, { includePublicIdentity: false })
      }

      await Promise.race([criticalInitPromise(), timeoutPromise])
      if (initGeneration !== initGenerationRef.current) return

      hasInitializedRef.current = true
      lastArtistProfileIdRef.current = artistProfileId

      void Promise.all([
        loadPublicProfileIdentity(userId),
        loadArtistStats(userId),
        ensureArtistAccountExists(userId),
      ]).catch(err => {
        console.error('Error loading artist background data:', err)
      })
    } catch (error) {
      if (initGeneration !== initGenerationRef.current) return

      const isTimeout = error instanceof Error && error.message === 'Initialization timeout'
      if (isTimeout) {
        console.warn('Artist context initialization timed out; continuing with available state')
      } else {
        console.error('Error initializing artist user:', error)
      }
      // Soft-init on timeout or when profile already loaded so account switches
      // don't re-trigger full-screen loading forever.
      if (profileRef.current || isTimeout) {
        hasInitializedRef.current = true
        lastArtistProfileIdRef.current = artistProfileId
      }

      if (isTimeout) {
        void Promise.all([
          loadPublicProfileIdentity(userId),
          loadArtistStats(userId),
          ensureArtistAccountExists(userId),
        ]).catch(() => {})
      }
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId)
      if (initGeneration === initGenerationRef.current) setIsLoading(false)
    }
  }

  useEffect(() => {
    const effectiveAuthUser =
      authUser ||
      (seededUserId ? ({ id: seededUserId } as any) : null)

    // Wait for client auth OR server-seeded account identity before treating as logged out.
    if (authLoading && !effectiveAuthUser) {
      setIsLoading(true)
      return
    }

    if (!effectiveAuthUser) {
      if (!isAccountsReady) {
        setIsLoading(true)
        return
      }
      setUser(null)
      setProfile(null)
      setPublicProfile(null)
      setIsLoading(false)
      hasInitializedRef.current = false
      lastArtistProfileIdRef.current = null
      return
    }

    setUser(effectiveAuthUser)

    const artistProfileId = resolveActiveArtistProfileId()
    const isSameArtistContext =
      hasInitializedRef.current && lastArtistProfileIdRef.current === artistProfileId

    if (!isSameArtistContext) setIsLoading(true)

    void loadArtistContext(effectiveAuthUser.id, artistProfileId, !isSameArtistContext)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, authLoading, seededUserId, isAccountsReady, currentAccount?.profile_id, currentAccount?.account_type])

  const updateProfile = async (data: Partial<ArtistProfile>): Promise<boolean> => {
    if (!user || !profile) return false

    try {
      let updateQuery = supabase
        .from('artist_profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)

      if (profile.id) updateQuery = updateQuery.eq('id', profile.id)

      const { error } = await updateQuery

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
            .from('events')
            .insert({
              ...data,
              artist_id: user.id,
              creator_account_type: 'artist',
            })
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
      const existingSocial =
        profile.social_links && typeof profile.social_links === 'object'
          ? (profile.social_links as Record<string, string>)
          : {}

      const socialInput = {
        website: profileData.website ?? existingSocial.website ?? '',
        instagram: profileData.instagram ?? existingSocial.instagram ?? '',
        twitter: profileData.twitter ?? existingSocial.twitter ?? '',
        youtube: profileData.youtube ?? existingSocial.youtube ?? '',
        tiktok: profileData.tiktok ?? existingSocial.tiktok ?? '',
        facebook: profileData.facebook ?? existingSocial.facebook ?? '',
        spotify: profileData.spotify ?? existingSocial.spotify ?? '',
        apple_music: profileData.apple_music ?? existingSocial.apple_music ?? '',
        soundcloud: profileData.soundcloud ?? existingSocial.soundcloud ?? '',
      }

      const normalizedSocial = normalizeSocialLinksForStorage(socialInput)

      if (!artistName?.trim()) {
        errors.push('Artist name is required')
      }

      if (profileData.contact_email && !isValidEmail(profileData.contact_email)) {
        errors.push('Invalid email format')
      }

      for (const field of [
        'website',
        'instagram',
        'twitter',
        'youtube',
        'tiktok',
        'facebook',
        'spotify',
        'apple_music',
        'soundcloud',
      ] as const) {
        const err = validateSocialField(field, socialInput[field] ?? '')
        if (err) errors.push(err)
      }

      if (errors.length > 0) {
        return { success: false, errors }
      }

      const socialLinks = {
        ...existingSocial,
        ...normalizedSocial,
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

  const updateSocialLinks = async (
    links: Partial<Record<string, string>>
  ): Promise<{ success: boolean; errors?: string[] }> => {
    if (!user || !profile) {
      return { success: false, errors: ['User not authenticated or no artist profile'] }
    }

    try {
      const existingSocial =
        profile.social_links && typeof profile.social_links === 'object'
          ? (profile.social_links as Record<string, string>)
          : {}

      const socialInput = {
        website: links.website ?? existingSocial.website ?? '',
        instagram: links.instagram ?? existingSocial.instagram ?? '',
        twitter: links.twitter ?? existingSocial.twitter ?? '',
        youtube: links.youtube ?? existingSocial.youtube ?? '',
        tiktok: links.tiktok ?? existingSocial.tiktok ?? '',
        facebook: links.facebook ?? existingSocial.facebook ?? '',
        spotify: links.spotify ?? existingSocial.spotify ?? '',
        apple_music: links.apple_music ?? existingSocial.apple_music ?? '',
        soundcloud: links.soundcloud ?? existingSocial.soundcloud ?? '',
      }

      const errors: string[] = []
      for (const field of [
        'website',
        'instagram',
        'twitter',
        'youtube',
        'tiktok',
        'facebook',
        'spotify',
        'apple_music',
        'soundcloud',
      ] as const) {
        const err = validateSocialField(field, socialInput[field] ?? '')
        if (err) errors.push(err)
      }
      if (errors.length > 0) return { success: false, errors }

      const socialLinks = {
        ...existingSocial,
        ...normalizeSocialLinksForStorage(socialInput),
      }

      const { error: profileError } = await supabase
        .from('artist_profiles')
        .update({
          social_links: socialLinks,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (profileError) throw profileError

      if (socialLinks.website) {
        await supabase
          .from('profiles')
          .update({
            website: socialLinks.website || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      }

      setProfile(prev =>
        prev
          ? {
              ...prev,
              social_links: socialLinks,
              updated_at: new Date().toISOString(),
            }
          : prev
      )

      return { success: true }
    } catch (error) {
      console.error('Error updating social links:', error)
      return { success: false, errors: ['Failed to update social links. Please try again.'] }
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
    updateSocialLinks,
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
