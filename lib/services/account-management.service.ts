import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

// Import for local use; re-export so existing consumers continue to work.
import type { ProfileType } from '@/lib/accounts/account-types'
import { normalizeAccountType, isOrganizationType } from '@/lib/accounts/account-types'
import { generateUniqueSlug } from '@/lib/accounts/generate-unique-slug'
export type { ProfileType } from '@/lib/accounts/account-types'
export { normalizeAccountType, isOrganizationType } from '@/lib/accounts/account-types'

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

interface AccountRelationshipRow {
  owned_profile_id: string
  account_type: string
  permissions: AccountPermissions | null
}

function slugifyOrganizerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9-]/g, '')
}

/** Legacy profile_id embedded in URLs/bookmarks — preserve exact slug rules. */
function legacyOrganizerProfileId(userId: string, organizationName: string): string {
  return `${userId}-organizer-${organizationName.toLowerCase().replace(/\s+/g, '-')}`
}

function buildStubMainProfile(userId: string) {
  return {
    id: userId,
    username: `user-${userId.slice(0, 8)}`,
    full_name: 'User',
    bio: null,
    avatar_url: null,
    location: null,
    website: null,
    account_settings: null,
    is_verified: false,
    followers_count: 0,
    following_count: 0,
    posts_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

const MAIN_PROFILE_COLUMNS = `
  id,
  username,
  custom_url,
  full_name,
  bio,
  avatar_url,
  cover_image,
  location,
  website,
  profile_data,
  social_links,
  account_settings,
  account_type,
  is_verified,
  followers_count,
  following_count,
  posts_count,
  created_at,
  updated_at
`

export class AccountManagementService {
  // Get all user accounts with proper relationship detection
  static async getUserAccounts(userId: string, authenticatedSupabase?: any): Promise<UserAccount[]> {
    try {
      console.log('[Account Management] Getting accounts for user:', userId)
      
      // Use authenticated Supabase client if provided (for API routes), otherwise use default client
      const clientToUse = authenticatedSupabase || supabase
      
      const accounts: UserAccount[] = []

      // Get main profile first — non-fatal if missing; entity accounts still load
      const { data: profileData, error: profileError } = await clientToUse
        .from('profiles')
        .select(MAIN_PROFILE_COLUMNS)
        .eq('id', userId)
        .maybeSingle()

      let mainProfile
      if (profileData) {
        mainProfile = profileData
      } else {
        console.warn(
          '[Account Management] Profile row unavailable, using stub:',
          profileError?.message ?? 'not found'
        )
        mainProfile = buildStubMainProfile(userId)
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
            account_type: 'organization',
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
        
        const organizerProfileId = legacyOrganizerProfileId(userId, organizerData.organization_name)
        
        console.log('➕ [Account Management] Adding organizer account (legacy):', organizerData.organization_name)
        accounts.push({
          account_type: 'organization',
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

      // Load linked account rows in parallel (was sequential browser→Supabase calls and could stall dashboards).
      console.log('[Account Management] Loading artist/venue/staff/organizer data in parallel...')
      const [
        { data: artistProfiles, error: artistError },
        { data: venueProfiles, error: venueError },
        { data: staffMemberships, error: staffError },
        { data: organizerAccountsTable, error: organizerError },
      ] = await Promise.all([
        clientToUse.from('artist_profiles').select('*').eq('user_id', userId),
        clientToUse.from('venue_profiles').select('*').or(`user_id.eq.${userId},main_profile_id.eq.${userId}`),
        clientToUse
          .from('venue_team_members')
          .select('id, venue_id, name, email, role, department, status, venue_profiles:venue_id(id, venue_name, url_slug)')
          .eq('user_id', userId)
          .in('status', ['active', 'inactive']),
        clientToUse.from('organizer_accounts').select('*').eq('user_id', userId).eq('is_active', true),
      ])

      try {
        if (artistProfiles && !artistError) {
          artistProfiles.forEach((artist: any) => {
            const accountType = artist.persona_kind === 'service' ? 'service' : 'artist'
            accounts.push({
              account_type: accountType,
              profile_id: artist.id,
              profile_data: {
                ...artist,
                display_name: artist.artist_name,
                account_display_type: accountType === 'service' ? 'Service Provider' : 'Artist',
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

      try {
        console.log('[Account Management] Checking for venue profiles in database...')
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

      try {
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

      try {
        if (organizerAccountsTable && !organizerError) {
          organizerAccountsTable.forEach((organizer: any) => {
            console.log('➕ [Account Management] Adding organizer account from table:', organizer.organization_name)
            accounts.push({
              account_type: 'organization',
              profile_id: organizer.id,
              profile_data: {
                id: organizer.id,
                organization_name: organizer.organization_name,
                organization_type: organizer.organization_type,
                subtype: organizer.subtype,
                url_slug: organizer.url_slug,
                description: organizer.description,
                contact_info: organizer.contact_info,
                social_links: organizer.social_links,
                specialties: organizer.specialties,
                ops_org_id: organizer.ops_org_id,
                admin_level: organizer.admin_level,
                display_name: organizer.organization_name,
                account_display_type: 'Organization',
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

      // Assigned Admin / tour manager grants via ops org membership
      try {
        const { data: memberships } = await clientToUse
          .from('org_members')
          .select('org_id, role')
          .eq('user_id', userId)
          .in('role', ['owner', 'admin', 'tour_manager', 'production'])

        const orgIds = Array.from(
          new Set((memberships || []).map((row: any) => String(row.org_id)).filter(Boolean))
        )
        if (orgIds.length > 0) {
          const { data: grantedOrgs } = await clientToUse
            .from('organizer_accounts')
            .select('*')
            .in('ops_org_id', orgIds)
            .eq('is_active', true)

          const existingIds = new Set(accounts.map((a) => a.profile_id))
          for (const organizer of grantedOrgs || []) {
            if (existingIds.has(organizer.id)) continue
            const member = (memberships || []).find(
              (row: any) => String(row.org_id) === String(organizer.ops_org_id)
            )
            accounts.push({
              account_type: 'organization',
              profile_id: organizer.id,
              profile_data: {
                ...organizer,
                display_name: organizer.organization_name,
                account_display_type: 'Organization',
                grant_role: member?.role || 'admin',
              },
              permissions: {
                can_post: true,
                can_manage_settings: member?.role === 'owner' || member?.role === 'admin',
                can_view_analytics: true,
                can_manage_content: true,
                can_manage_events: true,
              },
              is_active: true,
            })
            existingIds.add(organizer.id)
          }
        }
      } catch (grantErr) {
        console.warn('[Account Management] org_members grants unavailable (non-fatal):', grantErr)
      }

      // Tour-only collaborators need an Admin acting account without becoming
      // org_members. Project scope is carried on the account projection and is
      // re-verified on every Admin request.
      try {
        const { data: collaboratorMemberships } = await clientToUse
          .from('tour_team_members')
          .select('tour_id, role, status, is_active')
          .eq('user_id', userId)
          .eq('status', 'confirmed')
          .eq('is_active', true)

        const collaboratorTourIds = Array.from(new Set(
          (collaboratorMemberships || [])
            .map((row: any) => String(row.tour_id || ''))
            .filter(Boolean),
        ))

        if (collaboratorTourIds.length > 0) {
          const { data: collaboratorTours } = await clientToUse
            .from('tours')
            .select('id, name, org_id')
            .in('id', collaboratorTourIds)

          const collaboratorOrgIds = Array.from(new Set(
            (collaboratorTours || [])
              .map((tour: any) => String(tour.org_id || ''))
              .filter(Boolean),
          ))
          const { data: collaboratorOrgs } = collaboratorOrgIds.length
            ? await clientToUse
                .from('organizer_accounts')
                .select('*')
                .in('ops_org_id', collaboratorOrgIds)
                .eq('is_active', true)
            : { data: [] as any[] }

          const existingIds = new Set(accounts.map((account) => account.profile_id))
          for (const organizer of collaboratorOrgs || []) {
            if (existingIds.has(organizer.id)) continue
            const allowedTourIds = (collaboratorTours || [])
              .filter((tour: any) => String(tour.org_id) === String(organizer.ops_org_id))
              .map((tour: any) => String(tour.id))
            if (allowedTourIds.length === 0) continue

            accounts.push({
              account_type: 'organization',
              profile_id: organizer.id,
              profile_data: {
                ...organizer,
                display_name: organizer.organization_name,
                account_display_type: 'Tour collaborator',
                tour_collaborator: true,
                allowed_tour_ids: allowedTourIds,
                grant_role: 'tour_admin',
              },
              permissions: {
                can_post: false,
                can_manage_settings: false,
                can_view_analytics: false,
                can_manage_content: false,
                can_manage_events: true,
                can_manage_tours: true,
              },
              is_active: true,
            })
            existingIds.add(organizer.id)
          }
        }
      } catch (collaborationError) {
        console.warn('[Account Management] tour collaboration grants unavailable (non-fatal):', collaborationError)
      }

      // Re-enabled: Read account_relationships to surface delegated / multi-owner accounts.
      // Orphan validation: only include rows whose owned_profile_id actually exists in the
      // corresponding entity table (artist_profiles, venue_profiles, organizer_accounts).
      // This prevents showing accounts that were deleted from the entity table but whose
      // relationship row was not cleaned up.
      try {
        // Do not select/filter is_active — Demo schema has no such column on account_relationships.
        const { data: relationships, error: relError } = await clientToUse
          .from('account_relationships')
          .select('owned_profile_id, account_type, permissions')
          .eq('owner_user_id', userId)

        if (relError) {
          console.warn('[Account Management] account_relationships unavailable (non-fatal):', relError.message)
        } else if (relationships && relationships.length > 0) {
          const existingIds = new Set(accounts.map(a => a.profile_id))
          const pendingRels = (relationships as AccountRelationshipRow[]).filter(
            (rel) => !existingIds.has(rel.owned_profile_id)
          )

          const resolvedRels = await Promise.all(
            pendingRels.map(async (rel: AccountRelationshipRow) => {
              const normType = normalizeAccountType(rel.account_type)
              let entityRow: Record<string, unknown> | null = null

              if (normType === 'artist' || normType === 'service') {
                const { data } = await clientToUse
                  .from('artist_profiles')
                  .select('*')
                  .eq('id', rel.owned_profile_id)
                  .maybeSingle()
                entityRow = data
              } else if (normType === 'venue') {
                const { data } = await clientToUse
                  .from('venue_profiles')
                  .select('*')
                  .eq('id', rel.owned_profile_id)
                  .maybeSingle()
                entityRow = data
              } else if (isOrganizationType(normType)) {
                const { data } = await clientToUse
                  .from('organizer_accounts')
                  .select('*')
                  .eq('id', rel.owned_profile_id)
                  .maybeSingle()
                entityRow = data
              }

              if (!entityRow) return null

              return {
                normType,
                profileId: rel.owned_profile_id,
                entityRow,
                permissions: rel.permissions,
              }
            })
          )

          for (const item of resolvedRels) {
            if (!item) continue
            const { normType, profileId, entityRow, permissions } = item
            accounts.push({
              account_type: normType,
              profile_id: profileId,
              profile_data: {
                ...entityRow,
                display_name:
                  (entityRow.artist_name as string | undefined) ??
                  (entityRow.venue_name as string | undefined) ??
                  (entityRow.organization_name as string | undefined),
              },
              permissions: permissions ?? {
                can_post: true,
                can_manage_settings: false,
                can_view_analytics: false,
                can_manage_content: true,
              },
              is_active: true,
            })
            existingIds.add(profileId)
          }
        }
      } catch (relErr) {
        console.warn('[Account Management] account_relationships read failed (non-fatal):', relErr)
      }

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
      const clientToUse = authenticatedSupabase || supabase

      // user_sessions is optional; schema variants differ (no updated_at in core migration).
      // user_id is UNIQUE — one row max, so ordering is unnecessary and avoids PostgREST 406/400
      // when ordering by a column that does not exist on the deployed database.
      const { data, error } = await clientToUse
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .limit(1)

      if (error) {
        console.warn('[Account Management] user_sessions unavailable (non-fatal):', error.code, error.message)
        return null
      }
      return data?.[0] ?? null
    } catch (error) {
      console.warn('[Account Management] getActiveSession failed (non-fatal):', error)
      return null
    }
  }

  // Switch active account
  static async switchAccount(
    userId: string,
    profileId: string,
    accountType: ProfileType
  ): Promise<boolean> {
    const persistSessionDirect = async (): Promise<void> => {
      // Always store the entity UUID in active_profile_id (post-migration schema).
      // Pre-migration rows stored userId here for non-general types; the migration
      // back-fills those. New rows always use the real entity profileId.
      const { error } = await supabase.from('user_sessions').upsert(
        {
          user_id: userId,
          active_profile_id: profileId,
          active_account_type: accountType,
          session_data: {},
          last_activity: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

      if (error) {
        console.warn('[Account Management] Direct session upsert failed:', error.message)
      }
    }

    try {
      try {
        const { error } = await supabase.rpc('switch_active_account', {
          user_id: userId,
          profile_id: profileId,
          account_type: accountType,
        })

        if (error) throw error
      } catch (rpcError: unknown) {
        console.log('[Account Management] RPC switch failed, trying direct session upsert:', rpcError)
        await persistSessionDirect()
      }
    } catch (error) {
      console.warn('[Account Management] Session persist failed (non-fatal):', error)
    }

    // Client-side account mode is authoritative; session persistence is best-effort.
    return true
  }

  // Create artist account
  static async createArtistAccount(
    userId: string,
    artistData: {
      artist_name: string
      bio?: string
      genres?: string[]
      social_links?: any
    },
    authenticatedSupabase?: any
  ): Promise<string> {
    try {
      const clientToUse = authenticatedSupabase || supabase

      const urlSlug = await generateUniqueSlug({
        client: clientToUse,
        table: 'artist_profiles',
        base: artistData.artist_name,
        fallbackPrefix: `artist-${userId.slice(0, 8)}`,
      })
      
      const { data: artistProfile, error: artistError } = await clientToUse
        .from('artist_profiles')
        .insert({
          user_id: userId,
          artist_name: artistData.artist_name,
          url_slug: urlSlug,
          bio: artistData.bio || null,
          genres: artistData.genres || [],
          social_links: artistData.social_links || {},
          verification_status: 'unverified',
          account_tier: 'pro',
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
          const { data: existingProfile } = await clientToUse
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
    },
    authenticatedSupabase?: any
  ): Promise<string> {
    try {
      const clientToUse = authenticatedSupabase || supabase
      
      // Use direct table insert (RPC function has bugs)

      const urlSlug = await generateUniqueSlug({
        client: clientToUse,
        table: 'venue_profiles',
        base: venueData.venue_name,
        fallbackPrefix: `venue-${userId.slice(0, 8)}`,
      })

const { data: venueProfile, error: venueError } = await clientToUse
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
          account_tier: 'pro',
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
          const { data: existingProfile } = await clientToUse
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
      subtype?: string
      url_slug?: string
      is_public?: boolean
    },
    authenticatedSupabase?: any,
    authenticatedUser?: any  // New parameter to pass pre-authenticated user
  ): Promise<string> {
    console.log('🏗️ [Account Management] Starting organizer account creation for user:', userId)
    console.log('🏗️ [Account Management] Organizer data:', organizerData)
    
    try {
      // Use authenticated Supabase client if provided (for API routes), otherwise use default client
      const clientToUse = authenticatedSupabase || supabase

      console.log('🔍 [Account Management] Verifying RPC client authentication context...')
      const { data: { user: rpcClientUser }, error: authError } = await clientToUse.auth.getUser()
      if (authError || !rpcClientUser) {
        console.error('❌ [Account Management] RPC client authentication failed:', authError)
        throw new Error('Authenticated RPC client required to create organizer account')
      }

      if (authenticatedUser?.id && authenticatedUser.id !== rpcClientUser.id) {
        console.error('❌ [Account Management] Pre-authenticated user does not match RPC client user:', {
          authenticatedUser: authenticatedUser.id,
          rpcClientUser: rpcClientUser.id,
        })
        throw new Error('Authenticated user mismatch - cannot create account for different user')
      }

      const user = rpcClientUser
      console.log('✅ [Account Management] RPC client authentication verified for user:', user.id)
      
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
          p_specialties: organizerData.specialties || [],
          p_subtype: organizerData.subtype || organizerData.organization_type || null,
          p_url_slug: organizerData.url_slug || null,
          p_is_public: organizerData.is_public ?? true,
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
      // Demo schema may not have is_active; touch updated_at only.
      const { error } = await supabase
        .from('account_relationships')
        .update({
          updated_at: new Date().toISOString(),
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
        .eq('posted_as_type', normalizeAccountType(accountType))
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting posts by account context:', error)
      return []
    }
  }
} 
