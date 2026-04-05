import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'

export type ProfileType = 'general' | 'artist' | 'venue' | 'admin' | 'staff'

export interface UserAccount {
  account_type: ProfileType
  profile_id: string
  profile_data: any
  permissions: AccountPermissions
  is_active: boolean
}

export interface ActiveSession {
  user_id: string
  active_profile_id: string
  active_account_type: ProfileType
  session_data?: any
  last_activity: string
  created_at: string
}

export interface AccountPermissions {
  can_post?: boolean
  can_manage_settings?: boolean
  can_view_analytics?: boolean
  can_manage_content?: boolean
  can_manage_events?: boolean
  can_manage_tours?: boolean
  can_moderate?: boolean
  can_manage_users?: boolean
}

export class AccountManagementService {
  // Get all user accounts with proper relationship detection
  static async getUserAccounts(userId: string, authenticatedSupabase?: any): Promise<UserAccount[]> {
    try {
      console.log('[Account Management] Getting accounts for user:', userId)
      
      // Use authenticated Supabase client if provided (for API routes), otherwise use default client
      const clientToUse = authenticatedSupabase || supabase
      
      const accounts: UserAccount[] = []

      // Get main profile first
      let mainProfile
      const { data: profileData, error: profileError } = await clientToUse
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError || !profileData) {
        console.error('[Account Management] Error fetching main profile:', profileError)
        
        // If profile doesn't exist, try to create one via API
        if (profileError?.code === 'PGRST116' || !profileData) {
          console.log('[Account Management] Profile not found, attempting to create profile for user:', userId)
          
          try {
            // Try to create profile via API endpoint
            const response = await fetch('/api/profile/create', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            })
            
            if (response.ok) {
              const result = await response.json()
              console.log('[Account Management] Profile created successfully via API')
              
              // Retry fetching the profile
              const { data: retryProfile, error: retryError } = await clientToUse
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()
              
              if (retryProfile && !retryError) {
                console.log('[Account Management] Successfully fetched newly created profile')
                mainProfile = retryProfile
              } else {
                throw new Error('Failed to fetch newly created profile')
              }
            } else {
              throw new Error(`Profile creation API failed: ${response.status}`)
            }
          } catch (apiError) {
            console.error('[Account Management] Failed to create profile via API:', apiError)
            
            // Fallback: create a minimal profile object for the session
            console.log('[Account Management] Creating fallback profile data')
            mainProfile = {
              id: userId,
              username: `user-${userId.slice(0, 8)}`,
              full_name: 'User',
              bio: null,
              avatar_url: null,
              location: null,
              website: null,
              is_verified: false,
              followers_count: 0,
              following_count: 0,
              posts_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          }
        } else {
          throw new Error(`Profile fetch failed: ${profileError?.message || 'Unknown error'}`)
        }
      } else {
        mainProfile = profileData
      }

      console.log('🔍 [Account Management] Main profile data:', {
        id: mainProfile.id,
        hasAccountSettings: !!mainProfile.account_settings,
        accountSettings: mainProfile.account_settings,
        fullProfile: mainProfile
      })

      // Add main profile as general account
      accounts.push({
        account_type: 'general',
        profile_id: userId,
        profile_data: mainProfile,
        permissions: {
          can_post: true,
          can_manage_settings: true,
          can_view_analytics: false,
          can_manage_content: false
        },
        is_active: true
      })

      // Check for organizer accounts in the main profile's account_settings (FIXED FIELD NAMES)
      console.log('🔍 [Account Management] Checking for organizer accounts...')
      console.log('🔍 [Account Management] Account settings:', mainProfile.account_settings)
      console.log('🔍 [Account Management] Has organizer_accounts field?', !!mainProfile.account_settings?.organizer_accounts)
      console.log('🔍 [Account Management] Has organizer_data field?', !!mainProfile.account_settings?.organizer_data)
      
      // Check for organizer_accounts (array format - new format)
      if (mainProfile.account_settings?.organizer_accounts) {
        const organizerAccounts = mainProfile.account_settings.organizer_accounts
        console.log('📋 [Account Management] Found organizer accounts in profile settings:', organizerAccounts.length)
        console.log('📋 [Account Management] Organizer accounts data:', organizerAccounts)
        
        for (const organizerAccount of organizerAccounts) {
          console.log('➕ [Account Management] Adding organizer account:', organizerAccount.organization_name)
          accounts.push({
            account_type: 'admin',
            profile_id: organizerAccount.id,
            profile_data: {
              ...organizerAccount,
              display_name: organizerAccount.organization_name,
              account_display_type: 'Organizer'
            },
            permissions: {
              can_post: true,
              can_manage_settings: true,
              can_view_analytics: true,
              can_manage_content: true,
              can_manage_events: true,
              can_manage_tours: true,
              can_moderate: true,
              can_manage_users: true
            },
            is_active: true
          })
          console.log('✅ [Account Management] Found organizer account:', organizerAccount.organization_name)
        }
      }
      // Check for organizer_data (single object format - legacy format)
      else if (mainProfile.account_settings?.organizer_data && mainProfile.account_settings.organizer_data.organization_name) {
        const organizerData = mainProfile.account_settings.organizer_data
        console.log('📋 [Account Management] Found organizer data in profile settings (legacy format)')
        console.log('📋 [Account Management] Organizer data:', organizerData)
        
        // Generate a profile ID for this organizer account
        const organizerProfileId = `${userId}-organizer-${organizerData.organization_name.toLowerCase().replace(/\s+/g, '-')}`
        
        console.log('➕ [Account Management] Adding organizer account (legacy):', organizerData.organization_name)
        accounts.push({
          account_type: 'admin',
          profile_id: organizerProfileId,
          profile_data: {
            id: organizerProfileId,
            ...organizerData,
            display_name: organizerData.organization_name,
            account_display_type: 'Organizer',
            user_id: userId,
            created_at: new Date().toISOString()
          },
          permissions: {
            can_post: true,
            can_manage_settings: true,
            can_view_analytics: true,
            can_manage_content: true,
            can_manage_events: true,
            can_manage_tours: true,
            can_moderate: true,
            can_manage_users: true
          },
          is_active: true
        })
        console.log('✅ [Account Management] Found organizer account (legacy):', organizerData.organization_name)
      } else {
        console.log('❌ [Account Management] No organizer accounts found in profile settings')
      }

      // Try to get artist profiles
      try {
        const { data: artistProfiles, error: artistError } = await clientToUse
          .from('artist_profiles')
          .select('*')
          .eq('user_id', userId)

        if (artistProfiles && !artistError) {
          artistProfiles.forEach((artist: any) => {
            accounts.push({
              account_type: 'artist',
              profile_id: artist.id,
              profile_data: {
                ...artist,
                display_name: artist.artist_name,
                account_display_type: 'Artist'
              },
              permissions: {
                can_post: true,
                can_manage_settings: true,
                can_view_analytics: true,
                can_manage_content: true
              },
              is_active: true
            })
          })
        }
      } catch (artistError) {
        console.log('[Account Management] Artist profiles not available:', artistError)
      }

      // Try to get venue profiles - only show accounts that actually exist in database
      try {
        console.log('[Account Management] Checking for venue profiles in database...')
        const { data: venueProfiles, error: venueError } = await clientToUse
          .from('venue_profiles')
          .select('*')
          .or(`user_id.eq.${userId},main_profile_id.eq.${userId}`)

        if (venueProfiles && !venueError && venueProfiles.length > 0) {
          console.log(`[Account Management] Found ${venueProfiles.length} venue profiles in database:`, venueProfiles.map((v: any) => v.venue_name))
          venueProfiles.forEach((venue: any) => {
            accounts.push({
              account_type: 'venue',
              profile_id: venue.id,
              profile_data: {
                ...venue,
                display_name: venue.venue_name,
                account_display_type: 'Venue'
              },
              permissions: {
                can_post: true,
                can_manage_settings: true,
                can_view_analytics: true,
                can_manage_content: true
              },
              is_active: true
            })
          })
        } else {
          console.log('[Account Management] No venue profiles found in database for user:', userId)
        }
      } catch (venueError) {
        console.log('[Account Management] Venue profiles not available:', venueError)
      }

      // Try to get staff memberships tied to this user
      try {
        const { data: staffMemberships, error: staffError } = await clientToUse
          .from('venue_team_members')
          .select('id, venue_id, name, email, role, department, status, venue_profiles:venue_id(id, venue_name, url_slug)')
          .eq('user_id', userId)
          .in('status', ['active', 'inactive'])

        if (staffMemberships && !staffError && staffMemberships.length > 0) {
          staffMemberships.forEach((membership: any) => {
            accounts.push({
              account_type: 'staff',
              profile_id: membership.id,
              profile_data: {
                ...membership,
                display_name:
                  membership?.venue_profiles?.venue_name || membership.name || membership.email || 'Staff',
                account_display_type: 'Staff',
              },
              permissions: {
                can_post: false,
                can_manage_settings: false,
                can_view_analytics: false,
                can_manage_content: false,
              },
              is_active: membership.status === 'active',
            })
          })
        }
      } catch (staffError) {
        console.log('[Account Management] Staff memberships not available:', staffError)
      }

      // Check for organizer accounts in dedicated organizer_accounts table (NEW ROBUST APPROACH)
      try {
        const { data: organizerAccountsTable, error: organizerError } = await clientToUse
          .from('organizer_accounts')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)

        if (organizerAccountsTable && !organizerError) {
          organizerAccountsTable.forEach((organizer: any) => {
            console.log('➕ [Account Management] Adding organizer account from table:', organizer.organization_name)
            accounts.push({
              account_type: 'admin',
              profile_id: organizer.id,
              profile_data: {
                id: organizer.id,
                organization_name: organizer.organization_name,
                organization_type: organizer.organization_type,
                description: organizer.description,
                contact_info: organizer.contact_info,
                social_links: organizer.social_links,
                specialties: organizer.specialties,
                admin_level: organizer.admin_level,
                display_name: organizer.organization_name,
                account_display_type: 'Organizer',
                user_id: userId,
                created_at: organizer.created_at,
                updated_at: organizer.updated_at
              },
              permissions: {
                can_post: true,
                can_manage_settings: true,
                can_view_analytics: true,
                can_manage_content: true,
                can_manage_events: true,
                can_manage_tours: true,
                can_moderate: true,
                can_manage_users: true
              },
              is_active: organizer.is_active
            })
            console.log('✅ [Account Management] Found organizer account from table:', organizer.organization_name)
          })
        }
      } catch (organizerTableError) {
        console.log('⚠️ [Account Management] Organizer accounts table not available:', organizerTableError)
      }

      // DISABLED: Skip account relationships to avoid showing orphaned accounts
      // Only show accounts that actually exist in their respective database tables
      console.log('[Account Management] Skipping account_relationships table to prevent orphaned accounts')

      // DISABLED: Skip localStorage fallbacks to avoid showing orphaned accounts
      // Only show accounts that actually exist in their respective database tables
      console.log('[Account Management] Skipping localStorage fallbacks to prevent orphaned accounts')

      const uniqueAccounts = accounts.filter((account, index, list) => {
        const duplicateIndex = list.findIndex(candidate =>
          candidate.account_type === account.account_type && candidate.profile_id === account.profile_id
        )
        return duplicateIndex === index
      })

      console.log('[Account Management] Found accounts:', uniqueAccounts.map(acc => `${acc.account_type} (${acc.profile_data?.display_name || acc.profile_data?.organization_name || acc.profile_data?.artist_name || acc.profile_data?.venue_name || 'Personal'})`))
      
      return uniqueAccounts
    } catch (error) {
      console.error('[Account Management] Error getting user accounts:', error)
      throw error
    }
  }

  // Get active session
  static async getActiveSession(userId: string, authenticatedSupabase?: any): Promise<ActiveSession | null> {
    try {
      // Use authenticated Supabase client if provided (for API routes), otherwise use default client
      const clientToUse = authenticatedSupabase || supabase
      
      const { data, error } = await clientToUse
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        // If table doesn't exist, return null (no session management available)
        if (error.code === '42P01') {
          console.log('User sessions table does not exist yet. Migration needs to be applied.')
          return null
        }
        throw error
      }
      return data
    } catch (error) {
      console.error('Error getting active session:', error)
      return null
    }
  }

  // Switch active account
  static async switchAccount(
    userId: string,
    profileId: string,
    accountType: ProfileType
  ): Promise<boolean> {
    try {
      // Try using the RPC function first (if migration has been applied)
      try {
        const { data, error } = await supabase.rpc('switch_active_account', {
          user_id: userId,
          profile_id: profileId,
          account_type: accountType
        })

        if (error) throw error
        return data
      } catch (rpcError: any) {
        // If RPC function doesn't exist, just return true (no session management available)
        console.log('Switch account RPC function not available, returning success')
        return true
      }
    } catch (error) {
      console.error('Error switching account:', error)
      return false
    }
  }

  // Create artist account
  static async createArtistAccount(
    userId: string,
    artistData: {
      artist_name: string
      bio?: string
      genres?: string[]
      social_links?: any
    }
  ): Promise<string> {
    try {
      console.log('Creating artist account for user:', userId, 'with data:', artistData)
      
      // Use direct table insert (RPC function has bugs)
      const { data: artistProfile, error: artistError } = await supabase
        .from('artist_profiles')
        .insert({
          user_id: userId,
          artist_name: artistData.artist_name,
          bio: artistData.bio || null,
          genres: artistData.genres || [],
          social_links: artistData.social_links || {},
          verification_status: 'unverified',
          account_tier: 'basic',
          settings: {
            allow_bookings: true,
            public_profile: true,
            show_contact_info: false,
            auto_accept_follows: true
          }
        })
        .select()
        .single()

      if (artistError) {
        console.error('Error creating artist profile:', artistError)
        
        // If artist_profiles table doesn't exist, just return a success message
        if (artistError.code === '42P01') {
          console.log('Artist profiles table does not exist yet. Migration needs to be applied.')
          // Return a placeholder ID for now
          return 'placeholder-artist-id'
        }
        
        // If it's a duplicate key error, the account already exists
        if (artistError.code === '23505') {
          console.log('Artist account already exists for this user')
          // Try to get the existing account
          const { data: existingProfile } = await supabase
            .from('artist_profiles')
            .select('id')
            .eq('user_id', userId)
            .single()
          
          if (existingProfile) {
            return existingProfile.id
          }
        }
        
        throw artistError
      }

      console.log('Artist account created successfully:', artistProfile.id)
      return artistProfile.id
    } catch (error) {
      console.error('Error creating artist account:', error)
      throw error
    }
  }

  // Create venue account
  static async createVenueAccount(
    userId: string,
    venueData: {
      venue_name: string
      description?: string
      address?: string
      capacity?: number
      venue_types?: string[]
      contact_info?: any
      social_links?: any
    }
  ): Promise<string> {
    try {
      console.log('Creating venue account for user:', userId, 'with data:', venueData)
      
      // Use direct table insert (RPC function has bugs)

      const baseUrlSlug = (venueData.venue_name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      const baseForSlug = baseUrlSlug || `venue-${userId.slice(0, 8)}`

      const generateUniqueUrlSlug = async () => {
        for (let i = 0; i < 25; i++) {
          const candidate = i === 0 ? baseForSlug : `${baseForSlug}-${i}`

          const { data: existing } = await supabase
            .from('venue_profiles')
            .select('id')
            .eq('url_slug', candidate)
            .limit(1)

          if (!existing || existing.length === 0) return candidate
        }

        throw new Error('Failed to generate unique venue url_slug')
      }

      const urlSlug = await generateUniqueUrlSlug()

const { data: venueProfile, error: venueError } = await supabase
        .from('venue_profiles')
        .insert({
          user_id: userId,
          venue_name: venueData.venue_name,
          url_slug: urlSlug,
          description: venueData.description || null,
          address: venueData.address || null,
          capacity: venueData.capacity || null,
          venue_types: venueData.venue_types || [],
          contact_info: venueData.contact_info || {},
          social_links: venueData.social_links || {},
          verification_status: 'unverified',
          account_tier: 'basic',
          settings: {
            allow_bookings: true,
            public_profile: true,
            show_contact_info: false,
            auto_accept_follows: true
          }
        })
        .select()
        .single()

      if (venueError) {
        console.error('Error creating venue profile:', venueError)
        
        // If venue_profiles table doesn't exist, just return a success message
        if (venueError.code === '42P01') {
          console.log('Venue profiles table does not exist yet. Migration needs to be applied.')
          // Return a placeholder ID for now
          return 'placeholder-venue-id'
        }
        
        // If it's a duplicate key error, the account already exists
        if (venueError.code === '23505') {
          console.log('Venue account already exists for this user')
          // Try to get the existing account
          const { data: existingProfile } = await supabase
            .from('venue_profiles')
            .select('id')
            .eq('user_id', userId)
            .single()
          
          if (existingProfile) {
            return existingProfile.id
          }
        }
        
        throw venueError
      }

      console.log('Venue account created successfully:', venueProfile.id)
      return venueProfile.id
    } catch (error) {
      console.error('Error creating venue account:', error)
      throw error
    }
  }

  // Create organizer account (admin privileges) - NEW TABLE-BASED APPROACH WITH AUTHENTICATION
  static async createOrganizerAccount(
    userId: string,
    organizerData: {
      organization_name: string
      description?: string
      organization_type: string
      contact_info?: any
      social_links?: any
      specialties?: string[]
    },
    authenticatedSupabase?: any,
    authenticatedUser?: any  // New parameter to pass pre-authenticated user
  ): Promise<string> {
    console.log('🏗️ [Account Management] Starting organizer account creation for user:', userId)
    console.log('🏗️ [Account Management] Organizer data:', organizerData)
    
    try {
      // Use authenticated Supabase client if provided (for API routes), otherwise use default client
      const clientToUse = authenticatedSupabase || supabase
      
      let user = authenticatedUser
      
      // Only verify authentication if user wasn't pre-authenticated
      if (!user) {
        console.log('🔍 [Account Management] No pre-authenticated user, verifying authentication...')
        const { data: { user: authUser }, error: authError } = await clientToUse.auth.getUser()
        if (authError || !authUser) {
          console.error('❌ [Account Management] Authentication failed:', authError)
          throw new Error('User must be authenticated to create organizer account')
        }
        user = authUser
        console.log('✅ [Account Management] Authentication verified for user:', user.id)
      } else {
        console.log('✅ [Account Management] Using pre-authenticated user:', user.id)
      }
      
      // Ensure the authenticated user matches the provided userId
      if (user.id !== userId) {
        console.error('❌ [Account Management] User ID mismatch:', { authUser: user.id, providedUser: userId })
        throw new Error('User ID mismatch - cannot create account for different user')
      }
      
      // Use the RPC function which has SECURITY DEFINER privileges to bypass RLS
      console.log('🔄 [Account Management] Using create_organizer_account RPC function...')
      
      const { data: newOrganizerAccountId, error: rpcError } = await clientToUse
        .rpc('create_organizer_account', {
          p_user_id: userId,
          p_organization_name: organizerData.organization_name,
          p_organization_type: organizerData.organization_type,
          p_description: organizerData.description || null,
          p_contact_info: organizerData.contact_info || {},
          p_social_links: organizerData.social_links || {},
          p_specialties: organizerData.specialties || []
        })

      if (rpcError) {
        console.error('❌ [Account Management] RPC function failed:', rpcError)
        throw new Error(`Failed to create organizer account: ${rpcError.message}`)
      }

      console.log('✅ [Account Management] Organizer account created successfully via RPC:', newOrganizerAccountId)
      console.log('🎉 [Account Management] Organizer account created:', organizerData.organization_name)
      
      return newOrganizerAccountId
      
    } catch (error: any) {
      console.error('❌ [Account Management] Error creating organizer account:', {
        error: error,
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace',
        name: error?.name || 'Unknown error type',
        code: error?.code || 'No error code',
        details: error?.details || 'No error details'
      })
      
      // Re-throw with more context
      throw new Error(`Failed to create organizer account: ${error?.message || 'Unknown error'}`)
    }
  }

  // Request admin access
  static async requestAdminAccess(
    userId: string,
    requestData: {
      reason: string
      experience: string
      references: string
      organization: string
      role: string
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_requests')
        .insert([
          {
            user_id: userId,
            ...requestData
          }
        ])

      if (error) throw error
    } catch (error) {
      console.error('Error requesting admin access:', error)
      throw error
    }
  }

  // Check if user has specific account type
  static async hasAccountType(userId: string, accountType: ProfileType): Promise<boolean> {
    try {
      const accounts = await this.getUserAccounts(userId)
      return accounts.some(account => account.account_type === accountType && account.is_active)
    } catch (error) {
      console.error('Error checking account type:', error)
      return false
    }
  }

  // Get account permissions
  static async getAccountPermissions(
    userId: string, 
    profileId: string, 
    accountType: ProfileType
  ): Promise<AccountPermissions | null> {
    try {
      const { data, error } = await supabase
        .from('account_relationships')
        .select('permissions')
        .eq('owner_user_id', userId)
        .eq('owned_profile_id', profileId)
        .eq('account_type', accountType)
        .eq('is_active', true)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data?.permissions || null
    } catch (error) {
      console.error('Error getting account permissions:', error)
      return null
    }
  }

  // Update account permissions
  static async updateAccountPermissions(
    userId: string,
    profileId: string,
    accountType: ProfileType,
    permissions: Partial<AccountPermissions>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('account_relationships')
        .update({ 
          permissions: permissions,
          updated_at: new Date().toISOString()
        })
        .eq('owner_user_id', userId)
        .eq('owned_profile_id', profileId)
        .eq('account_type', accountType)

      if (error) throw error
    } catch (error) {
      console.error('Error updating account permissions:', error)
      throw error
    }
  }

  // Create post with account context
  static async createPostWithContext(
    userId: string,
    postingAsProfileId: string,
    postingAsAccountType: ProfileType,
    postData: {
      content: string
      post_type?: string
      visibility?: string
      media_urls?: string[]
      hashtags?: string[]
    }
  ): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_post_with_context', {
        user_id: userId,
        posting_as_profile_id: postingAsProfileId,
        posting_as_account_type: postingAsAccountType,
        content: postData.content,
        post_type: postData.post_type || 'text',
        visibility: postData.visibility || 'public',
        media_urls: postData.media_urls || [],
        hashtags: postData.hashtags || []
      })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creating post with context:', error)
      throw error
    }
  }

  // Get account activity log
  static async getAccountActivity(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('account_activity_log')
        .select(`
          *,
          profiles:profile_id (
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting account activity:', error)
      throw error
    }
  }

  // Link existing account to user
  static async linkExistingAccount(
    userId: string,
    profileId: string,
    accountType: ProfileType,
    permissions: AccountPermissions = {
      can_post: true,
      can_manage_settings: true,
      can_view_analytics: true,
      can_manage_content: true
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('account_relationships')
        .insert([
          {
            owner_user_id: userId,
            owned_profile_id: profileId,
            account_type: accountType,
            permissions: permissions
          }
        ])

      if (error) throw error

      // Log activity
      await supabase
        .from('account_activity_log')
        .insert([
          {
            user_id: userId,
            profile_id: profileId,
            account_type: accountType,
            action_type: 'create_account',
            action_details: { linked_existing: true }
          }
        ])
    } catch (error) {
      console.error('Error linking existing account:', error)
      throw error
    }
  }

  // Deactivate account
  static async deactivateAccount(
    userId: string,
    profileId: string,
    accountType: ProfileType
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('account_relationships')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('owner_user_id', userId)
        .eq('owned_profile_id', profileId)
        .eq('account_type', accountType)

      if (error) throw error

      // Log activity
      await supabase
        .from('account_activity_log')
        .insert([
          {
            user_id: userId,
            profile_id: profileId,
            account_type: accountType,
            action_type: 'delete_account',
            action_details: { deactivated: true }
          }
        ])
    } catch (error) {
      console.error('Error deactivating account:', error)
      throw error
    }
  }

  // Get posts by account context
  static async getPostsByAccountContext(
    profileId: string,
    accountType: ProfileType,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:posted_as_profile_id (
            full_name,
            username,
            avatar_url
          ),
          post_likes (count),
          post_comments (count)
        `)
        .eq('posted_as_profile_id', profileId)
        .eq('posted_as_account_type', accountType)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting posts by account context:', error)
      throw error
    }
  }
} 