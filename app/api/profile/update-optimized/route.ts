import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiRequest } from '@/lib/auth/api-auth'
import { z } from 'zod'

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters').optional(),
  username: z.string().min(2, 'Username must be at least 2 characters').max(30, 'Username must be less than 30 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores').optional(),
  custom_url: z.string().min(3, 'Custom URL must be at least 3 characters').max(30, 'Custom URL must be less than 30 characters').optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  website: z.string().url('Website must be a valid URL').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number must be less than 20 characters').optional(),
  instagram: z.string().max(50, 'Instagram handle must be less than 50 characters').optional(),
  twitter: z.string().max(50, 'Twitter handle must be less than 50 characters').optional(),
  spotify: z.string().max(100, 'Spotify URL must be less than 100 characters').optional(),
  show_email: z.boolean().optional(),
  show_phone: z.boolean().optional(),
  show_location: z.boolean().optional(),
  profile_experience: z.object({
    public_visibility: z.object({
      show_feed: z.boolean().optional(),
      show_marketplace: z.boolean().optional(),
      show_portfolio: z.boolean().optional(),
      show_achievements: z.boolean().optional(),
    }).optional(),
    support: z.object({
      support_title: z.string().max(80, 'Support title must be less than 80 characters').optional(),
      support_message: z.string().max(240, 'Support message must be less than 240 characters').optional(),
      tip_jar_url: z.string().url('Tip jar URL must be a valid URL').optional().or(z.literal('')),
      commission_url: z.string().url('Commission URL must be a valid URL').optional().or(z.literal('')),
      booking_url: z.string().url('Booking URL must be a valid URL').optional().or(z.literal('')),
      marketplace_url: z.string().url('Marketplace URL must be a valid URL').optional().or(z.literal('')),
    }).optional(),
    dashboard: z.object({
      show_quick_stats: z.boolean().optional(),
      show_tasks: z.boolean().optional(),
      show_recommendations: z.boolean().optional(),
      widget_order: z.array(z.string().min(1)).max(20).optional(),
    }).optional(),
  }).optional(),
})

interface ProfileUpdateData {
  full_name?: string
  username?: string
  custom_url?: string
  bio?: string
  location?: string
  website?: string
  phone?: string
  instagram?: string
  twitter?: string
  spotify?: string
  show_email?: boolean
  show_phone?: boolean
  show_location?: boolean
  profile_experience?: {
    public_visibility?: {
      show_feed?: boolean
      show_marketplace?: boolean
      show_portfolio?: boolean
      show_achievements?: boolean
    }
    support?: {
      support_title?: string
      support_message?: string
      tip_jar_url?: string
      commission_url?: string
      booking_url?: string
      marketplace_url?: string
    }
    dashboard?: {
      show_quick_stats?: boolean
      show_tasks?: boolean
      show_recommendations?: boolean
      widget_order?: string[]
    }
  }
}

export async function PUT(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Use the new authentication method that matches middleware
    const auth = await authenticateApiRequest(request)
    
    if (!auth) {
      console.error('❌ Authentication failed')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user, supabase } = auth

    // Parse and validate request body
    const body = await request.json()
    
    const validationResult = updateProfileSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.issues)
      return NextResponse.json({
        error: 'Invalid request data',
        details: validationResult.error.issues,
        field: validationResult.error.issues[0]?.path[0]
      }, { status: 400 })
    }

    const updateData: ProfileUpdateData = validationResult.data

    // Handle username validation and uniqueness.
    // DB-008 / Wave 35: the former `custom_url` uniqueness block was removed — it
    // filtered on a column that exists in no active migration, so the check always
    // errored instead of reporting a taken handle. Both fields are resolved to the
    // single canonical `username` handle in the block below.
    if (updateData.username) {
      const { data: existingUsername, error: usernameError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', updateData.username)
        .neq('id', user.id)
        .single()

      if (usernameError && usernameError.code !== 'PGRST116') {
        console.error('❌ Error checking username:', usernameError)
        return NextResponse.json({
          error: 'Error validating username'
        }, { status: 500 })
      }

      if (existingUsername) {
        return NextResponse.json({
          error: 'This username is already taken',
          field: 'username'
        }, { status: 400 })
      }
    }

    const { data: existingProfileRow, error: existingProfileError } = await supabase
      .from('profiles')
      .select('profile_data')
      .eq('id', user.id)
      .single()

    if (existingProfileError) {
      console.error('❌ Error loading existing profile data:', existingProfileError)
      return NextResponse.json({
        error: 'Error loading current profile settings'
      }, { status: 500 })
    }

    // Prepare update data with only defined fields for optimal performance.
    //
    // DB-008 / Wave 35: `custom_url`, `phone` and `spotify` are NOT `profiles`
    // columns — they exist in no active migration and in no generated contract.
    // Because the loop below copied every submitted key straight into the column
    // payload, submitting any of them made PostgREST reject the WHOLE statement
    // and this route answered 500. `components/settings/profile-settings-optimized.tsx`
    // and `components/settings/profile-settings.tsx` always submit `phone`, so the
    // settings form could not save at all. They are now routed to their canonical
    // destinations instead of poisoning the update:
    //   * `custom_url` -> `username` (the canonical public handle)
    //   * `phone`      -> `profile_data.phone` (canonical phone storage; the column
    //                     `profiles.show_phone` gates in lib/profile/general-public-profile.ts)
    //   * `spotify`    -> `profile_data.spotify` (no canonical column exists)
    // The top-level `show_email` / `show_phone` / `show_location` column writes are
    // UNCHANGED, so the set of settings that can open a public privacy flag is
    // exactly what it was before this repair.
    const NON_COLUMN_FIELDS = new Set(['custom_url', 'phone', 'spotify'])

    const profileUpdate: any = {
      updated_at: new Date().toISOString()
    }

    Object.keys(updateData).forEach(key => {
      if (NON_COLUMN_FIELDS.has(key)) return
      if (updateData[key as keyof ProfileUpdateData] !== undefined) {
        profileUpdate[key] = updateData[key as keyof ProfileUpdateData]
      }
    })

    const mergedProfileData = isRecord(existingProfileRow?.profile_data)
      ? { ...existingProfileRow.profile_data }
      : {}
    if (updateData.phone !== undefined) mergedProfileData.phone = updateData.phone
    if (updateData.spotify !== undefined) mergedProfileData.spotify = updateData.spotify
    if (Object.keys(mergedProfileData).length > 0) {
      profileUpdate.profile_data = mergedProfileData
    }

    // `custom_url` is a deprecated request alias for the canonical handle.
    if (updateData.custom_url !== undefined) {
      if (
        updateData.username !== undefined &&
        updateData.username !== updateData.custom_url
      ) {
        return NextResponse.json({
          error: 'username and custom_url disagree; send only one',
          field: 'custom_url'
        }, { status: 400 })
      }
      if (updateData.username === undefined) {
        const cleanedHandle = updateData.custom_url
          .toLowerCase()
          .replace(/[^a-zA-Z0-9_-]/g, '')

        const reservedUrls = new Set([
          'admin', 'api', 'www', 'app', 'settings', 'profile', 'user', 'account',
          'dashboard', 'login', 'signup', 'auth', 'help', 'support', 'about',
          'contact', 'terms', 'privacy', 'events', 'artist', 'venue', 'search',
          'discover', 'feed', 'messages', 'notifications', 'billing', 'security',
          'integrations', 'onboarding', 'create', 'edit', 'delete', 'update'
        ])

        if (reservedUrls.has(cleanedHandle)) {
          return NextResponse.json({
            error: 'This URL is reserved and cannot be used',
            field: 'custom_url'
          }, { status: 400 })
        }

        const { data: handleHolder, error: handleError } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanedHandle)
          .neq('id', user.id)
          .single()

        if (handleError && handleError.code !== 'PGRST116') {
          console.error('❌ Error checking profile handle:', handleError)
          return NextResponse.json({
            error: 'Error validating profile handle'
          }, { status: 500 })
        }

        if (handleHolder) {
          return NextResponse.json({
            error: 'This URL is already taken',
            field: 'custom_url'
          }, { status: 400 })
        }

        profileUpdate.username = cleanedHandle
      }
    }

    if (updateData.profile_experience) {
      const existingProfileData = isRecord(existingProfileRow?.profile_data) ? existingProfileRow.profile_data : {}
      const existingProfileExperience = isRecord(existingProfileData.profile_experience) ? existingProfileData.profile_experience : {}
      const incomingProfileExperience = updateData.profile_experience

      profileUpdate.profile_data = {
        ...existingProfileData,
        profile_experience: {
          ...existingProfileExperience,
          ...(isRecord(incomingProfileExperience.public_visibility) && {
            public_visibility: {
              ...(isRecord(existingProfileExperience.public_visibility) ? existingProfileExperience.public_visibility : {}),
              ...incomingProfileExperience.public_visibility,
            }
          }),
          ...(isRecord(incomingProfileExperience.support) && {
            support: {
              ...(isRecord(existingProfileExperience.support) ? existingProfileExperience.support : {}),
              ...incomingProfileExperience.support,
            }
          }),
          ...(isRecord(incomingProfileExperience.dashboard) && {
            dashboard: {
              ...(isRecord(existingProfileExperience.dashboard) ? existingProfileExperience.dashboard : {}),
              ...incomingProfileExperience.dashboard,
            }
          }),
        },
      }

      delete profileUpdate.profile_experience
    }


    // Perform the optimized update using direct column access
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id)
      .select(`
        id,
        username,
        full_name,
        bio,
        avatar_url,
        location,
        website,
        profile_data,
        instagram,
        twitter,
        show_email,
        show_phone,
        show_location,
        is_verified,
        followers_count,
        following_count,
        posts_count,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error('❌ Error updating profile:', updateError)
      
      // Handle specific database errors
      if (updateError.code === '23505') {
        // Unique constraint violation
        const constraintDetail = updateError.details || ''
        if (constraintDetail.includes('username')) {
          return NextResponse.json({
            error: 'Username is already taken',
            field: 'username'
          }, { status: 400 })
        } else if (constraintDetail.includes('custom_url')) {
          return NextResponse.json({
            error: 'Custom URL is already taken',
            field: 'custom_url'
          }, { status: 400 })
        }
      }
      
      return NextResponse.json({
        error: 'Error updating profile',
        details: updateError.message
      }, { status: 500 })
    }

    if (!updatedProfile) {
      return NextResponse.json({
        error: 'Profile not found or update failed'
      }, { status: 404 })
    }

    const processingTime = Date.now() - startTime

    // `phone` and `spotify` are read back from the canonical jsonb storage, not
    // from phantom `profiles` columns. `show_phone` is the top-level boolean the
    // public gate reads; this route still writes it (unchanged), so the flag the
    // form shows and the flag the gate honours are the same value.
    const updatedProfileData = isRecord(updatedProfile.profile_data)
      ? updatedProfile.profile_data
      : {}
    const updatedPhone =
      typeof updatedProfileData.phone === 'string' ? updatedProfileData.phone : null
    const updatedSpotify =
      typeof updatedProfileData.spotify === 'string' ? updatedProfileData.spotify : null

    // Return optimized profile response
    const response = {
      success: true,
      message: 'Profile updated successfully and synced to database',
      profile: {
        id: updatedProfile.id,
        username: updatedProfile.username,
        // Deprecated alias of the canonical handle; `profiles.custom_url` is not a column.
        custom_url: updatedProfile.username,
        full_name: updatedProfile.full_name,
        bio: updatedProfile.bio,
        avatar_url: updatedProfile.avatar_url,
        phone: updatedPhone,
        location: updatedProfile.location,
        website: updatedProfile.website,
        social_links: {
          instagram: updatedProfile.instagram,
          twitter: updatedProfile.twitter,
          spotify: updatedSpotify,
          website: updatedProfile.website
        },
        privacy: {
          show_email: updatedProfile.show_email,
          show_phone: updatedProfile.show_phone,
          show_location: updatedProfile.show_location
        },
        stats: {
          followers: updatedProfile.followers_count || 0,
          following: updatedProfile.following_count || 0,
          posts: updatedProfile.posts_count || 0
        },
        profile_data: {
          ...updatedProfileData,
          name: updatedProfile.full_name,
          bio: updatedProfile.bio,
          location: updatedProfile.location,
          website: updatedProfile.website,
          phone: updatedPhone
        },
        verified: updatedProfile.is_verified || false,
        account_type: 'general',
        updated_at: updatedProfile.updated_at,
        created_at: updatedProfile.created_at
      },
      performance: {
        processing_time_ms: processingTime,
        fields_updated: Object.keys(updateData).length
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error('💥 Profile update API error:', error)
    
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      performance: {
        processing_time_ms: processingTime,
        status: 'failed'
      }
    }, { status: 500 })
  }
} 